// Public DOM and portable-file adapter for the inspected CLI-route interface.
// This module does not import, call, or reproduce the candidate's scheduling code.
export const id = 'cli-route';
export const names = {
  check: /^Find draft again$/,
  save: /^Save draft file$/,
  summary: null,
  review: /^Mark current draft reviewed$/
};
const confirmedActions = new Set([
  'Replace the current inputs and draft with the supplied synthetic example? Save first to keep your changes.',
  'Replace the current inputs and draft with this saved file? Import clears review. Save first to keep current changes.'
]);
export async function handleDialog(dialog) {
  if (dialog.type() === 'confirm' && confirmedActions.has(dialog.message())) await dialog.accept();
  else await dialog.dismiss();
}
const clone = value => structuredClone(value);
const canonical = value => JSON.stringify(value, function (_key, v) {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v;
});
const equal = (a, b) => canonical(a) === canonical(b);
const shape = value => value && typeof value === 'object' && !Array.isArray(value) &&
  Array.isArray(value.windows) && Array.isArray(value.people) &&
  Array.isArray(value.requests) && Object.hasOwn(value, 'maxNodes');

export async function detect(page) {
  if (await page.title() !== 'Synthetic practice draft') return false;
  for (const selector of ['#request-inputs', '#operating-inputs', '#people-inputs', '#draft-rows', '#result', '#result-title', '#totals', '#review-state', '#max-nodes', '#import-file']) {
    if (await page.locator(selector).count() !== 1) return false;
  }
  return await page.getByRole('button', { name: 'Find draft again', exact: true }).count() === 1 &&
    await page.getByRole('button', { name: 'Save draft file', exact: true }).count() === 1;
}

// The portable input uses the canonical schema directly. Types are preserved.
export function encodeInput(input) {
  if (!shape(input)) throw new Error('CLI input does not have the canonical schema');
  return clone(input);
}
export function decodeInput(snapshotOrNative) {
  if (shape(snapshotOrNative)) return clone(snapshotOrNative);
  if (snapshotOrNative?.format === 'synthetic-practice-draft' &&
      snapshotOrNative.version === 1 && shape(snapshotOrNative.input)) return clone(snapshotOrNative.input);
  return null;
}
export function replaceSavedInput(snapshot, input) {
  if (snapshot?.format !== 'synthetic-practice-draft' || snapshot.version !== 1 || !shape(snapshot.input)) {
    throw new Error('Not a recognized CLI portable draft envelope');
  }
  if (!shape(input)) throw new Error('Replacement input does not have the canonical schema');
  // Deliberately retain result and any metadata. The app may reject this stale envelope.
  // Do not manufacture a matching candidate result to make an edited import succeed.
  return { ...clone(snapshot), input: clone(input) };
}

