import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '100mb' }));
  app.use(express.raw({ type: '*/*', limit: '100mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Baidu Device Code generation endpoint (for In-App QR Code Login)
  app.all('/api/baidu-device-code', async (req, res) => {
    try {
      const clientId = (req.query.client_id || req.body?.client_id || process.env.BAIDU_APP_KEY || '') as string;
      const scope = (req.query.scope || req.body?.scope || 'basic,netdisk') as string;

      if (!clientId || clientId.trim() === '') {
        return res.status(200).json({
          error: 'unconfigured_client',
          error_description: '尚未配置百度网盘应用 AppKey。可在模态框中切换至【直接填入 Token】快速绑定，或在【自定义凭证】中填写。',
          unconfigured: true,
        });
      }

      const params = new URLSearchParams();
      params.append('client_id', clientId.trim());
      params.append('response_type', 'device_code');
      params.append('scope', scope);

      const url = `https://openapi.baidu.com/oauth/2.0/device/code?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'pan.baidu.com',
          Accept: 'application/json',
        },
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (err: any) {
      res.status(500).json({
        error: 'Failed to generate device code',
        message: err.message || 'Network error',
      });
    }
  });

  // Baidu Device Code polling endpoint to exchange device code for access token
  app.all('/api/baidu-poll-token', async (req, res) => {
    try {
      const code = (req.query.code || req.body?.code || req.query.device_code || req.body?.device_code) as string;
      const clientId = (req.query.client_id || req.body?.client_id || process.env.BAIDU_APP_KEY || '') as string;
      const clientSecret = (req.query.client_secret || req.body?.client_secret || process.env.BAIDU_APP_SECRET || '') as string;

      if (!code) {
        return res.status(400).json({ error: 'Missing device code parameter' });
      }

      // Baidu OAuth 2.0 device_token token exchange
      const tokenUrl = 'https://openapi.baidu.com/oauth/2.0/token';
      const formParams = new URLSearchParams();
      formParams.append('grant_type', 'device_token');
      formParams.append('code', code);
      if (clientId) {
        formParams.append('client_id', clientId.trim());
      }
      if (clientSecret) {
        formParams.append('client_secret', clientSecret.trim());
      }

      // First try POST form-urlencoded
      let response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'pan.baidu.com',
          Accept: 'application/json',
        },
        body: formParams.toString(),
      });

      let data = await response.json();

      // If POST failed or returned error other than authorization_pending, try GET fallback
      if (!data.access_token && data.error && data.error !== 'authorization_pending' && clientId) {
        try {
          const getUrl = `${tokenUrl}?grant_type=device_token&code=${encodeURIComponent(code)}&client_id=${encodeURIComponent(
            clientId.trim()
          )}${clientSecret ? `&client_secret=${encodeURIComponent(clientSecret.trim())}` : ''}`;
          const getRes = await fetch(getUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'pan.baidu.com',
              Accept: 'application/json',
            },
          });
          const getData = await getRes.json();
          if (getData.access_token || (!data.access_token && getData.error === 'authorization_pending')) {
            data = getData;
          }
        } catch {
          // Keep original response
        }
      }

      res.status(response.status).json(data);
    } catch (err: any) {
      res.status(500).json({
        error: 'Failed to poll token',
        message: err.message || 'Network error',
      });
    }
  });

  // Baidu OpenAPI Proxy endpoint
  // Allows the frontend to make requests to Baidu without browser CORS restrictions
  app.all('/api/baidu-proxy', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing "url" query parameter in proxy request' });
    }

    try {
      // Validate target URL domain for security
      const parsedUrl = new URL(targetUrl);
      const allowedHosts = [
        'pan.baidu.com',
        'pcs.baidu.com',
        'd.pcs.baidu.com',
        'openapi.baidu.com',
        'c.pcs.baidu.com',
        'baidupcs.com',
        'baidu.com',
      ];

      const isAllowed = allowedHosts.some((h) => parsedUrl.hostname === h || parsedUrl.hostname.endsWith('.' + h));
      if (!isAllowed) {
        return res.status(403).json({ error: `Host "${parsedUrl.hostname}" is not allowed for Baidu proxy` });
      }

      // Prepare headers
      const forwardHeaders: Record<string, string> = {
        'User-Agent': 'pan.baidu.com',
      };

      if (req.headers['authorization']) {
        forwardHeaders['authorization'] = req.headers['authorization'] as string;
      }
      if (req.headers['content-type']) {
        forwardHeaders['content-type'] = req.headers['content-type'] as string;
      }
      if (req.headers['range']) {
        forwardHeaders['range'] = req.headers['range'] as string;
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers: forwardHeaders,
        signal: AbortSignal.timeout(120000), // 120s timeout for large file sync
      };

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        if (Buffer.isBuffer(req.body)) {
          fetchOptions.body = req.body;
        } else if (typeof req.body === 'object' && Object.keys(req.body).length > 0) {
          fetchOptions.body = JSON.stringify(req.body);
          if (!forwardHeaders['content-type']) {
            forwardHeaders['content-type'] = 'application/json';
          }
        }
      }

      console.log(`[Baidu Proxy Request]: ${req.method} ${targetUrl}`, {
        contentType: forwardHeaders['content-type'],
        hasBody: !!fetchOptions.body,
      });

      const baiduResponse = await fetch(targetUrl, fetchOptions);

      // Copy response headers
      res.status(baiduResponse.status);
      const contentType = baiduResponse.headers.get('content-type');
      if (contentType) {
        res.setHeader('content-type', contentType);
      }
      const contentDisposition = baiduResponse.headers.get('content-disposition');
      if (contentDisposition) {
        res.setHeader('content-disposition', contentDisposition);
      }
      const contentLength = baiduResponse.headers.get('content-length');
      if (contentLength) {
        res.setHeader('content-length', contentLength);
      }

      const arrayBuf = await baiduResponse.arrayBuffer();
      res.send(Buffer.from(arrayBuf));
    } catch (err: any) {
      console.error('[Baidu Proxy Error]:', err);
      res.status(502).json({
        errno: -1,
        error: 'Proxy network dispatch error',
        message: err.message || 'Failed to connect to upstream server',
      });
    }
  });

  // Generic WebDAV / Cloud Storage Proxy for CORS-restricted WebDAV endpoints
  app.all('/api/webdav-proxy', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing "url" query parameter' });
    }

    try {
      const forwardHeaders: Record<string, string> = {};
      const copyHeaders = ['authorization', 'content-type', 'depth', 'destination', 'overwrite'];
      for (const h of copyHeaders) {
        if (req.headers[h]) {
          forwardHeaders[h] = req.headers[h] as string;
        }
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers: forwardHeaders,
      };

      if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'PROPFIND') {
        if (Buffer.isBuffer(req.body)) {
          fetchOptions.body = req.body;
        }
      }

      const webdavResponse = await fetch(targetUrl, fetchOptions);
      res.status(webdavResponse.status);
      const contentType = webdavResponse.headers.get('content-type');
      if (contentType) {
        res.setHeader('content-type', contentType);
      }

      const arrayBuf = await webdavResponse.arrayBuffer();
      res.send(Buffer.from(arrayBuf));
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Note: express v5 requires *all
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
