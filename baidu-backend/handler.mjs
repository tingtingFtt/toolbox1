import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const ROUTES = new Set(['/api/health', '/api/baidu-device-code', '/api/baidu-poll-token', '/api/baidu-proxy']);
const DEFAULT_ORIGINS = 'https://tingtingftt.github.io,http://localhost:3000,http://127.0.0.1:3000';
const DEVICE_STATES = new Set(['authorization_pending', 'slow_down', 'expired_token', 'expired_code', 'authorization_declined']);

class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

function string(value) { return typeof value === 'string' ? value.trim() : ''; }
function positive(value, fallback, maximum) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

export function readBaiduConfig(env = process.env) {
  const appKey = string(env.BAIDU_APP_KEY);
  const appSecret = string(env.BAIDU_APP_SECRET);
  if (appSecret && !appKey) throw new Error('设置 BAIDU_APP_SECRET 时必须同时设置 BAIDU_APP_KEY。');
  const allowedOrigins = new Set((env.ALLOWED_ORIGINS ?? DEFAULT_ORIGINS).split(',').map(value => value.trim()).filter(Boolean));
  for (const origin of allowedOrigins) {
    let parsed;
    try { parsed = new URL(origin); } catch { throw new Error('ALLOWED_ORIGINS 必须是逗号分隔的网页 Origin，不允许使用 *。'); }
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.origin !== origin) throw new Error('ALLOWED_ORIGINS 仅接受 Origin，不包含路径、凭证或末尾斜杠。');
  }
  return {
    appKey, appSecret, allowedOrigins,
    maxBodyBytes: positive(env.MAX_UPLOAD_MB, 100, 1024) * 1024 * 1024,
    timeoutMs: positive(env.UPSTREAM_TIMEOUT_MS, 120000, 600000),
  };
}

export function validateBaiduUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new ApiError(400, 'invalid_url', '网盘请求地址格式不正确。'); }
  const hosts = ['openapi.baidu.com', 'pan.baidu.com', 'pcs.baidu.com', 'd.pcs.baidu.com', 'c.pcs.baidu.com'];
  const hostAllowed = hosts.includes(url.hostname) || url.hostname === 'baidupcs.com' || url.hostname.endsWith('.baidupcs.com');
  if (url.protocol !== 'https:' || !hostAllowed || url.username || url.password || (url.port && url.port !== '443') || url.hash) {
    throw new ApiError(403, 'host_not_allowed', '代理仅支持受信任的百度 HTTPS 接口，不允许访问其他主机。');
  }
  return url;
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

