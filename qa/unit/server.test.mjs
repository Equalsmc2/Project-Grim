import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStaticServer } from '../scripts/serve.mjs';
test('static server serves page, rejects missing files and write methods', async () => {
  const server = await createStaticServer('demo');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(url);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Project QA Demo/);
    assert.equal((await fetch(url+'/missing.js')).status, 404);
    assert.equal((await fetch(url, {method:'POST'})).status, 405);
    assert.notEqual((await fetch(url+'/%2e%2e%2fpackage.json')).status, 200);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
