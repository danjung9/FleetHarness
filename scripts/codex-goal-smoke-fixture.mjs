/** Test-only handoff: pipeline UI smoke tests must never open a real Terminal or model session. */
export async function stubCodexGoalLaunch(app) {
  await app.evaluate(({ ipcMain }) => {
    const calls = [];
    globalThis.__fleetCodexGoalFixture = { calls };
    ipcMain.removeHandler('fleet:codex-goal:launch');
    ipcMain.handle('fleet:codex-goal:launch', (_event, id) => {
      calls.push({ action: 'launch', projectId: id });
      // Deliberately leave project state unchanged: these tests exercise the
      // original pipeline, including its journey, evidence and resume behavior.
      return { id: `fixture-${calls.length}`, workspace: `/fixture/codex-goals/${id}`,
        createdAt: new Date().toISOString(), status: 'opened' };
    });
    ipcMain.removeHandler('fleet:codex-goal:open');
    ipcMain.handle('fleet:codex-goal:open', (_event, id) => { calls.push({ action: 'open', projectId: id }); });
  });
}
