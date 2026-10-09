import test from 'node:test';
import assert from 'node:assert/strict';
import { createBaiduServer } from '../server.mjs';
import { readBaiduConfig, validateBaiduUrl } from '../handler.mjs';

const ORIGIN = 'https://tingtingftt.github.io';
const jsonHeaders = { 'content-type': 'application/json', origin: ORIGIN };
const noUpstream = () => { throw new Error('Test unexpectedly requested an upstream'); };

async function withService(fetchImpl, check, env = {}, override = {}) {
  const server = createBaiduServer({ fetchImpl, config: { ...readBaiduConfig(env), ...override } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { await check(base); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

const poll = (base, body) => fetch(base + '/api/baidu-poll-token', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(body) });
const proxyUrl = (base, target = 'https://pan.baidu.com/rest/2.0/xpan/nas?method=uinfo') => base + '/api/baidu-proxy?url=' + encodeURIComponent(target);

test('standalone health and unknown routes return JSON, with no frontend dependency', async () => {
  await withService(noUpstream, async base => {
    const health = await fetch(base + '/api/health');
    assert.equal(health.status, 200);
    assert.deepEqual((await health.json()).services, ['baidu']);
    assert.equal(health.headers.get('cache-control'), 'no-store');
    const unknown = await fetch(base + '/api/webdav-proxy');
    assert.equal(unknown.status, 404);
    assert.equal((await unknown.json()).error, 'api_not_found');
    assert.equal((await fetch(base + '/api/health', { method: 'HEAD' })).status, 200);
  });
});

test('CORS permits configured origins and refuses others before contacting Baidu', async () => {
  await withService(noUpstream, async base => {
    const denied = await fetch(base + '/api/baidu-device-code?client_id=test', { headers: { origin: 'https://untrusted.example' } });
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
    const allowed = await fetch(base + '/api/baidu-poll-token', { method: 'OPTIONS', headers: { origin: ORIGIN, 'access-control-request-method': 'POST' } });
    assert.equal(allowed.status, 204);
    assert.equal(allowed.headers.get('access-control-allow-origin'), ORIGIN);
  });
});

test('unsafe environment and proxy URL configurations are rejected', () => {
  assert.throws(() => readBaiduConfig({ BAIDU_APP_SECRET: 'private' }), /BAIDU_APP_KEY/);
  assert.throws(() => readBaiduConfig({ ALLOWED_ORIGINS: '*' }));
  assert.throws(() => readBaiduConfig({ ALLOWED_ORIGINS: ORIGIN + '/toolbox1/' }));
  for (const url of ['http://pan.baidu.com/file', 'https://evil.baidu.com/file', 'https://pan.baidu.com.evil.example/file', 'https://127.0.0.1/file', 'https://user:secret@pan.baidu.com/file', 'https://pan.baidu.com:8443/file', 'file:///etc/passwd']) {
    assert.throws(() => validateBaiduUrl(url));
  }
  assert.equal(validateBaiduUrl('https://d.pcs.baidu.com/file').hostname, 'd.pcs.baidu.com');
  assert.equal(validateBaiduUrl('https://download.baidupcs.com/file').hostname, 'download.baidupcs.com');
});

test('device code request uses the configured key and fixed netdisk scope', async () => {
  await withService(async (url, options) => {
    const parsed = new URL(url);
    assert.equal(parsed.hostname, 'openapi.baidu.com');
    assert.equal(parsed.searchParams.get('client_id'), 'test-key');
    assert.equal(parsed.searchParams.get('scope'), 'basic,netdisk');
    assert.equal(options.redirect, 'manual');
    return Response.json({ device_code: 'device', user_code: 'ABCD', qrcode_url: 'https://openapi.baidu.com/qr.png', expires_in: 300 });
  }, async base => {
    const response = await fetch(base + '/api/baidu-device-code', { headers: { origin: ORIGIN } });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).device_code, 'device');
  }, { BAIDU_APP_KEY: 'test-key' });
});

test('missing or mismatched keys do not call upstream or use a server secret', async () => {
  await withService(noUpstream, async base => {
    const missing = await fetch(base + '/api/baidu-device-code');
    assert.equal(missing.status, 400);
    assert.equal((await missing.json()).error, 'unconfigured_client');
  });
  await withService(noUpstream, async base => {
    const mismatch = await poll(base, { client_id: 'other-app', code: 'device' });
    assert.equal(mismatch.status, 400);
    assert.equal((await mismatch.json()).error, 'invalid_client');
  }, { BAIDU_APP_KEY: 'test-key', BAIDU_APP_SECRET: 'private' });
});

test('token exchange is POST-only and validates code, secret and JSON', async () => {
  await withService(noUpstream, async base => {
    assert.equal((await fetch(base + '/api/baidu-poll-token?code=device&client_secret=private')).status, 405);
    assert.equal((await poll(base, { client_id: 'test-key' })).status, 400);
    const missingSecret = await poll(base, { client_id: 'test-key', code: 'device' });
    assert.equal((await missingSecret.json()).error, 'invalid_client');
    const invalid = await fetch(base + '/api/baidu-poll-token', { method: 'POST', headers: jsonHeaders, body: '{' });
    assert.equal((await invalid.json()).error, 'invalid_json');
  });
});

test('token exchange prioritizes server credentials and returns tokens without caching', async () => {
  await withService(async (_url, options) => {
    const params = new URLSearchParams(options.body);
    assert.equal(params.get('client_secret'), 'server-secret');
    assert.equal(params.get('code'), 'device');
    assert.equal(params.get('grant_type'), 'device_token');
    return Response.json({ access_token: 'test-token', expires_in: 3600 });
  }, async base => {
    const response = await poll(base, { code: 'device', client_secret: 'client-secret' });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).access_token, 'test-token');
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }, { BAIDU_APP_KEY: 'test-key', BAIDU_APP_SECRET: 'server-secret' });
});