export async function inspect(page) {
  return page.evaluate(() => {
    const byId = id => document.getElementById(id);
    const visible = el => {
      if (!el || !el.getClientRects().length || el.closest('[aria-hidden="true"]')) return false;
      for (let node = el; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      }
      return true;
    };
    const cells = row => [...row.cells].map(cell => cell.textContent.trim());
    const split = text => text.trim() ? text.split(',').map(s => s.trim()) : [];
    const integerText = raw => /^\d+$/.test(raw.trim()) && Number.isSafeInteger(Number(raw.trim())) ? Number(raw.trim()) : null;
    const fields = [...document.querySelectorAll('input[type=text][aria-label]')].map(el => ({
      label: el.getAttribute('aria-label'), value: el.value
    }));
    const uniqueField = label => {
      const matches = fields.filter(f => f.label === label);
      return matches.length === 1 ? matches[0].value : null;
    };
    const numberField = label => {
      const value = uniqueField(label);
      return value === null ? null : integerText(value);
    };
    const windows = prefix => {
      const indexes = [...new Set(fields.filter(f => f.label.startsWith(prefix + ' window '))
        .map(f => /^(\d+) (start|end)$/.exec(f.label.slice((prefix + ' window ').length))?.[1]).filter(Boolean))]
        .map(Number).sort((a, b) => a - b);
      const result = [];
      for (const index of indexes) {
        const start = numberField(prefix + ' window ' + index + ' start');
        const end = numberField(prefix + ' window ' + index + ' end');
        if (start === null || end === null) return null;
        result.push({ start, end });
      }
      return result;
    };
    const inputRows = [...(byId('request-inputs')?.rows || [])];
    const requests = [];
    let formComplete = true;
    for (const row of inputRows) {
      const text = cells(row), requestId = text[0];
      const duration = numberField(requestId + ' duration');
      const rawStarts = uniqueField(requestId + ' allowed starts');
      const starts = rawStarts === null ? null : rawStarts.trim() === '' ? [] : rawStarts.split(',').map(integerText);
      if (text.length !== 6 || duration === null || !starts || starts.some(s => s === null)) formComplete = false;
      requests.push({
        id: requestId, duration, starts,
        people: split(text[1] || ''), resources: split(text[2] || ''), qualifications: split(text[3] || '')
      });
    }
    const people = [];
    for (const panel of [...(byId('people-inputs')?.querySelectorAll('.person') || [])]) {
      const personId = panel.querySelector('h3')?.textContent.trim();
      const rawQualifications = uniqueField(personId + ' qualifications');
      const availability = windows(personId + ' availability');
      const maxMinutes = numberField(personId + ' whole-horizon maximum');
      const restMinutes = numberField(personId + ' rest gap');
      if (!personId || rawQualifications === null || availability === null || maxMinutes === null || restMinutes === null) formComplete = false;
      people.push({
        id: personId, qualifications: split(rawQualifications || ''), windows: availability, maxMinutes, restMinutes
      });
    }
    const operating = windows('Operating'), maxNodes = numberField('Search allowance');
    if (!inputRows.length || !people.length || operating === null || maxNodes === null) formComplete = false;
    const candidateInput = formComplete ? { windows: operating, people, requests, maxNodes } : null;

    const nativeStatus = byId('result')?.dataset.status || null;
    const title = byId('result-title')?.textContent.trim() || '';
    const expectedTitle = {
      feasible: /^Feasible draft$/,
      infeasible: /^Infeasible over the allowed starts$/,
      invalid_input: /^Invalid input(?:: selected draft needs correction)?$/,
      search_limit_reached: /^Search limit reached$/
    }[nativeStatus];
    const displayedRows = [], assignments = [];
    let resultComplete = visible(byId('result')) && !!expectedTitle?.test(title);
    for (const row of [...(byId('draft-rows')?.rows || [])]) {
      const text = cells(row), requestId = text[0], select = row.querySelector('select');
      displayedRows.push({ cells: text, selectedValue: select?.value ?? null });
      if (!select) {
        if (text[2] !== 'No draft time' || text[3] !== 'No draft time') resultComplete = false;
        continue;
      }
      const start = integerText(select.value);
      const endMatch = /^(\d+) \(Day \d+, \+\d+ min\)$/.exec(text[3] || '');
      const end = endMatch ? integerText(endMatch[1]) : null;
      const membership = (text[1] || '').split(' / ');
      if (start === null || end === null || membership.length !== 2 ||
          select.getAttribute('aria-label') !== requestId + ' selected draft start') {
        resultComplete = false; continue;
      }
      assignments.push({ id: requestId, start, end, people: split(membership[0]), resources: split(membership[1]) });
    }
    if (!displayedRows.length || (nativeStatus === 'feasible' && assignments.length !== displayedRows.length)) resultComplete = false;
    // Invalid person-selected rows are a visible unaccepted proposal, not an accepted schedule.
    // Leave this interpretation to the evaluator rather than relabeling them as empty output.
    if (nativeStatus !== 'feasible' && assignments.length) resultComplete = false;
    const candidateResult = resultComplete ? {
      status: nativeStatus === 'search_limit_reached' ? 'budget_exhausted' : nativeStatus,
      assignments,
      source: 'CLI visible result title/status, selected option values, and rendered row cells',
      diagnostics: {
        title,
        summary: byId('result-summary')?.textContent.trim() || '',
        explanations: [...(byId('explanations')?.querySelectorAll('li') || [])].map(el => el.textContent.trim()),
        searchNote: byId('search-note')?.textContent.trim() || ''
      }
    } : null;
    const totalRows = [...(byId('totals')?.rows || [])].map(cells);
    const totalMap = {};
    let totalsComplete = true;
    for (const row of totalRows) {
      const value = integerText(row[2] || '');
      if (row.length !== 4 || Object.hasOwn(totalMap, row[0]) || value === null) totalsComplete = false;
      totalMap[row[0]] = value;
    }
    const candidateTotals = visible(byId('totals')) && totalsComplete && Object.keys(totalMap).length === 2 &&
      Number.isSafeInteger(totalMap.P01) && Number.isSafeInteger(totalMap.P02) ? totalMap : null;
    const reviewText = byId('review-state')?.textContent.trim() || '';
    const candidateReview = !visible(byId('review-state')) ? null : /^Current draft marked reviewed on this page\./.test(reviewText) ? true
      : /^Not reviewed\./.test(reviewText) ? false : null;
    return {
      candidateResult, candidateTotals, candidateReview, candidateInput,
      extraEvidence: {
        nativeStatus, title, reviewText, notice: byId('notice')?.textContent.trim() || '',
        formFields: fields, fixedRequestRows: inputRows.map(cells), displayedRows, totalRows,
        constraintsExpanded: byId('constraints')?.open === true,
        inputTypeLimit: 'Form-derived numeric values follow documented integer entry. Only a downloaded JSON roundtrip establishes serialized types, especially for imported digit strings.',
        resultIdentityLimit: 'Rendered person/room cells show the supplied fixed assignments. Compare them with actual downloaded result fields as a separate saved-data check.',
        portableReviewPolicy: 'The documented save format omits review. Every successful import clears review.',
        summaryCapability: 'No separate readable-summary export control in the inspected interface'
      }
    };
  });
}

