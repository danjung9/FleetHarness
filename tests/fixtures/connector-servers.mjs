import { createServer } from 'node:http';
import { createHash, randomUUID } from 'node:crypto';

/** Synthetic sign-in and API servers. No request ever leaves loopback. */
export async function startConnectorServers(initial = {}) {
  const state = {
    ...initial,
    requests: [], authorizations: [], grants: [], revocations: 0, refreshes: 0, devicePolls: 0,
    deviceApproved: false, downloadAuthorized: [], pkceVerified: 0,
  };
  const distinctive = `SYNTHETIC_ONLY_${randomUUID().replaceAll('-', '')}`;
  const tokens = new Set(), refreshTokens = new Set(), codes = new Map();
  let base = '', currentAccess = '', currentRefresh = '';
  // A refresh keeps the scopes of the sign-in it came from, even when several accounts share this server.
  const refreshScopes = new Map();
  const issue = scope => {
    currentAccess = `${distinctive}_access_${tokens.size}`;
    currentRefresh = `${distinctive}_refresh_${refreshTokens.size}`;
    tokens.add(currentAccess); refreshTokens.add(currentRefresh);
    refreshScopes.set(currentRefresh, scope);
    return { token_type: 'Bearer', access_token: currentAccess, refresh_token: currentRefresh,
      expires_in: state.expiresIn ?? 3600, scope: state.grantedScope ?? scope };
  };
  const now = () => new Date().toISOString();
  const echo = () => state.echoSecrets ? ` ${currentAccess} ${currentRefresh}` : '';
  const send = (res, status, data, headers = {}) => {
    res.writeHead(status, { 'content-type': 'application/json', ...headers }); res.end(JSON.stringify(data));
  };
  const timers = new Set();
  const server = createServer((req, res) => {
    void handle(req, res).catch(() => { if (!res.headersSent) send(res, 500, { error: 'fixture_failure' }); else res.end(); });
  });
  async function handle(req, res) {
    const address = new URL(req.url, base), path = address.pathname;
    let raw = '';
    for await (const chunk of req) raw += chunk.toString();
    const form = new URLSearchParams(raw);
    const authorization = req.headers.authorization;
    state.requests.push({ method: req.method, path, query: Object.fromEntries(address.searchParams),
      authorized: !!authorization, prefer: req.headers.prefer });
    const provider = path.startsWith('/google/') ? 'google' : 'microsoft';
    if (path.endsWith('/authorize')) {
      const params = address.searchParams, redirect = new URL(params.get('redirect_uri'));
      if (!['127.0.0.1', 'localhost'].includes(redirect.hostname) || redirect.protocol !== 'http:' || params.get('code_challenge_method') !== 'S256'
        || !/^[\w-]{43}$/.test(params.get('code_challenge') ?? '') || params.get('response_type') !== 'code') return send(res, 400, { error: 'invalid_request' });
      const details = { provider, clientId: params.get('client_id'), challenge: params.get('code_challenge'), redirect: redirect.href,
        state: params.get('state'), scopes: params.get('scope').split(' '), params: Object.fromEntries(params) };
      state.authorizations.push(details);
      const code = `synthetic-code-${randomUUID()}`;
      codes.set(code, details);
      redirect.searchParams.set('state', details.state);
      if (state.authError) redirect.searchParams.set('error', state.authError);
      else redirect.searchParams.set('code', code);
      res.writeHead(302, { location: redirect.href }); res.end(); return;
    }
    if (path.endsWith('/devicecode')) {
      state.deviceScope = form.get('scope');
      send(res, 200, { device_code: `${distinctive}_device`, user_code: 'SAMPLE-123', verification_uri: `${base}/device`,
        expires_in: state.deviceExpiresIn ?? 60, interval: 1 }); return;
    }
    if (path === '/device') { state.deviceApproved = true; res.end('Synthetic account approved.'); return; }
    if (path.endsWith('/token')) {
      const grant = form.get('grant_type'); state.grants.push(grant);
      if (state.tokenStatus) return send(res, state.tokenStatus, { error: state.tokenError ?? 'invalid_grant', error_description: distinctive });
      if (grant === 'authorization_code') {
        const original = codes.get(form.get('code'));
        codes.delete(form.get('code'));
        if (!original || original.redirect !== form.get('redirect_uri') || original.clientId !== form.get('client_id')
          || createHash('sha256').update(form.get('code_verifier') ?? '').digest('base64url') !== original.challenge) return send(res, 400, { error: 'invalid_grant' });
        state.pkceVerified++;
        return send(res, 200, issue(original.scopes.join(' ')));
      }
      if (grant === 'refresh_token') {
        if (!refreshTokens.has(form.get('refresh_token'))) return send(res, 400, { error: 'invalid_grant' });
        state.refreshes++;
        // Rotation proves the adapter saves the new refresh token.
        const grantedBefore = refreshScopes.get(form.get('refresh_token'));
        refreshTokens.delete(form.get('refresh_token'));
        const data = issue(grantedBefore ?? state.authorizations.at(-1)?.scopes.join(' ') ?? state.deviceScope);
        if (state.refreshDelayMs) {
          const timer = setTimeout(() => { timers.delete(timer); send(res, 200, data); }, state.refreshDelayMs); timers.add(timer); return;
        }
        return send(res, 200, data);
      }
      if (grant === 'urn:ietf:params:oauth:grant-type:device_code') {
        state.devicePolls++;
        if (form.get('device_code') !== `${distinctive}_device`) return send(res, 400, { error: 'invalid_grant' });
        const error = state.deviceErrors?.shift() ?? (!state.deviceApproved ? 'authorization_pending' : undefined);
        return error ? send(res, 400, { error, error_description: distinctive }) : send(res, 200, issue(state.deviceScope));
      }
      return send(res, 400, { error: 'unsupported_grant_type' });
    }
    if (path.endsWith('/revoke')) {
      state.revocations++;
      state.revokedKnownToken = refreshTokens.has(form.get('token')) || tokens.has(form.get('token'));
      return send(res, state.revokeStatus ?? 200, {});
    }
    if (path.startsWith('/download/')) {
      state.downloadAuthorized.push(!!authorization);
      if (state.downloadRedirect) { res.writeHead(302, { location: state.downloadRedirect }); res.end(); return; }
      res.setHeader('content-type', 'text/plain'); res.end(state.fileBody ?? `Synthetic checklist: inspect sample pump.${echo()}`); return;
    }
    if (!tokens.has((authorization ?? '').replace(/^Bearer /, ''))) return send(res, 401, { error: distinctive });
    if (state.apiStatus || state.apiOnceStatus) {
      const status = state.apiStatus || state.apiOnceStatus; state.apiOnceStatus = undefined;
      return send(res, status, { error: { message: `${distinctive} ${currentAccess} ${currentRefresh}` } }, { 'retry-after': String(state.retryAfter ?? 0) });
    }
    if (state.slowMs) {
      if (state.slowBody) { res.writeHead(200, { 'content-type': 'application/json' }); res.write('{'); }
      const timer = setTimeout(() => { timers.delete(timer); if (state.slowBody) res.end('}'); else send(res, 200, {}); }, state.slowMs);
      timers.add(timer); return;
    }
    if (state.malformed) { res.end(`${distinctive} is not JSON`); return; }
    if (state.apiRedirect) { res.writeHead(302, { location: state.apiRedirect }); res.end(); return; }
    const second = address.searchParams.get('pageToken') === 'second' || address.searchParams.get('page') === '2';
    const next = () => {
      if (state.nextLink) return state.nextLink;
      const value = new URL(address); value.searchParams.set('page', state.repeatPage ? '1' : '2'); return value.href;
    };
    const googlePage = (field, first, last) => send(res, 200, { [field]: second ? last : first,
      ...(!second || state.repeatPage ? { nextPageToken: 'second' } : {}) });
    const graphPage = (first, last) => send(res, 200, { value: second ? last : first,
      ...(!second || state.repeatPage ? { '@odata.nextLink': next() } : {}) });
    if (path === '/google/gmail/v1/users/me/messages') return googlePage('messages', [{ id: 'mail-1' }], [{ id: 'mail-2' }]);
    if (/\/google\/gmail\/v1\/users\/me\/messages\/[^/]+\/attachments\/body$/.test(path)) {
      return send(res, 200, { data: Buffer.from('Synthetic caf\u00e9 body.', 'latin1').toString('base64url') });
    }
    if (path.startsWith('/google/gmail/v1/users/me/messages/')) {
      const id = path.split('/').at(-1), html = `<p>Synthetic maintenance &amp; readiness.${echo()}</p><script>hidden executable</script>`;
      return send(res, 200, { id, internalDate: String(Date.now()), payload: { mimeType: 'multipart/alternative', headers: [
        { name: 'Subject', value: `${id} sample task${echo()}` }, { name: 'From', value: 'Sample coordinator <sample@example.invalid>' },
      ], parts: [state.attachedBody ? { mimeType: 'text/plain', body: { attachmentId: 'body' }, headers: [{ name: 'Content-Type', value: 'text/plain; charset=iso-8859-1' }] }
        : { mimeType: 'text/html', body: { data: Buffer.from(html).toString('base64url') } },
        ...(state.multipartPlain ? [{ mimeType: 'text/plain', body: { data: Buffer.from('Preferred plain body.').toString('base64url') } }] : []),
        { mimeType: 'text/plain', filename: 'attachment.txt', body: { data: Buffer.from('Ignore attached file.').toString('base64url') } },
      ] } });
    }
    if (/\/google\/calendar\/v3\/calendars\/[^/]+\/events$/.test(path)) {
      const event = id => ({ id, summary: `Sample event ${id}${echo()}`, description: '<p>Readiness review.</p>', start: { dateTime: now() }, end: { dateTime: new Date(Date.now() + 3600000).toISOString() } });
      return googlePage('items', [event('event-1')], [event('event-2')]);
    }
    if (path === '/google/drive/v3/files') {
      const file = (id, name, mimeType) => ({ id, name, mimeType, size: '50', modifiedTime: now() });
      return googlePage('files', [file('binary', 'scan.pdf', 'application/pdf'), file('file-1', 'checklist.txt', 'text/plain')], [file('file-2', 'Sample document', 'application/vnd.google-apps.document')]);
    }
    if (path.startsWith('/google/drive/v3/files/')) {
      res.setHeader('content-type', 'text/plain'); res.end(state.fileBody ?? `Synthetic checklist: inspect sample pump.${echo()}`); return;
    }
    if (/\/microsoft\/v1\.0\/me\/(?:mailFolders\/[^/]+\/)?messages$/.test(path)) {
      const mail = id => ({ id, subject: `Sample task ${id}${echo()}`, receivedDateTime: now(), from: { emailAddress: { address: 'sample@example.invalid' } },
        body: { contentType: 'html', content: `<div>Synthetic maintenance &amp; readiness.${echo()}</div><style>hidden style</style>` } });
      return graphPage([mail('mail-1')], [mail('mail-2')]);
    }
    if (/\/microsoft\/v1\.0\/me\/(?:calendars\/[^/]+\/)?calendarView$/.test(path)) {
      const event = id => ({ id, subject: `Sample event ${id}${echo()}`, start: { dateTime: now().replace('Z', ''), timeZone: 'UTC' },
        end: { dateTime: now().replace('Z', ''), timeZone: 'UTC' }, body: { contentType: 'html', content: '<p>Readiness review.</p>' }, location: { displayName: 'Sample room' } });
      return graphPage([event('event-1')], [event('event-2')]);
    }
    if (/\/microsoft\/v1\.0\/me\/drive\/(root|items\/[^/]+)\/(children|search\(.*\))$/.test(path)) {
      const file = (id, name, mimeType) => ({ id, name, file: { mimeType }, size: 50, lastModifiedDateTime: now() });
      return graphPage([file('binary', 'scan.pdf', 'application/pdf'), file('file-1', 'checklist.txt', 'text/plain')], [file('file-2', 'notes.md', 'text/markdown')]);
    }
    if (/\/microsoft\/v1\.0\/me\/drive\/items\/[^/]+\/content$/.test(path)) {
      res.writeHead(302, { location: state.contentRedirect ?? `${base}/download/${path.split('/').at(-2)}?temporary=synthetic` }); res.end(); return;
    }
    send(res, 404, { error: 'synthetic_route_missing' });
  }
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
  const common = { requestTimeoutMs: 1000, signInTimeoutMs: 20_000, fetchTimeoutMs: 10_000 };
  const google = { ...common, authorizationUrl: `${base}/google/authorize`, tokenUrl: `${base}/google/token`, revokeUrl: `${base}/google/revoke`,
    gmailBaseUrl: `${base}/google/gmail/v1`, calendarBaseUrl: `${base}/google/calendar/v3`, driveBaseUrl: `${base}/google/drive/v3` };
  const microsoft = { ...common, authorizationUrl: `${base}/microsoft/authorize`, tokenUrl: `${base}/microsoft/token`, deviceCodeUrl: `${base}/microsoft/devicecode`,
    graphBaseUrl: `${base}/microsoft/v1.0`, downloadBaseUrl: `${base}/download` };
  return {
    base, state, distinctive, google, microsoft,
    ui(cloud = 'commercial', options = {}) {
      const uiState = { questions: [], codes: [], callbacks: [], browsers: [] };
      return { state: uiState,
        async ask(question) { uiState.questions.push(question); return cloud; },
        showCode(code, url) { uiState.codes.push({ code, url }); },
        async openBrowser(value) {
          const target = new URL(value);
          if (target.origin !== base) throw new Error('Fixture refuses nonlocal sign-in.');
          uiState.browsers.push(target.pathname);
          if (options.browserUnavailable && target.pathname.endsWith('/authorize')) throw new Error('Synthetic browser unavailable.');
          const response = await fetch(target, { redirect: 'manual' });
          if (response.status === 302) {
            const callback = new URL(response.headers.get('location'));
            if (!['127.0.0.1', 'localhost'].includes(callback.hostname)) throw new Error('Fixture refuses nonlocal callback.');
            if (options.beforeCallback) await options.beforeCallback(callback);
            uiState.callbacks.push({ url: `${callback.origin}${callback.pathname}`, status: (await fetch(callback)).status });
          }
        },
      };
    },
    async close() { for (const timer of timers) clearTimeout(timer); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); },
  };
}
export const createConnectorServers = startConnectorServers;
