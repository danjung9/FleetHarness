/** Replace this function with the selected application's backend computation. */
export async function compute(input, { signal } = {}) {
  signal?.throwIfAborted();
  throw Object.assign(new Error('Application computation is not implemented. Replace compute.mjs with the required backend logic.'), { statusCode: 501 });
}
