import { IStorageAdapter, RemoteFileInfo } from './baseAdapter';
import { BaiduConfig, BaiduUserInfo } from '../../types/cloudSync';
import { syncLogger } from '../cloudSyncLogger';
import { fetchBaiduBackend, isHtmlResponse, BaiduConnectionError, BAIDU_BACKEND_MESSAGE, baiduErrorDiagnosis } from '../baiduApi';

export const DEFAULT_BAIDU_APP_KEY = '';

/**
 * Generate official Baidu NetDisk OAuth 2.0 Authorization URL
 */
export function buildBaiduOAuthUrl(customAppKey?: string, customRedirectUri?: string, display: 'page' | 'popup' = 'page'): string {
  const appKey = customAppKey?.trim() || DEFAULT_BAIDU_APP_KEY;
  if (!appKey) {
    throw new Error('未配置百度网盘应用 AppKey。请在「高级配置」中输入您在百度开放平台创建的 AppKey，或直接在授权弹窗中粘贴 Access Token。');
  }
  const redirectUri = customRedirectUri?.trim() || (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '');
  
  const authUrl = `https://openapi.baidu.com/oauth/2.0/authorize?response_type=token&client_id=${encodeURIComponent(
    appKey
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=basic,netdisk&display=${display}`;

  syncLogger.addLog({
    category: 'baidu',
    level: 'info',
    title: '生成百度网盘 OAuth 2.0 授权跳转链接',
    url: authUrl,
    requestDetails: { appKey, redirectUri, display, scope: 'basic,netdisk' },
    diagnosis: '准备重定向至百度官方授权中心。若出现 invalid_client，请在高级选项中填入您在百度开放平台创建的有效 AppKey。',
  });

  return authUrl;
}

/**
 * Helper to execute Baidu NetDisk requests via the configured backend proxy to prevent browser CORS failure
 */
export async function executeBaiduApiFetch(
  targetUrl: string,
  options: RequestInit = {},
  apiBaseUrl = ''
): Promise<{ ok: boolean; status: number; data: any; rawBuffer?: ArrayBuffer; latencyMs: number }> {
  const startTime = performance.now();
  const method = options.method || 'GET';
  
  try {
    const res = await fetchBaiduBackend(`/api/baidu-proxy?url=${encodeURIComponent(targetUrl)}`, options, apiBaseUrl);
    const latencyMs = Math.round(performance.now() - startTime);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.toLowerCase().includes('text/html')) {
      throw new BaiduConnectionError(BAIDU_BACKEND_MESSAGE, 'backend');
    }

    let data: any = null;
    let rawBuffer: ArrayBuffer | undefined = undefined;

    if (contentType.includes('application/json') || contentType.includes('text/plain')) {
      const text = await res.text();
      if (isHtmlResponse(text)) throw new BaiduConnectionError(BAIDU_BACKEND_MESSAGE, 'backend');
      rawBuffer = new TextEncoder().encode(text).buffer as ArrayBuffer;
      try {
        data = JSON.parse(text);
      } catch {
        data = { rawText: text };
      }
    } else {
      rawBuffer = await res.arrayBuffer();
      // Try to parse buffer as json in case error response has octet-stream header
      const text = new TextDecoder().decode(rawBuffer);
      if (isHtmlResponse(text)) throw new BaiduConnectionError(BAIDU_BACKEND_MESSAGE, 'backend');
      try { data = JSON.parse(text); } catch {}
    }

    const isSuccess = res.ok && !data?.error && (data?.errno === undefined || data.errno === 0) && (data?.error_code === undefined || data.error_code === 0);

    syncLogger.addLog({
      category: 'baidu',
      level: isSuccess ? 'success' : 'error',
      title: `百度网盘 API 调用 [${method}] ${new URL(targetUrl).pathname}`,
      url: targetUrl,
      method,
      status: res.status,
      latencyMs,
      requestDetails: {
        method,
        targetUrl,
        headers: options.headers,
      },
      responseDetails: data || { byteLength: rawBuffer?.byteLength },
      error: !isSuccess ? (data?.error_msg || data?.message || (data?.errno !== undefined ? `百度返回 errno: ${data.errno}` : `HTTP 状态异常: ${res.status}`)) : undefined,
    });

    return {
      ok: isSuccess,
      status: res.status,
      data,
      rawBuffer,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    syncLogger.addLog({
      category: 'baidu',
      level: 'error',
      title: `百度网盘 API 请求网络异常 [${method}]`,
      url: targetUrl,
      method,
      latencyMs,
      error: err.message || '网络连接被中断或拒绝',
      diagnosis: baiduErrorDiagnosis(err),
    });
    throw err;
  }
}

