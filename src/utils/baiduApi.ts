export class BaiduConnectionError extends Error {
  constructor(message: string, public readonly kind: 'backend' | 'network' | 'response' | 'appkey' = 'response') {
    super(message);
    this.name = 'BaiduConnectionError';
  }
}

export const BAIDU_BACKEND_MESSAGE = '百度网盘连接服务未就绪：接口返回了网页，而非 API 数据。请在「连接服务地址」填写已部署的后端服务地址；GitHub Pages 仅提供静态网页，不能运行扫码及网盘代理接口。';

export function buildBaiduApiUrl(endpoint: string, apiBaseUrl = '', location = typeof window !== 'undefined' ? window.location : undefined): string {
  const base = apiBaseUrl.trim().replace(/\/+$/, '');
  if (!base) {
    if (location && (location.protocol === 'file:' || /(^|\.)github\.io$/i.test(location.hostname))) {
      throw new BaiduConnectionError('当前是静态网页版本，请先填写「连接服务地址」。扫码登录和云端同步需要运行百度网盘后端服务。', 'backend');
    }
    return endpoint;
  }
  let parsed: URL;
  try { parsed = new URL(base); } catch {
    throw new BaiduConnectionError('连接服务地址格式不正确，请填写完整的 HTTPS 地址。', 'backend');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  if ((parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && local)) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new BaiduConnectionError('连接服务地址须为 HTTPS 地址，且不含账号、查询参数或锚点；本机调试可使用 http://localhost。', 'backend');
  }
  return base.endsWith('/api') ? base + endpoint.slice('/api'.length) : base + endpoint;
}

export async function fetchBaiduBackend(endpoint: string, options: RequestInit = {}, apiBaseUrl = '', timeoutMs = 20000): Promise<Response> {
  const url = buildBaiduApiUrl(endpoint, apiBaseUrl);
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new BaiduConnectionError(controller.signal.aborted
      ? '百度网盘连接服务请求超时，请检查服务是否已启动。'
      : '无法访问百度网盘连接服务，请检查服务地址、网络及服务端跨域配置。', 'network');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}

export function isHtmlResponse(text: string, contentType = ''): boolean {
  return contentType.toLowerCase().includes('text/html') || /^\s*(?:<!doctype\s+html|<html\b)/i.test(text);
}

export async function requestBaiduJson(endpoint: string, options: RequestInit = {}, apiBaseUrl = ''): Promise<{ response: Response; data: any }> {
  const response = await fetchBaiduBackend(endpoint, options, apiBaseUrl);
  const text = await response.text();
  if (isHtmlResponse(text, response.headers.get('content-type') || '')) {
    throw new BaiduConnectionError(BAIDU_BACKEND_MESSAGE, 'backend');
  }
  let data: any;
  try { data = JSON.parse(text); } catch {
    throw new BaiduConnectionError(`百度网盘连接服务返回了无效数据 (HTTP ${response.status})，请检查服务状态。`);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new BaiduConnectionError('百度网盘连接服务返回的数据格式不正确，请检查服务地址。');
  }
  return { response, data };
}

export function baiduErrorDiagnosis(error: unknown): string {
  if (error instanceof BaiduConnectionError) return error.message;
  return error instanceof Error ? error.message : '百度网盘连接失败，请查看服务状态与诊断日志。';
}
