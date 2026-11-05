export const reasoningEfforts = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'] as const;
export type ReasoningEffort = typeof reasoningEfforts[number];

export interface ReasoningModel {
  reasoningEfforts?: ReasoningEffort[];
  defaultReasoningEffort?: ReasoningEffort;
}

export function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return typeof value === 'string' && (reasoningEfforts as readonly string[]).includes(value);
}

/** Unknown catalog metadata never implies support for a reasoning level. */
export function supportedReasoningEfforts(model: ReasoningModel | undefined): ReasoningEffort[] {
  const supported = Array.isArray(model?.reasoningEfforts) ? model.reasoningEfforts : [];
  return reasoningEfforts.filter(effort => supported.includes(effort));
}

export function resolveReasoningEffort(model: ReasoningModel | undefined, preference?: ReasoningEffort): ReasoningEffort | undefined {
  const supported = supportedReasoningEfforts(model);
  if (preference && supported.includes(preference)) return preference;
  if (model?.defaultReasoningEffort && supported.includes(model.defaultReasoningEffort)) return model.defaultReasoningEffort;
  return supported.includes('medium') ? 'medium' : supported[0];
}

/** Preserve a prior choice for older clients, while adapting it to the new model. */
export function savedReasoningEffort(model: ReasoningModel | undefined, requested: unknown, previous?: ReasoningEffort): ReasoningEffort | undefined {
  if (requested !== undefined && !isReasoningEffort(requested)) throw new Error('Select a valid reasoning effort.');
  if ((requested === undefined && previous === undefined) || supportedReasoningEfforts(model).length < 2) return undefined;
  return resolveReasoningEffort(model, requested === undefined ? previous : requested);
}