async function readBody(req, limit) {
  if (Number(req.headers['content-length']) > limit) {
    req.resume();
    throw new ApiError(413, 'body_too_large', '上传内容超过连接服务允许的大小。');
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > limit) { req.resume(); throw new ApiError(413, 'body_too_large', '上传内容超过连接服务允许的大小。'); }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readParams(req, url) {
  if (req.method === 'GET') return Object.fromEntries(url.searchParams);
  const body = await readBody(req, 65536);
  const contentType = string(req.headers['content-type']).toLowerCase();
  if (contentType.includes('application/json')) {
    try {
      const data = JSON.parse(body.toString('utf8'));
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
      return data;
    } catch { throw new ApiError(400, 'invalid_json', '授权请求的 JSON 格式不正确。'); }
  }
  if (contentType.includes('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(body.toString('utf8')));
  throw new ApiError(415, 'unsupported_content_type', '授权请求请使用 JSON 或表单格式。');
}

function clientKey(input, config) {
  const supplied = string(input.client_id);
  if (config.appKey && supplied && supplied !== config.appKey) throw new ApiError(400, 'invalid_client', '网页 AppKey 与连接服务配置不一致。');
  const key = config.appKey || supplied;
  if (!key) throw new ApiError(400, 'unconfigured_client', '尚未配置百度开放平台 AppKey。');
  return key;
}

async function readOAuthJson(response) {
  try {
    const data = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch { throw new ApiError(502, 'backend_error', `百度 OAuth 接口未返回有效 JSON (HTTP ${response.status})，请检查服务端网络。`); }
}

// Validate each redirect; never let an allowed URL redirect the proxy to another service.
async function fetchAllowed(fetchImpl, input, options) {
  let url = validateBaiduUrl(input);
  let nextOptions = { ...options, headers: { ...options.headers }, redirect: 'manual' };
  for (let redirects = 0; redirects <= 5; redirects++) {
    const response = await fetchImpl(url.toString(), nextOptions);
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get('location');
    if (!location) return response;
    await response.body?.cancel();
    url = validateBaiduUrl(new URL(location, url).toString());
    if ((response.status === 303 && nextOptions.method !== 'HEAD') || ([301, 302].includes(response.status) && nextOptions.method === 'POST')) {
      nextOptions = { ...nextOptions, method: 'GET', body: undefined };
      delete nextOptions.headers['content-type'];
    }
  }
  throw new ApiError(502, 'too_many_redirects', '百度下载接口重定向次数过多。');
}

export function createBaiduHandler({ config = readBaiduConfig(), fetchImpl = globalThis.fetch, passthrough = false } = {}) {
  return async function baiduHandler(req, res, next) {
    let url;
    try { url = new URL(req.url || '/', 'http://localhost'); }
    catch { return sendJson(res, 400, { error: 'invalid_request_url', message: '请求地址格式不正确。' }); }
    if (!ROUTES.has(url.pathname)) {
      if (passthrough && !url.pathname.startsWith('/api/baidu-')) return next();
      return sendJson(res, 404, { error: 'api_not_found', message: '连接服务接口不存在。' });
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Vary', 'Origin');
    const origin = string(req.headers.origin);
    let sameOrigin = false;
    try { sameOrigin = passthrough && new URL(origin).host === req.headers.host; } catch {}
    if (origin && !config.allowedOrigins.has(origin) && !sameOrigin) return sendJson(res, 403, { error: 'origin_not_allowed', message: '网页 Origin 未在连接服务的 ALLOWED_ORIGINS 中配置。' });
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
      res.statusCode = 204; res.end(); return;
    }
    const methods = url.pathname === '/api/health' ? ['GET', 'HEAD'] : url.pathname === '/api/baidu-poll-token' ? ['POST'] : url.pathname === '/api/baidu-device-code' ? ['GET', 'POST'] : ['GET', 'POST', 'HEAD'];
    if (!methods.includes(req.method)) {
      res.setHeader('Allow', methods.join(', '));
      return sendJson(res, 405, { error: 'method_not_allowed', message: '当前接口不支持此请求方法。' });
    }
    if (url.pathname === '/api/health') return sendJson(res, 200, { status: 'ok', services: ['baidu'], timestamp: new Date().toISOString() });
    const abort = new AbortController();
    const disconnect = () => { if (!res.writableFinished) abort.abort(); };
    res.on('close', disconnect);
    const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(config.timeoutMs)]);
    try {
      if (url.pathname === '/api/baidu-device-code') {
        const input = await readParams(req, url);
        const params = new URLSearchParams({ client_id: clientKey(input, config), response_type: 'device_code', scope: 'basic,netdisk' });
        const response = await fetchAllowed(fetchImpl, `https://openapi.baidu.com/oauth/2.0/device/code?${params}`, { method: 'GET', headers: { Accept: 'application/json', 'User-Agent': 'pan.baidu.com' }, signal });
        return sendJson(res, response.status, await readOAuthJson(response));
      }
      if (url.pathname === '/api/baidu-poll-token') {
        const input = await readParams(req, url);
        const code = string(input.code) || string(input.device_code);
        if (!code) throw new ApiError(400, 'missing_device_code', '缺少百度设备码。');
        const params = new URLSearchParams({ grant_type: 'device_token', code, client_id: clientKey(input, config) });
        const secret = config.appSecret || string(input.client_secret);
        if (!secret) throw new ApiError(400, 'invalid_client', '设备码换取 Token 需要 AppSecret，请在服务端环境变量中配置。');
        params.set('client_secret', secret);
        let response = await fetchAllowed(fetchImpl, 'https://openapi.baidu.com/oauth/2.0/token', { method: 'POST', headers: { Accept: 'application/json', 'User-Agent': 'pan.baidu.com', 'content-type': 'application/x-www-form-urlencoded' }, body: params.toString(), signal });
        let data = await readOAuthJson(response);
        if (!data.access_token && data.error && !DEVICE_STATES.has(data.error)) {
          const fallback = await fetchAllowed(fetchImpl, `https://openapi.baidu.com/oauth/2.0/token?${params}`, { method: 'GET', headers: { Accept: 'application/json', 'User-Agent': 'pan.baidu.com' }, signal });
          const fallbackData = await readOAuthJson(fallback);
          if (fallbackData.access_token || fallbackData.error === 'authorization_pending') { response = fallback; data = fallbackData; }
        }
        return sendJson(res, response.status, data);
      }
      const target = validateBaiduUrl(url.searchParams.get('url') || '');
      const headers = { 'User-Agent': 'pan.baidu.com' };
      for (const name of ['content-type', 'range']) if (typeof req.headers[name] === 'string') headers[name] = req.headers[name];
      const body = req.method === 'POST' ? await readBody(req, config.maxBodyBytes) : undefined;
      const response = await fetchAllowed(fetchImpl, target.toString(), { method: req.method, headers, body, signal });
      res.statusCode = response.status;
      for (const name of ['content-type', 'content-disposition', 'content-range', 'accept-ranges']) {
        const value = response.headers.get(name); if (value) res.setHeader(name, value);
      }
      // fetch may decompress responses: do not copy upstream Content-Length or Content-Encoding.
      if (req.method === 'HEAD' || !response.body) { await response.body?.cancel(); res.end(); return; }
      await pipeline(Readable.fromWeb(response.body), res);
    } catch (error) {
      if (res.destroyed) return;
      if (res.headersSent) { res.destroy(); return; }
      sendJson(res, error instanceof ApiError ? error.status : signal.aborted ? 504 : 502, {
        error: error instanceof ApiError ? error.code : 'backend_error',
        message: error instanceof ApiError ? error.message : signal.aborted ? '百度接口请求超时，请检查服务端网络。' : '连接百度接口失败，请检查服务端网络与应用配置。',
      });
    } finally { res.removeListener('close', disconnect); }
  };
}
