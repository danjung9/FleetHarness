import { randomUUID } from 'node:crypto';
import type { Page } from 'playwright';
import type { BrowserJourney, UxSpec } from '../shared/quality.js';
import type { VisualViewport } from '../shared/visual-review.js';
import { readVisualCapture } from './visual-review.js';

export interface BrowserFlowControl {
  selector: string; tag: string; role: string; name: string;
  type?: string; href?: string; value?: string; disabled?: boolean; checked?: boolean;
  expanded?: string; selected?: string; readOnly?: boolean;
  ariaChecked?: string; pressed?: string;
  inViewport?: boolean;
  options?: { value: string; label: string }[];
}
export interface BrowserFlowDom {
  route: string; pageText: string; headings: string[]; controls: BrowserFlowControl[];
  /** Rendered controls before the viewport-prioritized inventory cap. */
  controlCount?: number;
  screens: { id: string; route: string; selector: string; count: number; visible: boolean }[];
  screenIds: string[];
  /** Individual text nodes let us ignore content already changing before an action. */
  content: { selector: string; text: string }[];
}
export interface BrowserFlowObservation extends BrowserFlowDom {
  id: string; generationId: string; openedViewport: VisualViewport; viewport: VisualViewport;
  action: string; filesHash: string; screenshot: string; screenshotHash: string; capturedAt: string; errors: string[];
  /** Host-computed control path from a clean manual open, never supplied by callers. */
  reachable: boolean;
  parentId?: string;
}
export interface BrowserFlowTransition {
  id: string; from: string; to: string; action: string; control?: BrowserFlowControl;
  grounded: boolean; status: 'changed' | 'unchanged' | 'failed' | 'ungrounded'; changes: string[];
}
export interface BrowserFlowReport {
  schemaVersion: 1; sessionId: string;
  observations: BrowserFlowObservation[]; transitions: BrowserFlowTransition[];
  requiredScreens: { journeyId: string; screenIds: string[] }[];
}
export interface BrowserFlowAction { action: string; selector?: string; key?: string }
export interface BrowserFlowAttempt {
  from: BrowserFlowObservation; before: BrowserFlowDom; input: BrowserFlowAction;
  control?: BrowserFlowControl; grounded: boolean; ignoredText: Set<string>; startedAt: number;
}

/** Fixed host-authored extraction. Routes come from the browser; only a trusted
 * runtime mount is stripped. No navigation or executable code is agent supplied. */
