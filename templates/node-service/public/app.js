const form = document.querySelector('#compute-form');
const input = document.querySelector('#input');
const button = document.querySelector('#run');
const status = document.querySelector('#status');
const error = document.querySelector('#error');
const output = document.querySelector('#output');
const result = document.querySelector('#result');

form.addEventListener('submit', async event => {
  event.preventDefault();
  error.hidden = true;
  error.textContent = '';
  input.removeAttribute('aria-invalid');
  let value;
  try {
    value = JSON.parse(input.value);
  } catch {
    input.setAttribute('aria-invalid', 'true');
    error.textContent = 'The input is not valid JSON. Check its quotes, commas, and brackets, then run it again.';
    error.hidden = false;
    status.textContent = 'Input needs a correction.';
    result.textContent = 'No result was returned.';
    input.focus();
    return;
  }

  button.disabled = true;
  input.readOnly = true;
  output.setAttribute('aria-busy', 'true');
  status.textContent = 'Running computation…';
  result.textContent = 'Waiting for a result…';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch('/api/invoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
      signal: controller.signal,
      credentials: 'same-origin',
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error?.message || `Computation failed (HTTP ${response.status}).`);
    result.textContent = JSON.stringify(body, null, 2);
    status.textContent = 'Computation complete.';
  } catch (failure) {
    error.textContent = failure.name === 'AbortError'
      ? 'The computation took too long. Check your input and try again.'
      : failure instanceof TypeError
        ? 'Could not reach the application. Check that it is running and try again.'
        : failure instanceof SyntaxError
          ? 'The application returned unreadable JSON. Check the backend response and try again.'
          : failure.message;
    error.hidden = false;
    status.textContent = 'Computation failed.';
    result.textContent = 'No result was returned.';
  } finally {
    clearTimeout(timer);
    button.disabled = false;
    input.readOnly = false;
    output.setAttribute('aria-busy', 'false');
  }
});
