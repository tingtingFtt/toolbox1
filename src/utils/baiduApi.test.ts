import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBaiduApiUrl, requestBaiduJson, BaiduConnectionError } from './baiduApi';
import { BaiduAdapter, executeBaiduApiFetch, fetchBaiduUserInfo } from './storageAdapters/baiduAdapter';

test('static hosting requires a backend before sending any request', () => {
  for (const location of [{ protocol: 'https:', hostname: 'tingtingftt.github.io' }, { protocol: 'file:', hostname: '' }]) {
    assert.throws(() => buildBaiduApiUrl('/api/baidu-device-code', '', location as Location), (error: unknown) => error instanceof BaiduConnectionError && error.kind === 'backend');
  }
  assert.equal(buildBaiduApiUrl('/api/health', '', { protocol: 'https:', hostname: 'app.example' } as Location), '/api/health');
});

test('service URLs retain subpaths and avoid duplicate api prefixes', () => {
  assert.equal(buildBaiduApiUrl('/api/health', ' https://backend.example/service/ '), 'https://backend.example/service/api/health');
  assert.equal(buildBaiduApiUrl('/api/health', 'https://backend.example/api/'), 'https://backend.example/api/health');
  assert.equal(buildBaiduApiUrl('/api/health', 'http://localhost:3000'), 'http://localhost:3000/api/health');
  for (const base of ['example.com', 'http://remote.example', 'https://user:password@example.com', 'https://example.com?key=secret']) {
    assert.throws(() => buildBaiduApiUrl('/api/health', base), BaiduConnectionError);
  }
});

test('HTML responses identify missing backend without blaming AppKey', async () => {
  const original = globalThis.fetch;
  try {
    for (const status of [200, 404]) {
      globalThis.fetch = async () => new Response('<!DOCTYPE html><html>Static site</html>', { status, headers: { 'content-type': 'text/html' } });
      await assert.rejects(requestBaiduJson('/api/health', {}, 'https://backend.example'), (error: unknown) => error instanceof BaiduConnectionError && error.kind === 'backend' && !error.message.includes('AppKey'));
    }
    globalThis.fetch = async () => new Response('<!DOCTYPE html><html>Fallback</html>');
    await assert.rejects(executeBaiduApiFetch('https://pan.baidu.com/rest/2.0/xpan/nas', {}, 'https://backend.example'), BaiduConnectionError);
  } finally { globalThis.fetch = original; }
});

test('invalid responses fail clearly and valid OAuth errors remain distinguishable', async () => {
  const original = globalThis.fetch;
  try {
    for (const body of ['invalid', 'null', '[]']) {
      globalThis.fetch = async () => new Response(body);
      await assert.rejects(requestBaiduJson('/api/health', {}, 'https://backend.example'), BaiduConnectionError);
    }
    globalThis.fetch = async () => Response.json({ error: 'invalid_client' }, { status: 400 });
    const result = await requestBaiduJson('/api/baidu-device-code', {}, 'https://backend.example');
    assert.equal(result.response.status, 400);
    assert.equal(result.data.error, 'invalid_client');
  } finally { globalThis.fetch = original; }
});

test('network failures identify service connection failure', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(requestBaiduJson('/api/health', {}, 'https://backend.example'), (error: unknown) => error instanceof BaiduConnectionError && error.kind === 'network');
  } finally { globalThis.fetch = original; }
});

test('device token polling sends credentials in POST body to the selected service', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://backend.example/api/baidu-poll-token');
      assert.equal(options?.method, 'POST');
      assert.deepEqual(JSON.parse(String(options?.body)), { code: 'device', client_secret: 'test-secret' });
      return Response.json({ error: 'authorization_pending' }, { status: 400 });
    };
    const result = await requestBaiduJson('/api/baidu-poll-token', { method: 'POST', body: JSON.stringify({ code: 'device', client_secret: 'test-secret' }) }, 'https://backend.example');
    assert.equal(result.data.error, 'authorization_pending');
  } finally { globalThis.fetch = original; }
});

test('account validation rejects invalid tokens and storage uses the same backend', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ errno: -6 });
    await assert.rejects(fetchBaiduUserInfo('test-token', 'https://backend.example'), /身份验证失败/);
    globalThis.fetch = async (url) => {
      assert.ok(String(url).startsWith('https://backend.example/service/api/baidu-proxy?'));
      return Response.json({ errno: 0, baidu_name: '测试用户', list: [] });
    };
    assert.equal((await fetchBaiduUserInfo('test-token', 'https://backend.example/service')).baidu_name, '测试用户');
    const adapter = new BaiduAdapter({ accessToken: 'test-token', rootPath: '/apps/test', apiBaseUrl: 'https://backend.example/service' });
    assert.equal((await adapter.testConnection()).success, true);
    assert.deepEqual(await adapter.listFiles('/'), []);
  } finally { globalThis.fetch = original; }
});

test('binary downloads retain their bytes through the configured backend', async () => {
  const original = globalThis.fetch;
  const bytes = new Uint8Array([0, 255, 7, 128]);
  try {
    globalThis.fetch = async () => new Response(bytes, { headers: { 'content-type': 'application/octet-stream' } });
    const adapter = new BaiduAdapter({ accessToken: 'test-token', rootPath: '/apps/test', apiBaseUrl: 'https://backend.example' });
    assert.deepEqual(new Uint8Array(await adapter.downloadFile('/backup.bin')), bytes);
  } finally { globalThis.fetch = original; }
});

test('HTTP 200 with a Baidu API error does not count as a successful upload', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ errno: -6 });
    const adapter = new BaiduAdapter({ accessToken: 'test-token', rootPath: '/apps/test', apiBaseUrl: 'https://backend.example' });
    await assert.rejects(adapter.uploadFile('/backup.json', '{}'), /上传失败/);
  } finally { globalThis.fetch = original; }
});
