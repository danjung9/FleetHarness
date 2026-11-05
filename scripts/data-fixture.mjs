// Deterministic data-specialist output used only by explicit test providers.
export const syntheticDataFixture = {
  classification: 'synthetic',
  useCase: 'Review task messages and extract the action for a local message parser.',
  fields: [{ name: 'message', type: 'string', description: 'A task message to parse and review.' }],
  records: [{ message: 'TASK: inspect pump' }, { message: 'TASK: check valve' }],
  scenarios: [
    { name: 'Extract a task', kind: 'typical', input: { message: 'TASK: inspect pump' }, expectedBehavior: 'Show inspect pump as the extracted task.' },
    { name: 'Missing message', kind: 'edge', input: { message: '' }, expectedBehavior: 'Ask the reviewer to enter a message.' },
    { name: 'Unsupported format', kind: 'invalid', input: { message: 'INVALID' }, expectedBehavior: 'Reject the unsupported message without inventing a task.' }
  ],
  limitations: ['Invented examples for the local integration fixture; operational formats are unverified.']
};

export const syntheticDataFiles = {
  'data/synthetic-data.json': JSON.stringify(syntheticDataFixture, null, 2) + '\n',
  'data/README.md': '# Synthetic task messages\n\nThese invented task messages exercise the parser use case. The message field is text. Typical, empty-input and invalid-format scenarios include expected behavior. No operational data or measured performance is represented.\n'
};
