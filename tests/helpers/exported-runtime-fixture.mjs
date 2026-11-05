// Synthetic admission metadata lets transport tests exercise the real source
// exporter without pretending that they ran a build or obtained human approval.
export function syntheticRuntimeExport(runtime, entrypoint, files) {
  return {
    evidence: { report: 'Synthetic transport verification', review: 'Synthetic transport approval' },
    reference: { runtime: { profile: 'service', files, requiredEnv: [], command: { runtime, entrypoint, args: [] } }, operations: [],
      experiment: { experimentId: 'synthetic-transport', candidateId: runtime, behaviorHash: 'a'.repeat(64), evaluationSetHash: 'b'.repeat(64), executionHash: 'c'.repeat(64) } }
  };
}