/**
 * Parse access_token from current URL hash (#access_token=...) or query string
 */
export function parseBaiduTokenFromUrl(): { accessToken: string; expiresIn?: number } | null {
  if (typeof window === 'undefined') return null;

  // 1. Check Hash Fragment (Implicit Grant: #access_token=...&expires_in=...)
  const hash = window.location.hash;
  if (hash && hash.includes('access_token=')) {
    const cleanHash = hash.startsWith('#') ? hash.substring(1) : hash;
    const params = new URLSearchParams(cleanHash);
    const token = params.get('access_token');
    if (token) {
      const expiresIn = params.get('expires_in') ? parseInt(params.get('expires_in')!, 10) : undefined;
      syncLogger.addLog({
        category: 'baidu',
        level: 'success',
        title: '从重定向 URL Hash 中成功捕获 Access Token',
        requestDetails: { tokenPreview: `${token.substring(0, 8)}...`, expiresIn },
        diagnosis: '已完成 OAuth 2.0 简化模式重定向回跳，即将验证并获取网盘用户信息。',
      });
      return { accessToken: token, expiresIn };
    }
  }

  // 2. Check Search Query (?access_token=...)
  const search = window.location.search;
  if (search && search.includes('access_token=')) {
    const params = new URLSearchParams(search);
    const token = params.get('access_token');
    if (token) {
      return { accessToken: token };
    }
  }

  return null;
}

/**
 * Fetch detailed user profile information using Baidu NetDisk Open API
 */
export async function fetchBaiduUserInfo(accessToken: string, apiBaseUrl = ''): Promise<BaiduUserInfo> {
  const url = `https://pan.baidu.com/rest/2.0/xpan/nas?method=uinfo&access_token=${encodeURIComponent(accessToken)}`;
  const { data, ok } = await executeBaiduApiFetch(url, {}, apiBaseUrl);
  if (!ok || !data || data.errno !== 0) {
    throw new Error(data?.errno !== undefined ? syncLogger.interpretBaiduErrno(data.errno) : '无法验证百度网盘账号，请检查连接服务与授权凭证。');
  }
  return { baidu_name: data.baidu_name, netdisk_name: data.netdisk_name, avatar_url: data.avatar_url, uk: data.uk, vip_type: data.vip_type };
}

export class BaiduAdapter implements IStorageAdapter {
  private config: BaiduConfig;

  constructor(config: BaiduConfig) {
    this.config = config;
  }

  private fetchApi(targetUrl: string, options: RequestInit = {}) {
    return executeBaiduApiFetch(targetUrl, options, this.config.apiBaseUrl);
  }

  private normalizePath(path: string): string {
    let root = this.config.rootPath?.trim() || '/apps/卡面存储';
    // If root path is TavernVault or empty, default to the official Baidu registered app directory /apps/卡面存储
    if (root === '/apps/TavernVault' || root === 'TavernVault' || !root) {
      root = '/apps/卡面存储';
    }
    if (!root.startsWith('/')) root = '/' + root;
    if (root.endsWith('/')) root = root.substring(0, root.length - 1);

    const cleanPath = path.trim();
    // If path is already a full absolute path starting with root or /apps/
    if (cleanPath.startsWith(root + '/') || cleanPath === root) {
      return cleanPath;
    }
    if (cleanPath.startsWith('/apps/')) {
      return cleanPath;
    }

    let sub = cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;
    return root + sub;
  }

