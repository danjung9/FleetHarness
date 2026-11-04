// Public form, rendered-result and portable-file adapter for Pipeline-run2.
// No candidate functions, solver, private state or browser storage are accessed.
export const id = 'pipeline-run2';
export const names = {
  check: /^Generate draft$/, save: /^Save portable draft$/,
  summary: null, review: /^Mark current draft reviewed$/
};
const copy = value => structuredClone(value);
const canonical = value => JSON.stringify(value, (_key, v) => v && !Array.isArray(v) && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
const equal = (a, b) => canonical(a) === canonical(b);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const has = (value, keys) => object(value) && keys.every(key => Object.hasOwn(value, key));
const shape = value => has(value, ['windows', 'people', 'requests', 'maxNodes']) &&
  Array.isArray(value.windows) && Array.isArray(value.people) && Array.isArray(value.requests);

export function encodeInput(input) {
  if (!shape(input) || input.windows.some(w => !has(w, ['start', 'end'])) ||
      input.people.some(p => !has(p, ['id', 'qualifications', 'windows', 'maxMinutes', 'restMinutes']) ||
        !Array.isArray(p.windows) || !Array.isArray(p.qualifications) || p.windows.some(w => !has(w, ['start', 'end']))) ||
      input.requests.some(r => !has(r, ['id', 'duration', 'starts', 'people', 'resources', 'qualifications']) ||
        !Array.isArray(r.starts) || ![r.people, r.resources, r.qualifications].every(a => Array.isArray(a) && a.length === 1))) {
    throw new Error('Run2 mapping requires complete canonical input with one person, room and required qualification per request.');
  }
  // Representation only: retain scalar types, ordering, duplicates and invalid values.
  return {
    epoch: 'Day 1 minute 0', operatingWindows: input.windows.map(w => [copy(w.start), copy(w.end)]),
    people: input.people.map(p => ({ id: copy(p.id), qualifications: copy(p.qualifications),
      availability: p.windows.map(w => [copy(w.start), copy(w.end)]), maxMinutes: copy(p.maxMinutes), minRestMinutes: copy(p.restMinutes) })),
    requests: input.requests.map(r => ({ id: copy(r.id), duration: copy(r.duration), starts: copy(r.starts),
      person: copy(r.people[0]), room: copy(r.resources[0]), qualification: copy(r.qualifications[0]) })),
    maxNodes: copy(input.maxNodes)
  };
}

export function decodeInput(value) {
  try {
    if (has(value, ['schemaVersion', 'classification', 'inputs', 'draft'])) {
      if (value.schemaVersion !== 1 || value.classification !== 'synthetic') return null;
      value = value.inputs;
    }
    if (!has(value, ['epoch', 'operatingWindows', 'people', 'requests', 'maxNodes']) || value.epoch !== 'Day 1 minute 0' ||
        !Array.isArray(value.operatingWindows) || value.operatingWindows.some(w => !Array.isArray(w) || w.length !== 2) ||
        !Array.isArray(value.people) || value.people.some(p => !has(p, ['id', 'qualifications', 'availability', 'maxMinutes', 'minRestMinutes']) ||
          !Array.isArray(p.qualifications) || !Array.isArray(p.availability) || p.availability.some(w => !Array.isArray(w) || w.length !== 2)) ||
        !Array.isArray(value.requests) || value.requests.some(r => !has(r, ['id', 'duration', 'starts', 'person', 'room', 'qualification']) || !Array.isArray(r.starts))) return null;
    return {
      windows: value.operatingWindows.map(w => ({ start: copy(w[0]), end: copy(w[1]) })),
      people: value.people.map(p => ({ id: copy(p.id), qualifications: copy(p.qualifications),
        windows: p.availability.map(w => ({ start: copy(w[0]), end: copy(w[1]) })), maxMinutes: copy(p.maxMinutes), restMinutes: copy(p.minRestMinutes) })),
      requests: value.requests.map(r => ({ id: copy(r.id), duration: copy(r.duration), starts: copy(r.starts),
        people: [copy(r.person)], resources: [copy(r.room)], qualifications: [copy(r.qualification)] })), maxNodes: copy(value.maxNodes)
    };
  } catch { return null; }
}

export function replaceSavedInput(snapshot, input) {
  if (!has(snapshot, ['schemaVersion', 'classification', 'inputs', 'draft']) ||
      snapshot.schemaVersion !== 1 || snapshot.classification !== 'synthetic' || !decodeInput(snapshot)) {
    throw new Error('Unrecognized Run2 portable snapshot.');
  }
  // Preserve the old draft and any review metadata. Do not manufacture matching results.
  return { ...copy(snapshot), inputs: encodeInput(input) };
}

export async function detect(page) {
  if (await page.title() !== 'Training draft · Synthetic practice') return false;
  for (const selector of ['#requests', '#people', '#status', '#board', '#loads', '#generate', '#save-portable', '#import-file', '#review-status']) {
    if (await page.locator(selector).count() !== 1) return false;
  }
  return await page.getByRole('button', { name: 'Generate draft', exact: true }).count() === 1 &&
    await page.getByRole('button', { name: 'Save portable draft', exact: true }).count() === 1;
}

export async function inspect(page) {
  const raw = await page.evaluate(() => {
    const byId = id => document.getElementById(id);
    const visible = el => {
      if (!el || !el.getClientRects().length || el.closest('[aria-hidden="true"]')) return false;
      for (let node = el; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      }
      return true;
    };
    const text = id => visible(byId(id)) ? byId(id).textContent.trim() : null;
    const value = id => byId(id)?.value ?? null;
    const requests = [...document.querySelectorAll('#requests > .request')].map(el => {
      const duration = el.querySelector('input[id^="duration-"]'), starts = el.querySelector('input[id^="starts-"]');
      return { heading: el.querySelector('h3')?.textContent.trim(), identity: el.querySelector('small[id^="assignment-"]')?.textContent.trim(),
        durationId: duration?.id, duration: duration?.value, startsId: starts?.id, starts: starts?.value };
    });
    const people = [...document.querySelectorAll('#people > .request')].map(el => ({
      heading: el.querySelector('h3')?.textContent.trim(),
      fields: [...el.querySelectorAll('input')].map(input => ({ id: input.id, value: input.value }))
    }));
    return {
      status: text('status'), diagnostics: text('diagnostics'), review: text('review-status'), importNotice: text('import-status'),
      operating: value('operating-windows'), maxNodes: value('max-nodes'), requests, people,
      results: [...document.querySelectorAll('#board .result')].filter(visible).map(el => ({ id: el.id, text: el.textContent.trim() })),
      loads: [...document.querySelectorAll('#loads [id^="load-"]')].filter(visible).map(el => ({ id: el.id, text: el.textContent.trim() })),
      errors: [...document.querySelectorAll('.error')].filter(visible).map(el => ({ id: el.id, text: el.textContent.trim() })),
      previewVisible: visible(byId('preview'))
    };
  });
  const integer = text => typeof text === 'string' && /^\d+$/.test(text.trim()) && Number.isSafeInteger(Number(text.trim())) ? Number(text.trim()) : null;
  const windows = text => {
    if (typeof text !== 'string') return null;
    const pairs = text.split(';').map(part => part.trim().split('-').map(integer));
    return pairs.every(pair => pair.length === 2 && pair.every(n => n !== null)) ? pairs.map(([start, end]) => ({ start, end })) : null;
  };
  const requests = []; let completeInput = raw.requests.length === 4 && raw.people.length === 2;
  for (const row of raw.requests) {
    const identity = row.identity?.split(/\s*\|\s*/), requestId = row.heading?.match(/^Session ([A-D])$/)?.[1];
    const duration = integer(row.duration), starts = typeof row.starts === 'string' ? row.starts.split(',').map(integer) : null;
    if (!requestId || row.durationId !== 'duration-' + requestId || row.startsId !== 'starts-' + requestId ||
        identity?.length !== 3 || duration === null || !starts || starts.some(n => n === null)) { completeInput = false; continue; }
    requests.push({ id: requestId, duration, starts, people: [identity[0]], resources: [identity[1]], qualifications: [identity[2]] });
  }
  const people = [];
  for (const row of raw.people) {
    const personId = row.heading?.match(/^(P01|P02) · whole-horizon limits$/)?.[1];
    const field = name => { const matches = row.fields.filter(f => f.id === name + '-' + personId); return matches.length === 1 ? matches[0].value : null; };
    const qualifications = field('qualifications'), availability = windows(field('availability'));
    const maxMinutes = integer(field('budget')), restMinutes = integer(field('rest'));
    if (!personId || qualifications === null || !availability || maxMinutes === null || restMinutes === null) { completeInput = false; continue; }
    // An empty field is [''] in this app, not the canonical empty qualification array.
    people.push({ id: personId, qualifications: qualifications.split(',').map(q => q.trim()), windows: availability, maxMinutes, restMinutes });
  }
  const operating = windows(raw.operating), maxNodes = integer(raw.maxNodes);
  if (!operating || maxNodes === null || new Set(requests.map(r => r.id)).size !== 4 || new Set(people.map(p => p.id)).size !== 2) completeInput = false;
  const status = {
    'Feasible draft \u2014 all 4 requests scheduled.': 'feasible',
    'Infeasible \u2014 no permitted combination satisfies all constraints.': 'infeasible',
    'Invalid input \u2014 correct the highlighted fields.': 'invalid_input',
    'Search limit reached \u2014 feasibility is unknown.': 'budget_exhausted'
  }[raw.status];
  const assignments = []; let completeResult = !!status;
  for (const row of raw.results) {
    const match = row.text.match(/^([^|]+)\s*\|\s*(\d+)\u2013(\d+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)$/);
    if (!match || row.id !== 'result-' + match[1].trim() || ![match[2], match[3]].every(n => Number.isSafeInteger(Number(n)))) { completeResult = false; continue; }
    assignments.push({ id: match[1].trim(), start: Number(match[2]), end: Number(match[3]), people: [match[4].trim()], resources: [match[5].trim()] });
  }
  const totals = {}; let completeTotals = raw.loads.length === 2;
  for (const row of raw.loads) {
    const match = row.text.match(/^(P01|P02): (\d+) \/ (\d+) minutes across both days$/);
    if (!match || row.id !== 'load-' + match[1] || Object.hasOwn(totals, match[1]) || !Number.isSafeInteger(Number(match[2]))) completeTotals = false;
    else totals[match[1]] = Number(match[2]);
  }
  return {
    candidateResult: completeResult ? { status, assignments, source: 'Run2 current visible status and assignment cards', diagnostics: { text: raw.diagnostics, errors: raw.errors } } : null,
    candidateTotals: completeTotals && Object.hasOwn(totals, 'P01') && Object.hasOwn(totals, 'P02') ? totals : null,
    candidateReview: raw.review === 'Reviewed \u2014 current synthetic draft.' ? true : raw.review === 'Not reviewed \u2014 current inputs need review.' ? false : null,
    candidateInput: completeInput ? { windows: operating, people, requests, maxNodes } : null,
    extraEvidence: { ...raw, importRejected: /^Import failed \u2014/.test(raw.importNotice || ''),
      clockConvention: 'Rendered intervals are raw integer minutes from Day 1 minute 0; no 0800 clock display is claimed.',
      inputTypeLimit: 'Form readback follows the documented integer syntax. Actual portable JSON is required to establish serialized types.',
      portableReviewPolicy: 'Saved snapshots omit review; successful imports require fresh review.',
      summaryCapability: 'Download user guide is static documentation, not a current schedule summary.' }
  };
}

// Pure boundary check, also available for source-only adapter mapping checks.
export function formSupport(input, current) {
  if (!shape(input) || !shape(current)) return ['Run2 form cannot establish a complete canonical input.'];
  const reasons = [], nonnegative = n => Number.isSafeInteger(n) && n >= 0;
  if (!equal(input.requests.map(r => r?.id), current.requests.map(r => r?.id))) reasons.push('Request IDs/order/count are fixed; the exact duplicate-ID variant is unsupported by this form.');
  if (!equal(input.people.map(p => p?.id), current.people.map(p => p?.id))) reasons.push('Person IDs/order/count are fixed.');
  for (const r of input.requests) {
    const before = current.requests.find(x => x.id === r?.id);
    if (!r || !before) continue;
    if (!['people', 'resources', 'qualifications'].every(key => equal(r[key], before[key]))) reasons.push(r.id + ': assigned people, rooms and required qualifications are fixed.');
    if (!nonnegative(r.duration) || !Array.isArray(r.starts) || !r.starts.length || r.starts.some(n => !nonnegative(n))) reasons.push(r.id + ': exact quoted/nonnumeric values cannot roundtrip through the integer form without coercion.');
  }
  for (const p of input.people) {
    if (!p || !Array.isArray(p.qualifications) || !p.qualifications.length || p.qualifications.some(q => typeof q !== 'string' || !q.length || q !== q.trim() || q.includes(','))) reasons.push((p?.id || 'Person') + ': empty qualification arrays or non-roundtrippable tokens are unsupported; blank text becomes [""].');
    if (!p || ![p.maxMinutes, p.restMinutes].every(nonnegative)) reasons.push('Person limits cannot roundtrip through the integer form.');
  }
  const windowSets = [input.windows, ...input.people.map(p => p?.windows)];
  if (windowSets.some(ws => !Array.isArray(ws) || !ws.length || ws.some(w => !w || !nonnegative(w.start) || !nonnegative(w.end)))) reasons.push('Window fields require nonempty lists of integer endpoints.');
  if (!nonnegative(input.maxNodes)) reasons.push('Search allowance cannot roundtrip through the integer form.');
  return reasons;
}

export async function applyInput(page, input) {
  const priorObservation = await inspect(page), unsupported = formSupport(input, priorObservation.candidateInput);
  if (unsupported.length) return { ok: false, reason: unsupported.join(' '), unsupported,
    kind: 'Unsupported exact Run2 form input; no coercion attempted', priorObservation };
  if (!await page.locator('#advanced').isVisible()) await page.locator('#advanced-toggle').click();
  const fields = [['operating-windows', input.windows.map(w => w.start + '-' + w.end).join(';')], ['max-nodes', String(input.maxNodes)]];
  for (const r of input.requests) fields.push(['duration-' + r.id, String(r.duration)], ['starts-' + r.id, r.starts.join(', ')]);
  for (const p of input.people) fields.push(['qualifications-' + p.id, p.qualifications.join(', ')],
    ['availability-' + p.id, p.windows.map(w => w.start + '-' + w.end).join(';')],
    ['budget-' + p.id, String(p.maxMinutes)], ['rest-' + p.id, String(p.restMinutes)]);
  // Validate every control before edits, and do not touch unchanged values to clear review artificially.
  for (const [controlId] of fields) if (await page.locator('#' + controlId).count() !== 1) return { ok: false,
    reason: 'Missing or ambiguous Run2 field: ' + controlId, kind: 'Unsupported Run2 input boundary', priorObservation };
  for (const [controlId, value] of fields) {
    const control = page.locator('#' + controlId);
    if (await control.inputValue() !== value) await control.fill(value);
  }
  const after = await inspect(page), ok = after.candidateInput !== null && equal(after.candidateInput, input);
  return { ok, mismatch: after.candidateInput !== null && !ok, priorObservation, immediateObservation: after,
    kind: 'Actual Run2 form input and DOM readback before any explicit recheck/save; native blur may recalculate',
    typeEvidenceLimit: 'Decode an actual downloaded snapshot separately to establish serialized field types.' };
}

const preparedImports = new WeakSet();
const idleImportNotice = 'Import text changed \u2014 check it before replacement.';
export async function beforeImport(page) {
  preparedImports.delete(page);
  if (await page.locator('#preview').isVisible()) await page.locator('#cancel-import').click();
  // Ordinary editor input clears staging and replaces all earlier success/failure notices.
  await page.locator('#import-text').fill('Run2 acceptance import preparation');
  await page.locator('#import-text').fill('');
  await page.waitForFunction(expected => document.getElementById('import-status')?.textContent.trim() === expected &&
    document.getElementById('preview')?.hidden === true && document.getElementById('import-text')?.value === '', idleImportNotice, { timeout: 5000 });
  preparedImports.add(page);
  return { action: 'Cleared previous import staging through the public JSON textarea', notice: idleImportNotice };
}

export async function waitForImport(page) {
  if (!preparedImports.has(page)) throw new Error('Run2 import requires beforeImport(page) immediately before setInputFiles.');
  preparedImports.delete(page);
  await page.waitForFunction(() => {
    const notice = document.getElementById('import-status')?.textContent.trim() || '';
    return /^Import failed \u2014/.test(notice) || (notice === 'Valid synthetic snapshot \u2014 confirm replacement of current work.' &&
      document.getElementById('preview')?.hidden === false && !!document.getElementById('import-text')?.value.trim());
  }, undefined, { timeout: 5000 });
  const notice = (await page.locator('#import-status').innerText()).trim();
  if (/^Import failed \u2014/.test(notice)) return { accepted: false, action: 'Observed this upload being rejected; current work retained', notice };
  if (!await page.locator('#preview').isVisible()) throw new Error('Run2 valid-import notice has no visible replacement preview.');
  await page.getByRole('button', { name: 'Replace current work', exact: true }).click();
  await page.waitForFunction(() => document.getElementById('import-status')?.textContent.trim() === 'Imported \u2014 inspect the draft and review it again.' &&
    document.getElementById('preview')?.hidden === true, undefined, { timeout: 5000 });
  return { accepted: true, action: 'Confirmed the visible replacement preview through Replace current work', notice: 'Imported \u2014 inspect the draft and review it again.' };
}

export async function handleDialog(dialog) {
  // The inspected import uses an inline preview, not a native confirm dialog.
  await dialog.dismiss();
  return 'Dismissed unexpected dialog; Run2 import requires its visible replacement preview.';
}
