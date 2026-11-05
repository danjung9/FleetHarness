import { stubCodexGoalLaunch } from './codex-goal-smoke-fixture.mjs';
import { _electron as electron } from 'playwright';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { startConversationFixture, researchQuestion, researchTextQuestion, planningQuestion, researchAnswer, researchTextAnswer, planningAnswer, planningSecondAnswer } from './conversation-fixture.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fleet-conversation-smoke-'));
const output = path.resolve('output/playwright/conversation');
await fs.mkdir(output, { recursive: true });
const piDir = path.join(root, 'pi'); await fs.mkdir(piDir);
const fixture = await startConversationFixture();
await fs.writeFile(path.join(piDir, 'models.json'), JSON.stringify({ providers: { 'fleet-fixture': {
  baseUrl: fixture.baseUrl, api: 'openai-completions', apiKey: 'local-fixture-only',
  models: [{ id: 'fixture-model', name: 'Local conversation fixture', reasoning: false, input: ['text', 'image'], contextWindow: 64000, maxTokens: 8000, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } }]
} } }));
const title = 'Conversation smoke fixture';
const planningDetails = 'Keep the source text readable next to every extracted task.';
let app, page, projectId;
const errors = [], captures = [];
const project = () => page.evaluate(async id => (await window.fleetHarness.bootstrap()).state.projects.find(item => item.id === id), projectId);
async function until(predicate, label, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { const value = await predicate(); if (value) return value; await delay(75); }
  throw new Error(`Timed out waiting for ${label}`);
}
async function stateWhere(predicate, label, timeout) { return until(async () => { const state = await project(); return predicate(state) ? state : false; }, label, timeout); }
async function size(width, height) { await app.evaluate(({ BrowserWindow }, dimensions) => BrowserWindow.getAllWindows()[0].setContentSize(...dimensions), [width, height]); }
async function capture(name) {
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(1, 1);
  const overflow = await page.evaluate(() => ['html', '.app-shell', '.workspace', '.conversation-panel', '.conversation-composer-area'].flatMap(selector => [...document.querySelectorAll(selector)].filter(element => element.clientWidth && element.scrollWidth > element.clientWidth + 1).map(element => ({ selector, width: element.clientWidth, content: element.scrollWidth }))));
  assert.deepEqual(overflow, [], `${name}: no outer horizontal overflow`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 1), false, 'Scroll remains inside the app');
  const viewport = await page.evaluate(() => [innerWidth, innerHeight]);
  await page.screenshot({ path: path.join(output, name + '.png'), scale: 'css', animations: 'disabled' });
  captures.push({ name, width: viewport[0], height: viewport[1] });
}
async function openLead() {
  if (!await page.locator('.conversation-panel').count()) await page.getByRole('button', { name: /^Project lead(?:,|$)/ }).click();
  await page.getByRole('complementary', { name: 'Project lead', exact: true }).waitFor();
}
async function send(text) {
  await openLead();
  await page.getByLabel('Message Project lead', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  return stateWhere(state => state.conversation?.messages.some(message => message.role === 'user' && message.text === text) && state.conversation?.status === 'idle', 'completed project lead reply');
}
async function paused(phase) {
  return stateWhere(state => state.status === 'running' && state.conversation?.questions.some(question => question.phase === phase && question.runId === state.runId && question.status === 'pending') && state.logs.some(log => log.stage === phase && log.text.includes('model session is closed')), `${phase} human wait`);
}
async function noCallsWhileWaiting() {
  const count = fixture.requests.length; await delay(450);
  assert.equal(fixture.requests.length, count, 'Waiting for a human answer makes no additional provider requests');
}
const questionForm = question => page.getByRole('form', { name: question, exact: true });
const answerButton = question => questionForm(question).getByRole('button', { name: 'Send answer & continue', exact: true });
async function reopenProject() {
  await page.reload(); await page.locator('.app-shell').waitFor();
  await page.getByRole('button', { name: new RegExp('^' + title) }).click();
  await openLead();
}
async function captureQuestion(question, name) {
  for (const [width, height, suffix] of [[1512, 982, ''], [1120, 720, '-minimum']]) {
    await size(width, height);
    const form = questionForm(question);
    await form.evaluate(element => element.scrollIntoView({ block: 'start' })); await capture(name + suffix);
    const choices = form.locator('.conversation-options');
    if (await choices.count()) {
      await choices.scrollIntoViewIfNeeded(); await capture(name + suffix + '-options');
    }
    await form.locator('.conversation-answer-field').evaluate(element => element.scrollIntoView({ block: 'start' }));
    await capture(name + suffix + '-answer');
  }
  await size(1512, 982);
}
function answersInRequest(request) {
  const prompt = request.body.messages.filter(message => message.role === 'user').map(message => typeof message.content === 'string' ? message.content : (message.content ?? []).map(part => part.text ?? '').join('\n')).join('\n');
  const context = prompt.split('User clarification answers for this run')[1];
  const json = context?.match(/\n(\[\n[\s\S]*?\n\])/);
  return json ? JSON.parse(json[1]) : [];
}

try {
  const executablePath = process.env.FLEET_EXECUTABLE;
  app = await electron.launch({ ...(executablePath ? { executablePath, args: [] } : { args: ['.'] }), env: { ...process.env, FLEET_USER_DATA: path.join(root, 'state'), PI_CODING_AGENT_DIR: piDir, VITE_DEV_SERVER_URL: '' }, timeout: 45000 });
  page = await app.firstWindow(); page.on('pageerror', error => errors.push(error.message));
  await stubCodexGoalLaunch(app);
  await app.evaluate(({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows()[0]; window.webContents.setBackgroundThrottling(false); window.hide(); window.setContentSize(1512, 982); });
  await page.locator('.app-shell').waitFor({ timeout: 45000 });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('radio', { name: 'Pi Model providers' }).check();
  await page.getByLabel('Provider', { exact: true }).selectOption('fleet-fixture');
  await page.getByRole('button', { name: 'Save model settings', exact: true }).click();
  await page.getByText('Model settings saved.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'New challenge', exact: true }).click();
  const intake = page.getByRole('dialog', { name: 'New challenge', exact: true });
  await intake.getByLabel('Challenge title', { exact: true }).fill(title);
  await intake.getByLabel(/^Problem statement(?:\s|$)/).fill('Create a local synthetic message parser so a reviewer can inspect extracted tasks and their sources.');
  await intake.getByLabel('Evaluation criteria (optional)', { exact: false }).fill('Parse a synthetic task and recover from empty input.');
  await intake.getByRole('button', { name: 'Save challenge', exact: true }).click();
  await page.getByText('Challenge saved.', { exact: true }).waitFor();
  projectId = await page.evaluate(async () => (await window.fleetHarness.bootstrap()).state.projects[0].id);
  await openLead();
  await page.getByLabel('Message Project lead', { exact: true }).fill('Help me clarify this brief.');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await stateWhere(state => state.conversation?.status === 'responding' && state.conversation.messages.at(-1)?.text.startsWith('Your brief describes'), 'streamed partial assistant reply');
  await page.getByRole('button', { name: 'Cancel reply', exact: true }).waitFor();
  await stateWhere(state => state.conversation?.status === 'idle', 'first reply completion');
  await page.getByRole('log', { name: 'Project conversation' }).getByText(/keep your decisions here across builds/).waitFor();
  assert.match(await page.getByRole('log', { name: 'Project conversation' }).innerText(), /keep your decisions here across builds/);
  assert.equal(await page.getByLabel('Message Project lead', { exact: true }).inputValue(), '');
  await capture('desktop');
  await size(1120, 720); await capture('minimum');
  await page.getByLabel('Message Project lead', { exact: true }).focus();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.conversation-panel').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Project lead', exact: true }).evaluate(element => element === document.activeElement), true, 'Escape restores focus to the opener');
  await size(1512, 982);

  await send('Start the build.');
  const startProposal = (await project()).conversation.actions.at(-1);
  assert.equal(startProposal.type, 'start'); assert.equal(startProposal.status, 'proposed');
  await page.getByRole('button', { name: 'Start fresh build', exact: true }).click();
  const researching = await paused('research');
  assert.equal(researching.conversation.actions.find(action => action.id === startProposal.id).status, 'applied');
  await noCallsWhileWaiting();
  const requirements = await fs.readFile(path.join(researching.workspace, 'requirements.md'), 'utf8');
  const firstRunId = researching.runId;
  await openLead();
  await page.getByRole('button', { name: '2 questions are waiting for your answer', exact: true }).click();
  await questionForm(researchQuestion).waitFor();
  await questionForm(researchTextQuestion).waitFor();
  assert.equal(await answerButton(researchQuestion).isDisabled(), true, 'An unanswered single-choice question cannot be submitted');
  assert.equal(await answerButton(researchTextQuestion).isDisabled(), true, 'An empty written answer cannot be submitted');
  assert.equal(await questionForm(researchQuestion).getByRole('radio').count(), 2);
  assert.equal(await questionForm(researchQuestion).locator('input:checked').count(), 0, 'Recommendations do not preselect an answer');
  assert.equal(await questionForm(researchTextQuestion).getByRole('radio').count(), 0);
  assert.equal(await questionForm(researchTextQuestion).getByRole('checkbox').count(), 0);
  await questionForm(researchQuestion).getByRole('radio', { name: 'A team of analysts', exact: true }).check();
  await questionForm(researchQuestion).getByRole('radio', { name: researchAnswer, exact: true }).check();
  assert.equal(await questionForm(researchQuestion).getByRole('radio', { name: 'A team of analysts', exact: true }).isChecked(), false, 'Single-choice selection stays exclusive');
  await questionForm(researchQuestion).getByRole('button', { name: 'Clear selection', exact: true }).click();
  assert.equal(await questionForm(researchQuestion).locator('input:checked').count(), 0, 'A user can clear the suggested choices');
  assert.equal(await answerButton(researchQuestion).isDisabled(), true);
  await questionForm(researchQuestion).getByLabel('Additional details or your own answer', { exact: true }).fill('A reviewer handling shift handoffs');
  assert.equal(await answerButton(researchQuestion).isEnabled(), true, 'A choice question accepts a custom answer without a selection');
  await questionForm(researchQuestion).getByLabel('Additional details or your own answer', { exact: true }).fill('');
  await questionForm(researchQuestion).getByRole('radio', { name: researchAnswer, exact: true }).check();
  await questionForm(researchTextQuestion).getByLabel('Your answer', { exact: true }).fill('   ');
  assert.equal(await answerButton(researchTextQuestion).isDisabled(), true, 'Whitespace is not a written answer');
  await questionForm(researchTextQuestion).getByLabel('Your answer', { exact: true }).fill(researchTextAnswer);
  assert.equal((await project()).conversation.questions.filter(question => question.status === 'pending').length, 2, 'Editing answers never submits them');
  await noCallsWhileWaiting();
  await reopenProject();
  assert.match(await page.getByRole('log', { name: 'Project conversation' }).innerText(), /Help me clarify this brief/);
  assert.equal(await questionForm(researchQuestion).getByRole('radio', { name: researchAnswer, exact: true }).isChecked(), true, 'Single-choice selection survives renderer reload');
  assert.equal(await questionForm(researchTextQuestion).getByLabel('Your answer', { exact: true }).inputValue(), researchTextAnswer, 'Written answer draft survives renderer reload');
  await captureQuestion(researchQuestion, 'question');
  await captureQuestion(researchTextQuestion, 'question-text');
  await answerButton(researchQuestion).click();
  const partiallyAnswered = await stateWhere(state => state.conversation.questions.find(question => question.question === researchQuestion)?.status === 'answered' && state.conversation.questions.find(question => question.question === researchTextQuestion)?.status === 'pending', 'partially answered research round');
  assert.equal(partiallyAnswered.stages.find(stage => stage.id === 'research').status, 'active');
  assert.equal(partiallyAnswered.conversation.questions.some(question => question.phase === 'plan'), false, 'Planning does not start while a research question remains unanswered');
  assert.deepEqual(partiallyAnswered.conversation.questions.find(question => question.question === researchQuestion).response, { selectedOptions: [researchAnswer], text: '' });
  await noCallsWhileWaiting();
  assert.equal(await questionForm(researchTextQuestion).getByLabel('Your answer', { exact: true }).inputValue(), researchTextAnswer, 'Submitting a sibling question preserves the remaining draft');
  await answerButton(researchTextQuestion).click();
  const planning = await paused('plan'); await noCallsWhileWaiting();
  assert.equal(planning.conversation.questions.find(question => question.question === researchQuestion).answer, researchAnswer);
  assert.equal(planning.conversation.questions.find(question => question.question === researchTextQuestion).answer, researchTextAnswer);
  assert.deepEqual(planning.conversation.questions.find(question => question.question === researchTextQuestion).response, { selectedOptions: [], text: researchTextAnswer });
  assert.equal(planning.conversation.questions.find(question => question.phase === 'plan').status, 'pending');
  await assert.rejects(fs.access(path.join(planning.workspace, 'acceptance-plan.json')), /ENOENT/, 'Planning contracts are not frozen while a question is pending');
  await questionForm(planningQuestion).waitFor();
  assert.equal(await answerButton(planningQuestion).isDisabled(), true, 'An empty multiple-choice answer cannot be submitted');
  assert.equal(await questionForm(planningQuestion).getByRole('checkbox').count(), 3);
  assert.equal(await questionForm(planningQuestion).getByRole('radio').count(), 0);
  assert.equal(await questionForm(planningQuestion).locator('input:checked').count(), 0, 'Multiple-choice recommendations do not preselect answers');
  await questionForm(planningQuestion).getByRole('checkbox', { name: planningSecondAnswer, exact: true }).check();
  await questionForm(planningQuestion).getByRole('checkbox', { name: planningAnswer, exact: true }).check();
  await questionForm(planningQuestion).getByLabel('Additional details or your own answer', { exact: true }).fill(planningDetails);
  assert.equal((await project()).conversation.questions.find(question => question.question === planningQuestion).status, 'pending', 'Selecting several options and adding context does not submit');
  await noCallsWhileWaiting();
  await reopenProject();
  assert.equal(await questionForm(planningQuestion).getByRole('checkbox', { name: planningAnswer, exact: true }).isChecked(), true, 'First selected option survives renderer reload');
  assert.equal(await questionForm(planningQuestion).getByRole('checkbox', { name: planningSecondAnswer, exact: true }).isChecked(), true, 'Second selected option survives renderer reload');
  assert.equal(await questionForm(planningQuestion).getByRole('checkbox', { name: 'A summary without source text', exact: true }).isChecked(), false);
  assert.equal(await questionForm(planningQuestion).getByLabel('Additional details or your own answer', { exact: true }).inputValue(), planningDetails, 'Additional context survives renderer reload');
  await captureQuestion(planningQuestion, 'question-multiple-choice');
  await answerButton(planningQuestion).click();
  await until(() => fixture.buildWaiting, 'first build request after contract freeze');
  const building = await project();
  const protectedFiles = ['requirements.md', 'acceptance-plan.json', 'ux-spec.json', 'solution-contract.json', 'foundation-plan.json', 'clarifications.json'];
  const frozen = Object.fromEntries(await Promise.all(protectedFiles.map(async file => [file, await fs.readFile(path.join(building.workspace, file), 'utf8')])));
  assert.equal(frozen['requirements.md'], requirements);
  const frozenQuestions = JSON.parse(frozen['clarifications.json']).questions;
  assert.equal(frozenQuestions.length, 3);
  const expectedAnswers = [
    { question: researchQuestion, answerType: 'single_choice', response: { selectedOptions: [researchAnswer], text: '' } },
    { question: researchTextQuestion, answerType: 'text', response: { selectedOptions: [], text: researchTextAnswer } },
    { question: planningQuestion, answerType: 'multiple_choice', response: { selectedOptions: [planningAnswer, planningSecondAnswer], text: planningDetails } }
  ];
  for (const expected of expectedAnswers) {
    const saved = frozenQuestions.find(question => question.question === expected.question);
    assert.equal(saved.answerType, expected.answerType, `${expected.answerType} is recorded in the frozen artifact`);
    assert.deepEqual(saved.response, expected.response, `${expected.answerType} response is recorded without losing selections or context`);
  }
  await assert.rejects(fs.access(path.join(building.workspace, 'evaluation-plan.json')), /ENOENT/, 'Evaluation answer keys remain sealed from the builder');
  fixture.releaseBuild();
  const complete = await stateWhere(state => state.status !== 'running', 'verified fixture build', 90_000);
  assert.equal(complete.status, 'review', complete.error); assert.equal(complete.report.quality.status, 'passed');
  for (const file of protectedFiles) assert.equal(await fs.readFile(path.join(complete.workspace, file), 'utf8'), frozen[file], `${file} survives build and repair unchanged`);
  assert.ok(fixture.requests.some(request => !request.coordinator && request.phase === 'research' && JSON.stringify(request.body).includes(researchAnswer)), 'Research receives its answer in a fresh session');
  assert.ok(fixture.requests.some(request => !request.coordinator && request.phase === 'plan' && JSON.stringify(request.body).includes(planningAnswer)), 'Planning receives its answer before freezing contracts');
  for (const expected of expectedAnswers) {
    const phase = expected.answerType === 'multiple_choice' ? 'plan' : 'research';
    const routed = fixture.requests.filter(request => !request.coordinator && request.phase === phase).flatMap(answersInRequest).find(question => question.question === expected.question);
    assert.ok(routed, `${phase} resumes with the ${expected.answerType} answer`);
    assert.equal(routed.answerType, expected.answerType);
    assert.deepEqual(routed.response, expected.response, `${phase} receives structured selections and written context`);
  }

  await send('Revise the brief to emphasize source provenance.');
  const revision = (await project()).conversation.actions.at(-1);
  assert.equal(revision.type, 'revise');
  await page.locator('.conversation-action').last().scrollIntoViewIfNeeded(); await capture('proposal');
  await page.getByRole('button', { name: 'Update brief & build', exact: true }).click();
  const revised = await paused('research');
  assert.notEqual(revised.runId, firstRunId);
  assert.equal(revised.conversation.actions.find(action => action.id === revision.id).status, 'applied');
  assert.ok(revised.conversation.messages.some(message => message.text === 'Help me clarify this brief.'));
  assert.equal(revised.report, undefined); assert.match(revised.description, /Display the exact source text/);
  assert.equal(await fs.readFile(path.join(complete.workspace, 'requirements.md'), 'utf8'), requirements, 'The prior run is preserved');

  await send('Stop the current build.');
  const stopProposal = (await project()).conversation.actions.at(-1);
  await page.getByRole('region', { name: 'Proposed action: Stop build', exact: true }).getByRole('button', { name: 'Stop build', exact: true }).click();
  const stopped = await stateWhere(state => state.status === 'stopped', 'stop pending research');
  const cancelled = stopped.conversation.questions.find(question => question.runId === stopped.runId && question.phase === 'research');
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(stopped.conversation.actions.find(action => action.id === stopProposal.id).status, 'applied');
  await assert.rejects(page.evaluate(({ id, questionId }) => window.fleetHarness.answerClarification(id, questionId, 'Late answer'), { id: projectId, questionId: cancelled.id }), /no longer waiting|cancelled/);
  await noCallsWhileWaiting();

  await send('Revise the brief again.');
  const stale = (await project()).conversation.actions.at(-1);
  const beforeUpdate = await project();
  await page.evaluate(({ id, input }) => window.fleetHarness.updateProject(id, input), { id: projectId, input: { title: beforeUpdate.title, description: beforeUpdate.description + ' Keep a deliberate operator review step.', criteria: beforeUpdate.criteria, inputs: beforeUpdate.inputs, outputs: beforeUpdate.outputs, resources: beforeUpdate.resources, links: beforeUpdate.links, dataInputs: beforeUpdate.dataInputs } });
  await assert.rejects(page.evaluate(({ id, actionId }) => window.fleetHarness.applyConversationAction(id, actionId), { id: projectId, actionId: stale.id }), /older brief or build/);
  assert.equal((await project()).status, 'draft', 'A stale proposal cannot start a run');
  assert.deepEqual(errors, []); assert.deepEqual(fixture.errors, []);
  const result = { passed: true, localFixtureOnly: true, streamedReply: true, proposalActions: ['start', 'revise', 'stop'], staleProposalRejected: true, clarificationPhases: ['research', 'plan'], clarificationAnswerTypes: ['text', 'single_choice', 'multiple_choice'], answerDraftsSurviveReload: true, partialRoundStaysPaused: true, explicitAnswerSubmission: true, humanWaitUsesNoModelCalls: true, answerRoutingAndFrozenContracts: true, historySurvivesReloadAndNewRun: true, stoppedQuestionRejectsLateAnswer: true, keyboardCloseRestoresFocus: true, rendererErrors: errors.length, providerRequests: fixture.requests.length, captures, screenshots: output };
  await fs.writeFile(path.join(output, 'result.json'), JSON.stringify(result, null, 2));
  await fs.rm(path.join(output, 'failure.json'), { force: true });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  const state = page && !page.isClosed() ? await project().catch(() => undefined) : undefined;
  await fs.writeFile(path.join(output, 'failure.json'), JSON.stringify({ error: error.stack, project: state, providerErrors: fixture.errors, requests: fixture.requests.map(request => ({ coordinator: request.coordinator, phase: request.phase, toolNames: request.body.tools?.map(tool => tool.function?.name) })) }, null, 2));
  console.error('Conversation diagnostics: ' + path.join(output, 'failure.json')); throw error;
} finally { await app?.close(); await fixture.close(); await fs.rm(root, { recursive: true, force: true }); }