test('pending, slow-down and expired states are not retried immediately', async () => {
  for (const error of ['authorization_pending', 'slow_down', 'expired_token', 'expired_code', 'authorization_declined']) {
    let requests = 0;
    await withService(async () => { requests++; return Response.json({ error }, { status: 400 }); }, async base => {
      const response = await poll(base, { code: 'device', client_id: 'test-key', client_secret: 'secret' });
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error, error);
      assert.equal(requests, 1);
    });
  }
});

test('GET fallback token response retains its successful status', async () => {
  let requests = 0;
  await withService(async (url, options) => {
    requests++;
    if (options.method === 'POST') return Response.json({ error: 'invalid_client' }, { status: 400 });
    assert.equal(new URL(url).searchParams.get('client_secret'), 'secret');
    return Response.json({ access_token: 'test-token' });
  }, async base => {
    const response = await poll(base, { code: 'device', client_id: 'test-key', client_secret: 'secret' });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).access_token, 'test-token');
    assert.equal(requests, 2);
  });
});

test('upstream HTML and network failures become safe JSON diagnostics', async () => {
  await withService(async () => new Response('<html>error</html>', { status: 502 }), async base => {
    const response = await fetch(base + '/api/baidu-device-code?client_id=test-key');
    assert.equal(response.status, 502);
    const data = await response.json();
    assert.equal(data.error, 'backend_error');
    assert.ok(!data.message.includes('<html>'));
  });
  await withService(async () => { throw new Error('url contains access_token=private'); }, async base => {
    const response = await fetch(proxyUrl(base));
    assert.equal(response.status, 502);
    assert.ok(!(await response.text()).includes('private'));
  });
});

test('binary downloads and range metadata survive without incorrect encoding/length', async () => {
  const bytes = new Uint8Array([0, 255, 128, 7]);
  await withService(async (_url, options) => {
    assert.equal(options.headers.range, 'bytes=0-3');
    return new Response(bytes, { status: 206, headers: { 'content-type': 'application/octet-stream', 'content-range': 'bytes 0-3/4', 'content-encoding': 'gzip', 'content-length': '999' } });
  }, async base => {
    const response = await fetch(proxyUrl(base), { headers: { range: 'bytes=0-3' } });
    assert.equal(response.status, 206);
    assert.equal(response.headers.get('content-range'), 'bytes 0-3/4');
    assert.equal(response.headers.get('content-encoding'), null);
    assert.notEqual(response.headers.get('content-length'), '999');
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  });
});

test('multipart upload forwards the exact body and boundary', async () => {
  const body = Buffer.from('--boundary\r\nContent-Disposition: form-data; name="file"; filename="a.bin"\r\n\r\nABC\r\n--boundary--\r\n');
  await withService(async (_url, options) => {
    assert.equal(options.method, 'POST');
    assert.equal(options.headers['content-type'], 'multipart/form-data; boundary=boundary');
    assert.deepEqual(options.body, body);
    return Response.json({ error_code: 0 });
  }, async base => {
    const response = await fetch(proxyUrl(base, 'https://d.pcs.baidu.com/rest/2.0/pcs/file?method=upload'), { method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=boundary' }, body });
    assert.equal(response.status, 200);
  });
});

test('oversized uploads are rejected without requesting Baidu', async () => {
  await withService(noUpstream, async base => {
    const response = await fetch(proxyUrl(base), { method: 'POST', body: 'too large' });
    assert.equal(response.status, 413);
    assert.equal((await response.json()).error, 'body_too_large');
  }, {}, { maxBodyBytes: 4 });
});

test('redirects to an untrusted server are blocked before a second request', async () => {
  let requests = 0;
  await withService(async () => { requests++; return new Response(null, { status: 302, headers: { location: 'https://untrusted.example/?access_token=private' } }); }, async base => {
    const response = await fetch(proxyUrl(base));
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error, 'host_not_allowed');
    assert.equal(requests, 1);
  });
});

test('allowed download redirects work and request timeouts return JSON', async () => {
  let requests = 0;
  await withService(async () => ++requests === 1 ? new Response(null, { status: 302, headers: { location: 'https://download.baidupcs.com/file' } }) : new Response('file'), async base => {
    const response = await fetch(proxyUrl(base));
    assert.equal(await response.text(), 'file');
    assert.equal(requests, 2);
  });
  await withService(async (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('Timeout')), { once: true })), async base => {
    const response = await fetch(proxyUrl(base));
    assert.equal(response.status, 504);
    assert.equal((await response.json()).error, 'backend_error');
  }, {}, { timeoutMs: 20 });
});