export async function observeBrowserFlow(page: Page, ux?: UxSpec, routeBase = ''): Promise<BrowserFlowDom> {
  if (routeBase && (!routeBase.startsWith('/') || routeBase.startsWith('//') || routeBase.endsWith('/') || /[\\\s?#]/.test(routeBase)
    || new URL(routeBase, 'http://127.0.0.1').pathname !== routeBase)) throw new Error('Invalid host runtime route base.');
  return page.evaluate(({ roots, mount }) => {
    const compact = (value: string | null | undefined, size = 180) => (value ?? '').replace(/\s+/g, ' ').trim().slice(0, size);
    const visible = (element: Element): boolean => {
      const style = getComputedStyle(element);
      if (style.display === 'contents') return Array.from(element.childNodes).some(child => {
        if (child.nodeType === Node.ELEMENT_NODE) return visible(child as Element);
        if (child.nodeType !== Node.TEXT_NODE) return false;
        const range = document.createRange(); range.selectNode(child);
        const box = range.getBoundingClientRect(); return box.width > 0 && box.height > 0;
      });
      if (!element.checkVisibility() || style.visibility !== 'visible') return false;
      const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0;
    };
    const selectorFor = (element: Element) => {
      const parts: string[] = [];
      let node: Element | null = element;
      for (let depth = 0; node && depth < 12; depth++, node = node.parentElement) {
        if (node.id && document.querySelectorAll('#' + CSS.escape(node.id)).length === 1) { parts.unshift('#' + CSS.escape(node.id)); break; }
        const tag = node.localName;
        const index = Array.from(node.parentElement?.children ?? []).filter(sibling => sibling.localName === tag).indexOf(node) + 1;
        parts.unshift(tag + (index ? ':nth-of-type(' + index + ')' : ''));
      }
      return parts.join(' > ').slice(0, 1000);
    };
    const interactiveRoles = ['button', 'link', 'checkbox', 'radio', 'combobox', 'listbox', 'option', 'switch', 'slider', 'spinbutton', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'treeitem', 'searchbox', 'textbox'];
    const selector = 'button,input,textarea,select,a[href],summary,[contenteditable="true"],' + interactiveRoles.map(role => '[role="' + role + '"]').join(',');
    const inViewport = (element: Element) => { const box = element.getBoundingClientRect(); return box.bottom > 0 && box.right > 0 && box.top < innerHeight && box.left < innerWidth; };
    const renderedControls = Array.from(document.querySelectorAll(selector)).filter(visible);
    // Scrolling must reveal new selectors even on long tables with >80 controls.
    const controls = [...renderedControls.filter(inViewport), ...renderedControls.filter(element => !inViewport(element))].slice(0, 80).map(element => {
        const input = element as HTMLInputElement;
        const labels = input.labels ? Array.from(input.labels).map(label => label.textContent ?? '').join(' ') : '';
        const labelledBy = (element.getAttribute('aria-labelledby') ?? '').split(/\s+/).slice(0, 8).map(id => document.getElementById(id)?.textContent ?? '').join(' ');
        const name = compact(element.getAttribute('aria-label') || labelledBy.trim() || labels || element.getAttribute('placeholder') || element.textContent || element.getAttribute('title'));
        return { selector: selectorFor(element), tag: element.localName, role: compact(element.getAttribute('role')), name, inViewport: inViewport(element),
          ...(input.type ? { type: compact(input.type) } : {}),
          ...(element.hasAttribute('href') ? { href: compact(element.getAttribute('href'), 1000) } : {}),
          ...(input.value !== undefined && input.type !== 'password' ? { value: compact(input.value, 300) } : {}),
          ...(element.matches(':disabled') || element.closest('[inert],[aria-disabled="true"]') ? { disabled: true } : {}),
          ...(input.readOnly ? { readOnly: true } : {}),
          ...(input.type === 'checkbox' || input.type === 'radio' ? { checked: input.checked } : {}),
          ...(element.hasAttribute('aria-expanded') ? { expanded: element.getAttribute('aria-expanded')! } : {}),
          ...(element.hasAttribute('aria-selected') ? { selected: element.getAttribute('aria-selected')! } : {}),
          ...(element.hasAttribute('aria-checked') ? { ariaChecked: element.getAttribute('aria-checked')! } : {}),
          ...(element.hasAttribute('aria-pressed') ? { pressed: element.getAttribute('aria-pressed')! } : {}),
          ...(element.localName === 'select' ? { options: Array.from((element as HTMLSelectElement).options).slice(0, 30).map(option => ({ value: compact(option.value), label: compact(option.label) })) } : {}) };
      });
    const actualRoute = location.pathname + location.search + location.hash;
    const route = mount && (location.pathname === mount || location.pathname.startsWith(mount + '/')) ? actualRoute.slice(mount.length) : actualRoute;
    const screens = roots.map(root => {
      const elements = Array.from(document.querySelectorAll(root.selector));
      return { ...root, count: elements.length, visible: elements.length === 1 && visible(elements[0]) };
    });
    const active = screens.filter(screen => screen.visible);
    const screenIds = active.length === 1 && screens.every(screen => screen.count <= 1) && active[0].route === route ? [active[0].id] : [];
    const content: { selector: string; text: string }[] = [];
    const walker = document.createTreeWalker(document.body ?? document.documentElement, NodeFilter.SHOW_TEXT);
    let node: Node | null, examined = 0;
    while ((node = walker.nextNode()) && examined++ < 4000 && content.length < 160) {
      const parent = node.parentElement;
      if (!parent || !visible(parent) || parent.closest('script,style,noscript,textarea,select,[contenteditable="true"],time,[role="timer"]')) continue;
      const value = compact(node.textContent, 500);
      if (!value) continue;
      const selector = selectorFor(parent) + '::text(' + Array.from(parent.childNodes).indexOf(node as ChildNode) + ')';
      content.push({ selector, text: value });
    }
    return { route, pageText: compact(document.body?.innerText, 12_000), controls, controlCount: renderedControls.length, screens, screenIds, content,
      headings: Array.from(document.querySelectorAll('h1,h2,h3,[role="heading"]')).filter(visible).slice(0, 30).map(element => compact(element.textContent, 300)) };
  }, { roots: ux?.schemaVersion === 2 ? ux.screens.map(({ id, route, selector }) => ({ id, route, selector })) : [], mount: routeBase });
}

const identity = ({ selector, tag, role, name, type, href }: BrowserFlowControl) => JSON.stringify({ selector, tag, role, name, type, href });
const activation = (input: BrowserFlowAction) => ['click', 'select'].includes(input.action)
  || input.action === 'press' && /^(?:(?:Control|Meta|Alt|Shift)\+)*(?:Enter|Space| |ArrowLeft|ArrowRight|ArrowUp|ArrowDown)$/.test(input.key ?? '');
const changedText = (before: BrowserFlowDom, after: BrowserFlowDom) => {
  const old = new Map(before.content.map(item => [item.selector, item.text]));
  const current = new Map(after.content.map(item => [item.selector, item.text]));
  return new Set([...old.keys(), ...current.keys()].filter(selector => old.get(selector) !== current.get(selector)));
};

/** Focus, hover, scroll position and the target's direct value echo cannot prove
 * flow. Content, active routes/roots, disclosures, toggles and other output fields
 * can. Already volatile text (for example a ticking clock) is excluded. This is
 * observed interaction evidence; frozen journeys still decide correctness. */
function semanticChanges(attempt: BrowserFlowAttempt, after: BrowserFlowDom): string[] {
  const before = attempt.before, changes: string[] = [];
  if (before.route !== after.route) changes.push('route');
  if (JSON.stringify(before.screenIds) !== JSON.stringify(after.screenIds)) changes.push('active screen');
  const beforeCount = before.controlCount ?? before.controls.length, afterCount = after.controlCount ?? after.controls.length;
  const capped = beforeCount > before.controls.length || afterCount > after.controls.length;
  const shared = new Set(before.controls.filter(control => after.controls.some(candidate => candidate.selector === control.selector)).map(control => control.selector));
  // Playwright can scroll a clicked control into view. On long pages that moves
  // the capped inventory window without changing the application. Compare only
  // shared controls when capped; the uncapped rendered count still proves real
  // disclosures/additions/removals, and shared state/output changes still count.
  const controls = (dom: BrowserFlowDom) => dom.controls.filter(control => !capped || shared.has(control.selector)).map(control => {
    const { value, inViewport, ...rest } = control;
    return control.selector === attempt.input.selector ? rest : { ...rest, ...(value !== undefined ? { value } : {}) };
  }).sort((a, b) => a.selector.localeCompare(b.selector));
  if (beforeCount !== afterCount || JSON.stringify(controls(before)) !== JSON.stringify(controls(after))) changes.push('controls or output values');
  if ([...changedText(before, after)].some(selector => !attempt.ignoredText.has(selector))) changes.push('visible content');
  return changes;
}

/** Session-local host authority. Never imports editable flow.json as evidence. */
export class BrowserFlowLedger {
  private state: BrowserFlowReport;
  private pending?: { attempt: BrowserFlowAttempt; edgeId: string };
  constructor(private readonly root: string, journeys: BrowserJourney[]) {
    this.state = { schemaVersion: 1, sessionId: randomUUID(), observations: [], transitions: [],
      requiredScreens: journeys.map(journey => ({ journeyId: journey.id, screenIds: [...new Set(journey.steps.flatMap(step => step.action === 'expectScreen' ? [step.screenId] : []))] })) };
  }
  report(): BrowserFlowReport { return structuredClone(this.state); }
  clearPending() { this.pending = undefined; }
  latest(generationId: string) { return this.state.observations.findLast(node => node.generationId === generationId); }
  begin(generationId: string, viewport: VisualViewport, input: BrowserFlowAction, before: BrowserFlowDom): BrowserFlowAttempt | undefined {
    this.clearPending();
    const from = this.latest(generationId);
    if (!from) return undefined;
    const observed = from.controls.find(control => control.selector === input.selector);
    const current = before.controls.find(control => control.selector === input.selector);
    return { from, before, input, ...(current ? { control: structuredClone(current) } : {}),
      grounded: from.reachable && from.viewport === viewport && from.openedViewport === viewport && !from.errors.length && Boolean(observed && current && !current.disabled && identity(observed) === identity(current))
        && from.route === before.route && JSON.stringify(from.screenIds) === JSON.stringify(before.screenIds),
      ignoredText: changedText(from, before), startedAt: Date.now() };
  }
  record(input: Omit<BrowserFlowObservation, 'reachable' | 'parentId'>, attempt?: BrowserFlowAttempt) {
    if (this.state.observations.length >= 100) throw new Error('UI flow observation limit reached.');
    if (Buffer.byteLength(JSON.stringify(this.state)) + Buffer.byteLength(JSON.stringify(input)) + 4000 > 4_000_000) throw new Error('UI flow evidence reached its 4 MB limit.');
    const prior = this.latest(input.generationId);
    const pending = this.pending?.attempt;
    const sameContext = (other: BrowserFlowObservation) => other.generationId === input.generationId && other.viewport === input.viewport && other.filesHash === input.filesHash;
    const pendingValid = Boolean(pending && pending.from.reachable && sameContext(pending.from) && input.action === 'screenshot' && Date.now() - pending.startedAt <= 10_000);
    const clean = !input.errors.length && input.openedViewport === input.viewport;
    const reachable = clean && (input.action === 'open' || (attempt ? attempt.grounded && attempt.from.reachable && sameContext(attempt.from)
      : Boolean(prior?.reachable && sameContext(prior) && ['screenshot', 'scroll'].includes(input.action)
        && (pendingValid || prior.route === input.route && JSON.stringify(prior.screenIds) === JSON.stringify(input.screenIds)))));
    const node: BrowserFlowObservation = { ...input, reachable, ...(prior ? { parentId: prior.id } : {}) };
    this.state.observations.push(structuredClone(node));
    if (attempt) {
      const changes = attempt.grounded && node.reachable ? semanticChanges(attempt, node) : [];
      const edge: BrowserFlowTransition = { id: randomUUID(), from: attempt.from.id, to: node.id, action: attempt.input.action,
        ...(attempt.control ? { control: structuredClone(attempt.control) } : {}), grounded: attempt.grounded,
        status: node.errors.length ? 'failed' : !attempt.grounded ? 'ungrounded' : activation(attempt.input) && changes.length ? 'changed' : 'unchanged', changes };
      this.state.transitions.push(edge);
      if (edge.grounded && edge.status === 'unchanged' && activation(attempt.input)) this.pending = { attempt, edgeId: edge.id };
    } else if (this.pending) {
      const { attempt: pending, edgeId } = this.pending;
      if (!node.reachable || node.errors.length || node.generationId !== pending.from.generationId || node.viewport !== pending.from.viewport || node.openedViewport !== node.viewport
        || node.filesHash !== pending.from.filesHash || Date.now() - pending.startedAt > 10_000 || node.action !== 'screenshot') this.clearPending();
      else {
        const changes = semanticChanges(pending, node);
        if (changes.length) {
          const edge = this.state.transitions.find(item => item.id === edgeId)!;
          edge.to = node.id; edge.status = 'changed'; edge.changes = changes; this.clearPending();
        }
      }
    }
  }
  progress() {
    return { observations: this.state.observations.length, transitions: this.state.transitions.filter(edge => edge.status === 'changed').length,
      viewports: (['desktop', 'narrow'] as const).map(viewport => ({ viewport,
        screenIds: [...new Set(this.state.observations.filter(node => node.viewport === viewport && node.reachable).flatMap(node => node.screenIds))],
        transitionIds: this.state.transitions.filter(edge => edge.status === 'changed' && this.state.observations.some(node => node.id === edge.to && node.viewport === viewport)).map(edge => edge.id) })) };
  }
  frontier() {
    const latest = this.state.observations.at(-1);
    if (!latest) return [];
    const tried = new Set(this.state.transitions.filter(edge => edge.from === latest.id || this.state.observations.some(node => node.id === edge.from && node.generationId === latest.generationId && node.route === latest.route))
      .flatMap(edge => edge.control ? [identity(edge.control)] : []));
    return latest.controls.filter(control => !control.disabled && !tried.has(identity(control)));
  }
  async problems(filesHash: string, journeyIds?: readonly string[]): Promise<string[]> {
    const selected = journeyIds ?? this.state.requiredScreens.map(item => item.journeyId);
    const problems: string[] = [];
    for (const id of selected) if (!this.state.requiredScreens.some(item => item.journeyId === id)) problems.push('Unknown frozen UI flow journey: ' + id + '.');
    const required = [...new Set(this.state.requiredScreens.filter(item => selected.includes(item.journeyId)).flatMap(item => item.screenIds))];
    const valid = new Set<string>();
    for (const node of this.state.observations.filter(node => node.filesHash === filesHash && node.reachable && !node.errors.length && node.viewport === node.openedViewport)) {
      try {
        await readVisualCapture(this.root, { sessionId: this.state.sessionId, stage: 'build', sequence: 1, ...node });
        // A later valid PNG cannot launder a deleted/changed intermediate step.
        // Observations are appended in execution order, so ancestry is validated
        // from each clean open before any descendant contributes coverage.
        if (node.action === 'open' || node.parentId && valid.has(node.parentId)) valid.add(node.id);
      } catch { /* Invalid bytes cannot supply a screen or transition proof. */ }
    }
    for (const viewport of ['desktop', 'narrow'] as const) {
      const opens = this.state.observations.filter(node => node.viewport === viewport && node.action === 'open' && valid.has(node.id));
      const generations = new Set(opens.map(node => node.generationId));
      const nodes = this.state.observations.filter(node => node.viewport === viewport && valid.has(node.id) && generations.has(node.generationId));
      if (!opens.length) problems.push(`UI flow ${viewport}: open the current application in a fresh manual browser session and inspect its screenshot and controls.`);
      if (!this.state.transitions.some(edge => edge.grounded && edge.status === 'changed' && valid.has(edge.from) && nodes.some(node => node.id === edge.to))) {
        problems.push(`UI flow ${viewport}: activate an observed visible control and inspect a resulting content, screen, route, disclosure or output change. Frozen journey replay and input echo do not count.`);
      }
      for (const id of required) if (!nodes.some(node => node.screenIds.includes(id))) problems.push(`UI flow ${viewport}: manually reach and inspect planned screen ${id} through the observed application controls.`);
    }
    return problems;
  }
}
