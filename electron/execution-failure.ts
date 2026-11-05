/** Classification comes from a trusted execution boundary, never an agent's explanation. */
export class ClassifiedExecutionFailure extends Error {
  constructor(readonly classification: 'implementation' | 'infrastructure' | 'integrity', message: string, options?: ErrorOptions) {
    super(message, options); this.name = 'ClassifiedExecutionFailure';
  }
}
