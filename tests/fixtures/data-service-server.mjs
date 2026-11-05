import http from 'node:http';

// Synthetic records only. Callers supply ephemeral credentials, which are never logged.
export async function startDataServiceServer({ key = '', username = 'sample-reader', password = '', mode = 'open', description = 'none' } = {}) {
  const requests = [];
  const ships = [{ ship_name: 'Sample Harbor', workOrderCount: 2 }, { ship_name: 'Sample Bay', workOrderCount: 4 }];
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    requests.push({ method: req.method, path: url.pathname, page: url.searchParams.get('page'), cursor: url.searchParams.get('cursor') });
    const json = (status, body, headers = {}) => { res.writeHead(status, { 'Content-Type': 'application/json', ...headers }); res.end(JSON.stringify(body)); };
    if (req.method !== 'GET') return json(405, { error: 'Only reading is allowed' });
    if (['/openapi.json', '/swagger.json', '/api-docs', '/v3/api-docs', '/swagger/v1/swagger.json', '/specification'].includes(url.pathname)) {
      if (description === 'none' || description === 'swagger' && url.pathname !== '/swagger.json' || description === 'openapi' && url.pathname !== '/openapi.json' || description === 'custom-path' && url.pathname !== '/specification') return json(404, {});
      const schema = mode === 'header' ? { type: 'apiKey', in: 'header', name: 'X-Fleet-Key' }
        : mode === 'basic' ? (description === 'swagger' ? { type: 'basic' } : { type: 'http', scheme: 'basic' })
          : { type: 'http', scheme: 'bearer' };
      const secure = ['header', 'basic', 'bearer'].includes(mode);
      return json(200, {
        ...(description === 'swagger' ? { swagger: '2.0', basePath: '/', securityDefinitions: { access: schema } }
          : { openapi: '3.0.3', servers: [{ url: '/' }], components: { securitySchemes: { access: schema } } }),
        info: { title: 'Synthetic service', version: '1' },
        ...(secure ? { security: [{ access: [] }] } : {}),
        paths: {
          '/ships': { get: { responses: { 200: { description: 'Ships', schema: { type: 'array', items: { type: 'object' } } } } } },
          ...(mode === 'multiple' ? { '/work-orders': { get: { responses: { 200: { description: 'Work orders', schema: { type: 'array', items: { type: 'object' } } } } } } } : {}),
        },
      });
    }
    if (url.pathname === '/docs') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end('<html>Public sample documentation</html>'); }
    if (mode === 'multiple' && url.pathname === '/work-orders') return json(200, [{ work_order: 'Synthetic work order', requested_page: url.searchParams.get('page') }]);
    if (mode === 'slow') { const timer = setTimeout(() => json(200, ships), 1_000); res.on('close', () => clearTimeout(timer)); return; }
    if (mode === 'large') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify([{ note: 'x'.repeat(80_000) }])); }
    if (mode === 'large-header') { res.writeHead(200, { 'Content-Length': '9000000' }); return res.end('[]'); }
    if (mode === 'metadata') { res.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data/' }); return res.end(); }
    if (mode === 'metadata-v6') { res.writeHead(307, { Location: 'http://[fd00:ec2::254]/latest/meta-data/' }); return res.end(); }
    if (mode === 'redirect-loop') { res.writeHead(302, { Location: '/loop' }); return res.end(); }
    if (mode === 'redirect' && url.pathname !== '/records') { res.writeHead(302, { Location: '/records' }); return res.end(); }
    if (mode === 'html') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end('<html>Sign in to view this page</html>'); }
    if (mode === 'header' && req.headers['x-fleet-key'] !== key) return json(401, { error: 'A key is required', header: 'X-Fleet-Key' });
    if (mode === 'bearer' && req.headers.authorization !== `Bearer ${key}`) return json(401, { error: 'Sign in' }, { 'WWW-Authenticate': 'Bearer realm="sample"' });
    if (mode === 'basic' && req.headers.authorization !== `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`) return json(401, { error: 'Sign in' }, { 'WWW-Authenticate': 'Basic realm="sample"' });
    if (mode === 'unknown-auth') return json(401, { error: 'Sign in' });
    if (mode === 'csv') { res.writeHead(200, { 'Content-Type': 'text/csv' }); return res.end('ship_name,workOrderCount,notes\r\n"Sample Harbor",2,"A comma, and a ""quote"""\r\n"Sample Bay",4,"Two\nlines"\r\n'); }
    if (mode === 'malformed-csv') { res.writeHead(200, { 'Content-Type': 'text/csv' }); return res.end('name,count\n"unfinished,2'); }
    if (mode === 'malformed-json') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{bad'); }
    if (mode === 'rate-limit') return json(429, { error: 'Busy' });
    if (mode === 'cursor') return json(200, { data: [ships[url.searchParams.has('cursor') ? 1 : 0]], next_cursor: url.searchParams.has('cursor') ? null : 'page-two', total: 2 });
    if (mode === 'links') return json(200, [ships[url.searchParams.has('page') ? 1 : 0]], url.searchParams.has('page') ? {} : { Link: '</ships?page=2>; rel="next"' });
    if (mode === 'cycle') return json(200, { records: ships, next: '/ships' });
    if (mode === 'wrapped') return json(200, { data: { items: [ships[url.searchParams.has('page') ? 1 : 0]] }, total: 2, links: { next: url.searchParams.has('page') ? null : '/ships?page=2' } });
    if (mode === 'named-wrapper') return json(200, { ships, total: 2 });
    if (mode === 'pagination-metadata') return json(200, { items: ships, next: 'http://169.254.169.254/' });
    if (mode === 'leak' || url.pathname === '/echo') return json(200, { items: [{ ship_name: 'Sample Harbor', echoed: req.headers['x-fleet-key'] ?? req.headers.authorization, token: key, nested: { value: key }, [key]: 'echoed field' }], total: 1 });
    return json(200, ships);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return {
    origin: `http://127.0.0.1:${server.address().port}`, requests,
    setMode(value) { mode = value; },
    close() { server.closeAllConnections(); return new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); },
  };
}
