import { invoke } from './lib/optask.mjs';
export async function compute(input, { signal } = {}) {
 signal?.throwIfAborted();
 return invoke(input);
}
