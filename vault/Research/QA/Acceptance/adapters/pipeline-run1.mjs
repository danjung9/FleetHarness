// UI adapter discovered from Pipeline-run1 index.html and its retained browser DOM.
// Transforms representation only. No candidate functions or storage are accessed.
export const id = 'pipeline-run1';
export const readableSummaryScope = {
  file: 'requirements.md', sha256: '513f2b34bbee011a1d05c51ca4c934b543e394ca4a9d8c7ffb2afd376f2df8eb',
  detail: 'The reviewed public brief requires portable save/import of exact inputs and draft, but no separate readable-summary export. Its absence is out of brief, not a product failure.'
};
export const names = {
  check: /^Generate draft$/, save: /^Save JSON$/, summary: null, review: /^Mark draft reviewed$/
};
const copy = value => structuredClone(value);
const canonical = value => JSON.stringify(value, (_key, v) => v && !Array.isArray(v) && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
export function encodeInput(input) {
  if (input.requests.some(r => r.people.length !== 1 || r.resources.length !== 1 || r.qualifications.length !== 1)) throw new Error('Pipeline adapter supports only observed single-person/room/qualification input.');
  return {
    schemaVersion: 1, epoch: { label: 'Synthetic day one at minute 0', day2Minute: 1440 },
    operatingWindows: input.windows.map(w => [w.start, w.end]),
    people: input.people.map(p => ({ id: p.id, qualifications: copy(p.qualifications), availability: p.windows.map(w => [w.start, w.end]), maxMinutes: p.maxMinutes, restMinutes: p.restMinutes })),
    requests: input.requests.map(r => ({ id: r.id, duration: r.duration, allowedStarts: copy(r.starts), personId: r.people[0], roomId: r.resources[0], requiredQualification: r.qualifications[0] })),
    maxNodes: input.maxNodes
  };
}
export function decodeInput(value) {
  try {
    if (value?.kind === 'synthetic-training-draft') {
      const parsed = JSON.parse(value.inputText);
      if (value.inputs !== null && canonical(parsed) !== canonical(value.inputs)) return null;
      value = parsed;
    }
    if (value?.schemaVersion !== 1 || !Array.isArray(value.operatingWindows) || !Array.isArray(value.people) || !Array.isArray(value.requests) || !Object.hasOwn(value, 'maxNodes')) return null;
    if (value.operatingWindows.some(w => !Array.isArray(w) || w.length !== 2)) return null;
    if (value.people.some(p => !Array.isArray(p.availability) || !Array.isArray(p.qualifications))) return null;
    if (value.requests.some(r => !Array.isArray(r.allowedStarts) || !['personId', 'roomId', 'requiredQualification', 'duration', 'id'].every(k => Object.hasOwn(r, k)))) return null;
    return {
      windows: value.operatingWindows.map(w => ({ start: w[0], end: w[1] })),
      people: value.people.map(p => ({ id: p.id, qualifications: copy(p.qualifications), windows: p.availability.map(w => ({ start: w[0], end: w[1] })), maxMinutes: p.maxMinutes, restMinutes: p.restMinutes })),
      requests: value.requests.map(r => ({ id: r.id, duration: r.duration, starts: copy(r.allowedStarts), people: [r.personId], resources: [r.roomId], qualifications: [r.requiredQualification] })), maxNodes: value.maxNodes
    };
  } catch { return null; }
}
export function replaceSavedInput(snapshot, input) {
  if (snapshot?.kind !== 'synthetic-training-draft') throw new Error('Unrecognized Pipeline snapshot.');
  const result = copy(snapshot), native = encodeInput(input);
  result.inputText = JSON.stringify(native, null, 2); result.inputs = native;
  // Intentionally retain old result/review metadata for the tamper-rejection case.
  return result;
}
export async function detect(page) {
  return await page.locator('#inputText').count() === 1 && await page.locator('#statusTitle').count() === 1 &&
    await page.getByRole('button', { name: 'Generate draft', exact: true }).count() === 1;
}
export async function applyInput(page, input) {
  const control = page.getByLabel('Synthetic input JSON', { exact: true });
  await control.fill(JSON.stringify(encodeInput(input), null, 2)); await control.blur();
  let decoded; try { decoded = decodeInput(JSON.parse(await control.inputValue())); } catch {}
  return { ok: !!decoded && canonical(decoded) === canonical(input), mismatch: !!decoded && canonical(decoded) !== canonical(input), kind: 'Observed native JSON editor with reversible schema mapping' };
}
export async function prepareReview(page) {
  await page.getByLabel('Synthetic reviewer label', { exact: true }).fill('Synthetic QA reviewer');
}
export async function inspect(page) {
  const raw = await page.evaluate(() => {
    const visible = el => {
      if (!el || !el.getClientRects().length || el.closest('[aria-hidden="true"]')) return false;
      for (let node = el; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      }
      return true;
    };
    const text = selector => { const el = document.querySelector(selector); return visible(el) ? el.innerText?.trim() ?? null : null; };
    return {
      title: text('#statusTitle'), detail: text('#statusDetail'), review: text('#reviewStatus'), message: text('#message'),
      inputText: document.querySelector('#inputText')?.value ?? null,
      sessions: [...document.querySelectorAll('#days .session')].filter(visible).map(el => ({ id: el.querySelector('strong')?.innerText?.trim(), identity: el.querySelector('span')?.innerText?.trim(), time: el.querySelector('time')?.innerText?.trim() })),
      loads: [...document.querySelectorAll('#loading > div')].filter(visible).map(el => ({ who: el.querySelector('h3')?.innerText?.trim(), total: el.querySelector('p')?.innerText?.trim() })),
      explanations: text('#explanations')
    };
  });
  const status = { 'Feasible draft': 'feasible', 'Infeasible with these choices': 'infeasible', 'Invalid input': 'invalid_input', 'Search limit reached; feasibility unknown': 'budget_exhausted' }[raw.title];
  const assignments = []; let complete = true;
  for (const item of raw.sessions) {
    const times = item.time?.match(/^D(\d+) (\d{2}):(\d{2})\s*\u2192\s*D(\d+) (\d{2}):(\d{2})$/);
    const identity = item.identity?.split(/\s*\u00b7\s*/);
    if (!times || identity?.length !== 2 || !item.id) { complete = false; continue; }
    // The page labels these as minutes from midnight; record the separate key-clock mismatch below.
    assignments.push({ id: item.id, start: (Number(times[1]) - 1) * 1440 + Number(times[2]) * 60 + Number(times[3]), end: (Number(times[4]) - 1) * 1440 + Number(times[5]) * 60 + Number(times[6]), people: [identity[0]], resources: [identity[1]] });
  }
  const totals = {}; let totalsComplete = raw.loads.length === 2;
  for (const load of raw.loads) {
    const who = load.who?.match(/^(P01|P02)\s/), count = load.total?.match(/^(\d+) scheduled minutes$/);
    if (!who || !count || Object.hasOwn(totals, who[1])) totalsComplete = false;
    else totals[who[1]] = Number(count[1]);
  }
  let input = null; try { input = decodeInput(JSON.parse(raw.inputText)); } catch {}
  return {
    candidateResult: status && complete ? { status, assignments, source: 'Observed Pipeline status and rendered day-board cards', diagnostics: { detail: raw.detail, explanation: raw.explanations } } : null,
    candidateTotals: totalsComplete ? totals : null,
    candidateReview: /^Reviewed by /.test(raw.review || '') ? true : /^(Not reviewed\.|Imported historical review)/.test(raw.review || '') ? false : null,
    candidateInput: input,
    extraEvidence: { ...raw, clockConvention: 'Observed board maps canonical minute zero to D1 00:00; frozen officer key maps it to 0800.', importRejected: /^Import rejected;/.test(raw.message || '') }
  };
}
