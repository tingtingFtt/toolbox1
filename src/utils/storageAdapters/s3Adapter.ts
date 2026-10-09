import { IStorageAdapter, RemoteFileInfo } from './baseAdapter';
import { S3Config } from '../../types/cloudSync';
import { calculateSha256 } from '../cryptoEngine';

/**
 * Lightweight browser-native AWS Signature Version 4 (SigV4) S3 Client
 * Supports AWS S3, Cloudflare R2, MinIO, Alibaba OSS, Tencent COS
 */
export class S3Adapter implements IStorageAdapter {
  private config: S3Config;

  constructor(config: S3Config) {
    this.config = config;
  }

  private async hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
    const enc = new TextEncoder();
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      key instanceof Uint8Array ? key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer : key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    return await window.crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
  }

  private async getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Promise<ArrayBuffer> {
    const enc = new TextEncoder();
    const kDate = await this.hmacSha256(enc.encode('AWS4' + key), dateStamp);
    const kRegion = await this.hmacSha256(kDate, regionName);
    const kService = await this.hmacSha256(kRegion, serviceName);
    return await this.hmacSha256(kService, 'aws4_request');
  }

  private getNormalizedUrl(objectKey: string = ''): URL {
    let endpoint = this.config.endpoint.trim();
    if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
      endpoint = 'https://' + endpoint;
    }
    const url = new URL(endpoint);
    let key = objectKey.trim();
    if (key.startsWith('/')) key = key.substring(1);

    // If bucket is not in hostname and bucket provided
    if (this.config.bucket && !url.hostname.startsWith(this.config.bucket + '.')) {
      if (url.pathname === '/' || url.pathname === '') {
        url.pathname = '/' + this.config.bucket + (key ? '/' + key : '');
      } else {
        url.pathname = url.pathname.replace(/\/$/, '') + '/' + this.config.bucket + (key ? '/' + key : '');
      }
    } else {
      url.pathname = (url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '')) + (key ? '/' + key : '');
    }
    return url;
  }

  private async signRequest(method: string, objectKey: string, body?: ArrayBuffer | Uint8Array | string, contentType?: string): Promise<{ url: string; headers: Record<string, string> }> {
    const url = this.getNormalizedUrl(objectKey);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);
    const region = this.config.region || 'auto';
    const service = 's3';

    let payloadBuffer: ArrayBuffer;
    if (!body) {
      payloadBuffer = new ArrayBuffer(0);
    } else if (typeof body === 'string') {
      payloadBuffer = new TextEncoder().encode(body).buffer;
    } else if (body instanceof Uint8Array) {
      payloadBuffer = body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength) as ArrayBuffer;
    } else {
      payloadBuffer = body;
    }

    const payloadHash = await calculateSha256(payloadBuffer);
    const host = url.host;

    const headers: Record<string, string> = {
      host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
    };
    if (contentType) {
      headers['content-type'] = contentType;
    }

    const signedHeaders = Object.keys(headers).sort().join(';');
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map((k) => `${k}:${headers[k]}\n`)
      .join('');

    const canonicalRequest = [
      method,
      url.pathname,
      url.search ? url.search.substring(1) : '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const canonicalRequestHash = await calculateSha256(new TextEncoder().encode(canonicalRequest).buffer);
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

    const signingKey = await this.getSignatureKey(this.config.secretAccessKey, dateStamp, region, service);
    const signatureBuffer = await this.hmacSha256(signingKey, stringToSign);
    const signature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    headers['Authorization'] = `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return { url: url.toString(), headers };
  }

  async testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const startTime = performance.now();
    try {
      const { url, headers } = await this.signRequest('HEAD', '');
      const res = await fetch(url, { method: 'HEAD', headers });
      const latencyMs = Math.round(performance.now() - startTime);

      if (res.ok || res.status === 200 || res.status === 204) {
        return { success: true, latencyMs, message: `S3 存储桶连接成功 (延迟: ${latencyMs}ms)` };
      } else if (res.status === 403) {
        return { success: false, latencyMs, message: 'S3 权限拒绝：AccessKey 或 SecretKey 无效' };
      } else if (res.status === 404) {
        return { success: false, latencyMs, message: 'S3 桶不存在或 Bucket 名字错误' };
      } else {
        return { success: false, latencyMs, message: `S3 响应错误: HTTP ${res.status}` };
      }
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - startTime);
      return { success: false, latencyMs, message: `S3 连接失败: ${err.message || '网络无法访问接入点'}` };
    }
  }

  async ensureDirectory(dirPath: string): Promise<void> {
    // S3 is a flat object storage, directories are virtual prefixes
  }

  async uploadFile(remotePath: string, content: string | ArrayBuffer | Uint8Array, mimeType: string = 'application/octet-stream'): Promise<void> {
    let key = remotePath;
    if (this.config.rootPath) {
      const prefix = this.config.rootPath.replace(/^\/+|\/+$/g, '');
      key = prefix ? `${prefix}/${remotePath.replace(/^\/+/, '')}` : remotePath.replace(/^\/+/, '');
    }

    const { url, headers } = await this.signRequest('PUT', key, content, mimeType);
    let body: BodyInit;
    if (typeof content === 'string') {
      body = content;
    } else if (content instanceof Uint8Array) {
      body = content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) as ArrayBuffer;
    } else {
      body = content;
    }

    const res = await fetch(url, { method: 'PUT', headers, body });
    if (!res.ok) {
      throw new Error(`S3 上传失败: HTTP ${res.status} (${remotePath})`);
    }
  }

  async downloadFile(remotePath: string): Promise<ArrayBuffer> {
    let key = remotePath;
    if (this.config.rootPath) {
      const prefix = this.config.rootPath.replace(/^\/+|\/+$/g, '');
      key = prefix ? `${prefix}/${remotePath.replace(/^\/+/, '')}` : remotePath.replace(/^\/+/, '');
    }

    const { url, headers } = await this.signRequest('GET', key);
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) {
      throw new Error(`S3 下载失败: HTTP ${res.status} (${remotePath})`);
    }
    return await res.arrayBuffer();
  }

  async deleteFile(remotePath: string): Promise<void> {
    let key = remotePath;
    if (this.config.rootPath) {
      const prefix = this.config.rootPath.replace(/^\/+|\/+$/g, '');
      key = prefix ? `${prefix}/${remotePath.replace(/^\/+/, '')}` : remotePath.replace(/^\/+/, '');
    }

    const { url, headers } = await this.signRequest('DELETE', key);
    const res = await fetch(url, { method: 'DELETE', headers });
    if (!res.ok && res.status !== 404) {
      throw new Error(`S3 删除失败: HTTP ${res.status}`);
    }
  }

  async listFiles(dirPath: string): Promise<RemoteFileInfo[]> {
    let prefix = dirPath.replace(/^\/+|\/+$/g, '');
    if (this.config.rootPath) {
      const root = this.config.rootPath.replace(/^\/+|\/+$/g, '');
      prefix = root ? (prefix ? `${root}/${prefix}` : root) : prefix;
    }
    if (prefix && !prefix.endsWith('/')) prefix += '/';

    const urlObj = this.getNormalizedUrl('');
    urlObj.searchParams.set('list-type', '2');
    if (prefix) urlObj.searchParams.set('prefix', prefix);

    const { url, headers } = await this.signRequest('GET', '', undefined);
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) {
      return [];
    }

    const xmlText = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const contents = doc.querySelectorAll('Contents');
    const results: RemoteFileInfo[] = [];

    contents.forEach((c) => {
      const key = c.querySelector('Key')?.textContent || '';
      const size = parseInt(c.querySelector('Size')?.textContent || '0', 10);
      const lastModified = c.querySelector('LastModified')?.textContent || undefined;
      const etag = c.querySelector('ETag')?.textContent || undefined;

      if (key && !key.endsWith('/')) {
        const name = key.split('/').filter(Boolean).pop() || '';
        results.push({ name, path: key, size, lastModified, etag });
      }
    });

    return results;
  }
}
