import { invoke } from './public/domain.mjs';
export async function compute(input, context = {}) {
 if(context.signal?.aborted) throw new Error('Computation cancelled.');
 return invoke(input);
}
