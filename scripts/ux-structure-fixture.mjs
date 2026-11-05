/** Small real application shared by screen-structure browser regressions. */
export function uxStructureSpec(mode = 'pages') {
  return {
    schemaVersion: 2, audience: 'Schedule coordinators', primaryTask: 'Edit a schedule and resource availability',
    successOutcome: 'Each focused screen saves its own input and keeps it through navigation.',
    structure: { pattern: 'workspace', rationale: 'Schedule work and resource maintenance are separate tasks.', entryScreenId: 'schedule',
      navigation: 'Native Schedule and Resources links, with a Back control.', persistentElements: 'The application heading and navigation stay outside the active screen root.' },
    screens: [
      { id: 'schedule', name: 'Schedule', purpose: 'Edit the current schedule', primaryAction: 'Save schedule', route: '/index.html', selector: '#schedule',
        layout: 'Heading above one labeled input and save action.', secondaryContent: 'Advanced options are collapsed until requested.', narrowLayout: 'Input and action fit one column.' },
      { id: 'resources', name: 'Resources', purpose: 'Set resource capacity', primaryAction: 'Save capacity',
        route: mode === 'pages' ? '/resources.html?kind=crew#availability' : '/index.html#resources', selector: '#resources',
        layout: 'Heading above capacity input and save action.', secondaryContent: 'No secondary content.', narrowLayout: 'Input and action fit one column.' }
    ],
    states: { empty: 'An empty schedule input.', loading: 'The target screen is replacing the old screen.', error: 'A field-level error.', success: 'A saved confirmation.' },
    persistence: 'Save actual input values to localStorage.', recovery: 'Correct the input and save again.', keyboard: 'Use native links, labeled inputs and buttons.'
  };
}

export function uxStructureJourney() {
  return { id: 'focused-workspace', title: 'Navigate focused screens and retain actual edits', kind: 'primary', steps: [
    { action: 'expectScreen', screenId: 'schedule' },
    { action: 'expectHidden', selector: '#advanced-panel' },
    { action: 'fill', selector: '#title', value: 'Inspect pump' },
    { action: 'click', selector: '#save' },
    { action: 'expectText', selector: '#saved', text: 'Saved: Inspect pump' },
    { action: 'click', selector: '#nav-resources' },
    { action: 'expectScreen', screenId: 'resources' },
    { action: 'expectVisible', selector: '#navigation' },
    { action: 'expectHidden', selector: '#schedule' },
    { action: 'fill', selector: '#capacity', value: '7' },
    { action: 'click', selector: '#save-capacity' },
    { action: 'expectText', selector: '#capacity-saved', text: 'Capacity: 7' },
    { action: 'reload' },
    { action: 'expectScreen', screenId: 'resources' },
    { action: 'expectValue', selector: '#capacity', value: '7' },
    { action: 'click', selector: '#back' },
    { action: 'expectScreen', screenId: 'schedule' },
    { action: 'expectValue', selector: '#title', value: 'Inspect pump' },
    { action: 'click', selector: '#nav-resources' },
    { action: 'expectScreen', screenId: 'resources' },
    { action: 'expectValue', selector: '#capacity', value: '7' }
  ] };
}

export function uxStructureFiles({ mode = 'pages', stacked = false, duplicate = false } = {}) {
  const schedule = `<main id="schedule"><h1>Schedule</h1><label>Schedule title <input id="title"></label><button id="save">Save schedule</button><p id="saved">No saved schedule.</p>
    <button id="advanced-toggle">Advanced options</button><aside id="advanced-panel" hidden>Secondary controls</aside></main>`;
  const resources = `<main id="resources"><h1>Resources</h1><label>Capacity <input id="capacity" type="number"></label><button id="save-capacity">Save capacity</button><p id="capacity-saved">No saved capacity.</p></main>`;
  const html = content => `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Focused workspace</title>
    <style>*{box-sizing:border-box}body{font:16px system-ui;margin:0;padding:16px}nav{display:flex;flex-wrap:wrap;gap:16px}main{max-width:40rem}label{display:block;margin:20px 0}input{max-width:100%}button{padding:8px}p{overflow-wrap:anywhere}[hidden]{display:none!important}</style>
    <header><strong>Operations</strong><nav id="navigation" aria-label="Main"><a id="nav-schedule" href="index.html">Schedule</a><a id="nav-resources" href="${mode === 'pages' ? 'resources.html?kind=crew#availability' : '#resources'}">Resources</a><button id="back">Back</button></nav></header>
    ${content}${duplicate ? '<main id="schedule">Duplicate schedule root</main>' : ''}<script src="app.js"></script></html>`;
  const script = `const title=document.querySelector('#title'),capacity=document.querySelector('#capacity');
    if(title){title.value=localStorage.getItem('title')||'';document.querySelector('#save').onclick=()=>{localStorage.setItem('title',title.value);document.querySelector('#saved').textContent='Saved: '+title.value;};
      document.querySelector('#advanced-toggle').onclick=()=>{document.querySelector('#advanced-panel').hidden=!document.querySelector('#advanced-panel').hidden;};}
    if(capacity){capacity.value=localStorage.getItem('capacity')||'';document.querySelector('#save-capacity').onclick=()=>{localStorage.setItem('capacity',capacity.value);document.querySelector('#capacity-saved').textContent='Capacity: '+capacity.value;};}
    document.querySelector('#back').onclick=()=>history.back();
    ${mode === 'views' ? `const render=()=>{document.querySelector('#schedule').hidden=${stacked ? 'false' : "location.hash==='#resources'"};document.querySelector('#resources').hidden=${stacked ? 'false' : "location.hash!=='#resources'"};};
      render();addEventListener('hashchange',()=>setTimeout(render,100));` : ''}`;
  return mode === 'pages'
    ? { 'index.html': html(schedule + (stacked ? resources : '')), 'resources.html': html(resources), 'app.js': script }
    : { 'index.html': html(schedule + resources), 'app.js': script };
}
