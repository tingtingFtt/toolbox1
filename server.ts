import express from 'express';
import cors from 'cors';
import path from 'path';
import { createBaiduHandler } from './baidu-backend/handler.mjs';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Reuse the same implementation as the independently deployable Baidu service.
  app.use(createBaiduHandler({ passthrough: true }));
  app.use(cors());
  app.use(express.json({ limit: '100mb' }));
  app.use(express.raw({ type: '*/*', limit: '100mb' }));

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

  app.use('/api', (_req, res) => res.status(404).json({ error: 'api_not_found', message: '请求的后端接口不存在。' }));

  // An API-only service can be hosted separately from GitHub Pages.
  if (!process.argv.includes('--api-only')) {
    if (process.env.NODE_ENV !== 'production' && !process.argv[1]?.endsWith('server.cjs')) {
      const { createServer: createViteServer } = await import('vite');
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
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