  async testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }> {
    if (!this.config.accessToken) {
      syncLogger.addLog({
        category: 'baidu',
        level: 'warn',
        title: '连通性测试取消：未提供 Access Token',
        diagnosis: '请先完成授权登录或在输入框中填入百度网盘 Access Token。',
      });
      return { success: false, latencyMs: 0, message: '请先配置百度网盘 Access Token' };
    }

    try {
      const url = `https://pan.baidu.com/rest/2.0/xpan/nas?method=uinfo&access_token=${encodeURIComponent(this.config.accessToken)}`;
      const { data, latencyMs } = await this.fetchApi(url);

      if (data && data.errno === 0) {
        const username = data.baidu_name || data.netdisk_name || '百度网盘用户';
        return {
          success: true,
          latencyMs,
          message: `百度网盘连接成功：用户 ${username} (响应: ${latencyMs}ms)`,
        };
      } else {
        const errno = data?.errno ?? -1;
        const msg = syncLogger.interpretBaiduErrno(errno);
        return {
          success: false,
          latencyMs,
          message: msg,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        latencyMs: 0,
        message: `连接异常: ${err.message}`,
      };
    }
  }

  async ensureDirectory(dirPath: string): Promise<void> {
    // Baidu PCS creates directories automatically on upload
  }

  async uploadFile(remotePath: string, content: string | ArrayBuffer | Uint8Array, mimeType: string = 'application/octet-stream'): Promise<void> {
    const fullPath = this.normalizePath(remotePath);
    let buffer: ArrayBuffer;

    if (typeof content === 'string') {
      buffer = new TextEncoder().encode(content).buffer as ArrayBuffer;
    } else if (content instanceof Uint8Array) {
      buffer = content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) as ArrayBuffer;
    } else {
      buffer = content;
    }

    const fileName = fullPath.split('/').pop() || 'file.bin';
    const uploadUrl = `https://d.pcs.baidu.com/rest/2.0/pcs/file?method=upload&access_token=${encodeURIComponent(this.config.accessToken)}&path=${encodeURIComponent(fullPath)}&ondup=overwrite`;

    const formData = new FormData();
    formData.append('file', new Blob([buffer], { type: mimeType }), fileName);

    const { data, ok } = await this.fetchApi(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!ok || data?.error || (data?.error_code && data.error_code !== 0)) {
      throw new Error(`百度网盘上传失败: ${data?.error_msg || data?.error || data?.error_code || '连接服务返回异常'}`);
    }
  }

  async downloadFile(remotePath: string): Promise<ArrayBuffer> {
    const fullPath = this.normalizePath(remotePath);

    // Tier 1: Try direct download via Baidu PCS API
    try {
      const downloadUrl = `https://d.pcs.baidu.com/rest/2.0/pcs/file?method=download&access_token=${encodeURIComponent(this.config.accessToken)}&path=${encodeURIComponent(fullPath)}`;
      const res = await this.fetchApi(downloadUrl);

      const hasError =
        (res.data && (res.data.error_code || res.data.errno || (typeof res.data.error === 'string' && res.data.error !== ''))) ||
        res.status >= 400;

      if (!hasError && res.rawBuffer && res.rawBuffer.byteLength > 0) {
        return res.rawBuffer;
      }
    } catch (err: any) {
      console.warn(`Baidu PCS tier 1 download failed for ${fullPath}, attempting tier 2 xpan filemetas...`, err.message);
    }

    // Tier 2: Fallback via xpan filemetas dlink (Netdisk standard download flow)
    try {
      const parentDir = fullPath.substring(0, fullPath.lastIndexOf('/')) || '/';
      const fileName = fullPath.substring(fullPath.lastIndexOf('/') + 1);

      // List parent directory or search to find the file's fs_id
      const listUrl = `https://pan.baidu.com/rest/2.0/xpan/file?method=list&dir=${encodeURIComponent(parentDir)}&access_token=${encodeURIComponent(this.config.accessToken)}`;
      const listRes = await this.fetchApi(listUrl);

      let targetItem: any = null;
      if (listRes.data?.list && Array.isArray(listRes.data.list)) {
        targetItem = listRes.data.list.find((it: any) => it.server_filename === fileName || it.path === fullPath);
      }

      if (!targetItem?.fs_id) {
        // Try searching if listing didn't find it
        const searchUrl = `https://pan.baidu.com/rest/2.0/xpan/file?method=search&dir=${encodeURIComponent(parentDir)}&key=${encodeURIComponent(fileName)}&access_token=${encodeURIComponent(this.config.accessToken)}`;
        const searchRes = await this.fetchApi(searchUrl);
        if (searchRes.data?.list && Array.isArray(searchRes.data.list)) {
          targetItem = searchRes.data.list.find((it: any) => it.server_filename === fileName || it.path === fullPath);
        }
      }

      if (targetItem?.fs_id) {
        const metasUrl = `https://pan.baidu.com/rest/2.0/xpan/multimedia?method=filemetas&access_token=${encodeURIComponent(this.config.accessToken)}&fsids=[${targetItem.fs_id}]&dlink=1`;
        const metasRes = await this.fetchApi(metasUrl);
        const dlink = metasRes.data?.list?.[0]?.dlink;

        if (dlink) {
          const finalDownloadUrl = `${dlink}&access_token=${encodeURIComponent(this.config.accessToken)}`;
          const dlinkRes = await this.fetchApi(finalDownloadUrl, {
            headers: {
              'User-Agent': 'pan.baidu.com',
            },
          });

          if (dlinkRes.rawBuffer && dlinkRes.rawBuffer.byteLength > 0) {
            return dlinkRes.rawBuffer;
          }
        }
      }
    } catch (tier2Err: any) {
      console.warn(`Baidu tier 2 dlink download failed for ${fullPath}:`, tier2Err.message);
    }

    throw new Error(`百度网盘下载失败：无法从 PCS 或 xpan 节点拉取文件 (${remotePath})。请确认网盘中文件是否存在且未被删除。`);
  }

  async deleteFile(remotePath: string): Promise<void> {
    const fullPath = this.normalizePath(remotePath);
    const url = `https://pan.baidu.com/rest/2.0/xpan/file?method=filemanager&opera=delete&access_token=${encodeURIComponent(this.config.accessToken)}`;
    
    const formData = new FormData();
    formData.append('filelist', JSON.stringify([fullPath]));
    
    const { data } = await this.fetchApi(url, {
      method: 'POST',
      body: formData,
    });

    if (data && data.errno !== 0 && data.errno !== -9) {
      throw new Error(`百度网盘删除失败: 错误码 ${data.errno}`);
    }
  }

  async listFiles(dirPath: string): Promise<RemoteFileInfo[]> {
    const fullPath = this.normalizePath(dirPath);
    const url = `https://pan.baidu.com/rest/2.0/xpan/file?method=list&dir=${encodeURIComponent(fullPath)}&access_token=${encodeURIComponent(this.config.accessToken)}`;
    
    const { data } = await this.fetchApi(url);
    if (!data || data.errno !== 0 || !Array.isArray(data.list)) {
      return [];
    }

    return data.list.map((item: any) => ({
      name: item.server_filename,
      path: item.path,
      size: item.size,
      lastModified: item.server_mtime ? new Date(item.server_mtime * 1000).toISOString() : undefined,
    }));
  }
}

