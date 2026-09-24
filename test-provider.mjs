// Test-only upstream fixture. Never loaded by the application in normal use.
const real = globalThis.fetch;
let generated = 0;
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';

globalThis.fetch = async (url, options = {}) => {
  const text = String(url);
  if (text.startsWith('http://127.0.0.1')) return real(url, options);

  if (text === 'https://api.openai.com/v1/images/edits') {
    const auth = options.headers?.Authorization;
    if (auth !== 'Bearer sk-test') {
      return Response.json({ error: { message: 'invalid api key' } }, { status: 401 });
    }

    if (generated++ === 0) {
      return Response.json({ data: [{ b64_json: png }] }, {
        status: 200,
        headers: { 'x-request-id': 'req_test_1' },
      });
    }

    return Response.json({ error: { message: 'rate limit reached' } }, {
      status: 429,
      headers: { 'x-request-id': 'req_test_429' },
    });
  }

  throw new Error('Unexpected test request ' + text);
};