async function openDetails(page, selector) {
  const details = page.locator(selector);
  if (await details.count() !== 1) throw new Error('Expected CLI disclosure is missing: ' + selector);
  if (!await details.evaluate(el => el.open)) await details.locator('summary').click();
}

export async function applyInput(page, input) {
  const priorObservation = await inspect(page);
  const current = priorObservation.candidateInput;
  const unsupported = [];
  if (!shape(input) || !current) return { ok: false, reason: 'CLI form cannot establish a complete canonical input', kind: 'Unsupported CLI input boundary', priorObservation };
  const nonnegative = n => Number.isSafeInteger(n) && n >= 0;
  const sameIds = (a, b) => equal(a.map(x => x.id).sort(), b.map(x => x.id).sort());
  if (!sameIds(input.requests, current.requests)) unsupported.push('Request IDs/count are fixed; duplicate-ID input needs the portable import boundary');
  if (!sameIds(input.people, current.people)) unsupported.push('Person IDs/count are fixed');
  if (input.windows.length !== current.windows.length) unsupported.push('Operating window add/remove is not exposed by the form');
  for (const r of input.requests) {
    const before = current.requests.find(x => x.id === r.id);
    if (!before) continue;
    if (!['people', 'resources', 'qualifications'].every(key => equal(r[key], before[key]))) unsupported.push(r.id + ': assigned people, rooms and required qualifications are fixed');
    if (!nonnegative(r.duration) || !Array.isArray(r.starts) || !r.starts.every(nonnegative)) unsupported.push(r.id + ': exact nonnumeric or negative JSON scalar types cannot be entered through this integer parser');
  }
  for (const p of input.people) {
    const before = current.people.find(x => x.id === p.id);
    if (!before) continue;
    if (!Array.isArray(p.windows) || p.windows.length !== before.windows.length) unsupported.push(p.id + ': availability window add/remove is not exposed by the form');
    if (!Array.isArray(p.qualifications) || p.qualifications.some(q => typeof q !== 'string' || q.includes(',') || q !== q.trim())) unsupported.push(p.id + ': qualification list cannot roundtrip through comma-separated controls');
    if (![p.maxMinutes, p.restMinutes].every(nonnegative)) unsupported.push(p.id + ': exact nonnumeric or negative limits cannot roundtrip');
  }
  if (!nonnegative(input.maxNodes) || [...input.windows, ...input.people.flatMap(p => p.windows || [])].some(w => !w || !nonnegative(w.start) || !nonnegative(w.end))) unsupported.push('Exact nonnumeric or negative window/search values cannot roundtrip');
  if (unsupported.length) return {
    ok: false, kind: 'Unsupported exact CLI form variant; no coercion or candidate-private state change attempted',
    reason: unsupported.join('; '), unsupported, priorObservation
  };
  await openDetails(page, '#constraints');
  const budgetDetails = page.locator('details').filter({ has: page.getByText('Evaluator search allowance', { exact: true }) });
  if (await budgetDetails.count() !== 1) return { ok: false, reason: 'No unique search-allowance disclosure', kind: 'Unsupported CLI input boundary', priorObservation };
  if (!await budgetDetails.evaluate(el => el.open)) await budgetDetails.locator('summary').click();
  const fields = [];
  for (const r of input.requests) {
    fields.push([r.id + ' duration', String(r.duration)], [r.id + ' allowed starts', r.starts.join(', ')]);
  }
  const windowFields = (prefix, windows) => windows.forEach((w, index) => {
    fields.push([prefix + ' window ' + (index + 1) + ' start', String(w.start)], [prefix + ' window ' + (index + 1) + ' end', String(w.end)]);
  });
  windowFields('Operating', input.windows);
  for (const p of input.people) {
    fields.push([p.id + ' qualifications', p.qualifications.join(', ')],
      [p.id + ' whole-horizon maximum', String(p.maxMinutes)], [p.id + ' rest gap', String(p.restMinutes)]);
    windowFields(p.id + ' availability', p.windows);
  }
  fields.push(['Search allowance', String(input.maxNodes)]);
  // Do not touch unchanged controls: doing so could clear review before the actual edit.
  for (const [label, value] of fields) {
    const control = page.getByLabel(label, { exact: true });
    if (await control.count() !== 1) return { ok: false, reason: 'Missing or ambiguous CLI form control: ' + label, kind: 'Unsupported CLI input boundary', priorObservation };
    if (await control.inputValue() !== value) await control.fill(value);
  }
  const after = await inspect(page);
  const ok = after.candidateInput !== null && equal(after.candidateInput, input);
  return {
    ok, mismatch: after.candidateInput !== null && !ok,
    kind: 'Actual labelled CLI input events and DOM readback; no save, import, or recheck action before review-state observation',
    priorObservation, immediateObservation: after,
    typeEvidenceLimit: 'Download and decode the actual JSON separately to establish serialized field types'
  };
}

export async function prepareReview(page) {
  // Expand inspectable constraints only; never mark review or recompute on the evaluator's behalf.
  await openDetails(page, '#constraints');
}
