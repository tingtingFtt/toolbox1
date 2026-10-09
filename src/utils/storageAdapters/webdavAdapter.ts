import { IStorageAdapter, RemoteFileInfo } from './baseAdapter';
import { WebDAVConfig } from '../../types/cloudSync';

export class WebDAVAdapter implements IStorageAdapter {
  private config: WebDAVConfig;

  constructor(config: WebDAVConfig) {
    this.config = config;
  }

  private getAuthHeader(): string {
    const credentials = `${this.config.username}:${this.config.password}`;
    return `Basic ${window.btoa(unescape(encodeURIComponent(credentials)))}`;
  }

  private normalizeUrl(path: string): string {
    let base = this.config.url.trim();
    if (!base.endsWith('/')) base += '/';
    let sub = path.trim();
    if (sub.startsWith('/')) sub = sub.substring(1);
    return base + sub;
  }

  async testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const startTime = performance.now();
    try {
      const rootUrl = this.normalizeUrl(this.config.rootPath || '/');
      const res = await fetch(rootUrl, {
        method: 'PROPFIND',
        headers: {
          Authorization: this.getAuthHeader(),
          Depth: '0',
        },
      });

      const latencyMs = Math.round(performance.now() - startTime);

      // 207 Multi-Status, 200 OK, 404 (needs creation)
      if (res.status === 207 || res.status === 200) {
        return { success: true, latencyMs, message: `连接成功 (延迟: ${latencyMs}ms)` };
      } else if (res.status === 404) {
        // Try creating root directory
        await this.ensureDirectory(this.config.rootPath || '/');
        return { success: true, latencyMs, message: `连接成功，已自动创建根目录 (延迟: ${latencyMs}ms)` };
      } else if (res.status === 401 || res.status === 403) {
        return { success: false, latencyMs, message: 'WebDAV 认证失败：用户名或密码/Token 错误' };
      } else {
        return { success: false, latencyMs, message: `WebDAV 响应状态异常: HTTP ${res.status} ${res.statusText}` };
      }
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return { success: false, latencyMs, message: `网络连接失败: ${err.message || '请检查服务器地址或跨域设置'}` };
    }
  }

  async ensureDirectory(dirPath: string): Promise<void> {
    const parts = dirPath.split('/').filter(Boolean);
    let currentPath = '';

    for (const part of parts) {
      currentPath += '/' + part;
      const targetUrl = this.normalizeUrl(currentPath);
      try {
        await fetch(targetUrl, {
          method: 'MKCOL',
          headers: {
            Authorization: this.getAuthHeader(),
          },
        });
      } catch {
        // Ignore if directory already exists
      }
    }
  }

  async uploadFile(remotePath: string, content: string | ArrayBuffer | Uint8Array, mimeType: string = 'application/octet-stream'): Promise<void> {
    // Ensure parent directory exists first
    const lastSlashIndex = remotePath.lastIndexOf('/');
    if (lastSlashIndex > 0) {
      const parentDir = remotePath.substring(0, lastSlashIndex);
      await this.ensureDirectory(parentDir);
    }

    const targetUrl = this.normalizeUrl(remotePath);
    let body: BodyInit;
    if (typeof content === 'string') {
      body = content;
    } else if (content instanceof Uint8Array) {
      body = content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) as ArrayBuffer;
    } else {
      body = content;
    }

    const res = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-Type': mimeType,
      },
      body,
    });

    if (!res.ok && res.status !== 201 && res.status !== 204) {
      throw new Error(`WebDAV 上传失败: HTTP ${res.status} ${res.statusText} (${remotePath})`);
    }
  }

  async downloadFile(remotePath: string): Promise<ArrayBuffer> {
    const targetUrl = this.normalizeUrl(remotePath);
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Authorization: this.getAuthHeader(),
      },
    });

    if (!res.ok) {
      throw new Error(`WebDAV 文件下载失败: HTTP ${res.status} (${remotePath})`);
    }

    return await res.arrayBuffer();
  }

  async deleteFile(remotePath: string): Promise<void> {
    const targetUrl = this.normalizeUrl(remotePath);
    const res = await fetch(targetUrl, {
      method: 'DELETE',
      headers: {
        Authorization: this.getAuthHeader(),
      },
    });

    if (!res.ok && res.status !== 404) {
      throw new Error(`WebDAV 文件删除失败: HTTP ${res.status}`);
    }
  }

  async listFiles(dirPath: string): Promise<RemoteFileInfo[]> {
    const targetUrl = this.normalizeUrl(dirPath);
    const res = await fetch(targetUrl, {
      method: 'PROPFIND',
      headers: {
        Authorization: this.getAuthHeader(),
        Depth: '1',
      },
    });

    if (res.status === 404) {
      return [];
    }

    if (!res.ok && res.status !== 207) {
      throw new Error(`WebDAV 获取列表失败: HTTP ${res.status}`);
    }

    const xmlText = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const responses = doc.querySelectorAll('response, d\\:response');
    const results: RemoteFileInfo[] = [];

    responses.forEach((resp) => {
      const hrefEl = resp.querySelector('href, d\\:href');
      const href = hrefEl?.textContent || '';
      
      const contentLengthEl = resp.querySelector('getcontentlength, d\\:getcontentlength');
      const lastModifiedEl = resp.querySelector('getlastmodified, d\\:getlastmodified');
      const isCollection = !!resp.querySelector('collection, d\\:collection');

      if (!isCollection && href) {
        const decodedHref = decodeURIComponent(href);
        const name = decodedHref.split('/').filter(Boolean).pop() || '';
        results.push({
          name,
          path: decodedHref,
          size: parseInt(contentLengthEl?.textContent || '0', 10),
          lastModified: lastModifiedEl?.textContent || undefined,
        });
      }
    });

    return results;
  }
}
