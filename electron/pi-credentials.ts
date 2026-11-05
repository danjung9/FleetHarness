import type { ModelRuntime } from '@earendil-works/pi-coding-agent';
import { registerCredential } from './secrets.js';

/** Register keys before SDK failures can include them in diagnostics. */
export function protectRuntimeCredentials(runtime: ModelRuntime): ModelRuntime {
  const setKey = runtime.setRuntimeApiKey.bind(runtime);
  runtime.setRuntimeApiKey = (provider, key, options) => { registerCredential(key); return setKey(provider, key, options); };
  const getAuth = runtime.getAuth.bind(runtime);
  runtime.getAuth = (async (...args: Parameters<ModelRuntime['getAuth']>) => {
    const result = await getAuth(...args);
    if (result) {
      registerCredential(result.auth.apiKey);
      for (const value of Object.values(result.auth.headers ?? {})) {
        registerCredential(value);
        if (typeof value === 'string') registerCredential(value.replace(/^(?:Bearer|Basic)\s+/i, ''));
      }
    }
    return result;
  }) as ModelRuntime['getAuth'];
  return runtime;
}
