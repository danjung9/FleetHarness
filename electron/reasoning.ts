import { clampThinkingLevel, getSupportedThinkingLevels, type Api, type Model } from '@earendil-works/pi-ai/compat';
import type { CreateAgentSessionOptions } from '@earendil-works/pi-coding-agent';
import { isReasoningEffort, resolveReasoningEffort, type ReasoningEffort, type ReasoningModel } from '../shared/reasoning.js';
import { CodexRpc, type CodexCredentials } from './codex-rpc.js';

export function piReasoningMetadata(model: Model<Api>): ReasoningModel {
  const reasoningEfforts = getSupportedThinkingLevels(model).map(level => level === 'off' ? 'none' : level).filter(isReasoningEffort);
  const level = clampThinkingLevel(model, 'medium');
  return { reasoningEfforts, defaultReasoningEffort: level === 'off' ? 'none' : level };
}

export function piThinkingLevel(model: Model<Api>, preference: ReasoningEffort | undefined, fallback: 'low' | 'medium' = 'medium'): CreateAgentSessionOptions['thinkingLevel'] {
  const effort = resolveReasoningEffort(piReasoningMetadata(model), preference ?? fallback);
  return effort === 'none' || effort === undefined ? 'off' : effort === 'ultra' ? 'max' : effort;
}

/** Account catalogs use snake_case; app-server model/list uses camelCase. */
export function codexReasoningMetadata(value: unknown): ReasoningModel {
  if (!value || typeof value !== 'object') return {};
  const model = value as Record<string, unknown>;
  const options = model.supportedReasoningEfforts ?? model.supported_reasoning_levels;
  if (!Array.isArray(options)) return {};
  const reasoningEfforts = [...new Set(options.map(option => {
    if (typeof option === 'string') return option;
    if (!option || typeof option !== 'object') return undefined;
    return option.reasoningEffort ?? option.effort;
  }).filter(isReasoningEffort))];
  const fallback = model.defaultReasoningEffort ?? model.default_reasoning_level;
  return { reasoningEfforts, ...(isReasoningEffort(fallback) && reasoningEfforts.includes(fallback) ? { defaultReasoningEffort: fallback } : {}) };
}

/** Read bundled model capabilities, never treat this catalog as account access. */
export async function codexReasoningCatalog(home: string, credentials: Pick<CodexCredentials, 'accessToken'>): Promise<Map<string, ReasoningModel>> {
  const rpc = CodexRpc.launch(home, credentials);
  try {
    await rpc.initialize();
    const models = new Map<string, ReasoningModel>();
    let cursor: string | undefined;
    const seen = new Set<string>();
    do {
      const result = await rpc.request('model/list', { limit: 100, includeHidden: true, ...(cursor ? { cursor } : {}) });
      if (!Array.isArray(result.data)) throw new Error('Codex model capabilities are unavailable.');
      for (const model of result.data) {
        const metadata = codexReasoningMetadata(model);
        for (const id of [model?.model, model?.id]) if (typeof id === 'string' && id) models.set(id, metadata);
      }
      cursor = typeof result.nextCursor === 'string' && result.nextCursor ? result.nextCursor : undefined;
      if (cursor && seen.has(cursor)) throw new Error('Codex model catalog pagination did not advance.');
      if (cursor) seen.add(cursor);
    } while (cursor);
    return models;
  } finally { rpc.dispose(); }
}
