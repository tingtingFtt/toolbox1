import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { createBaiduHandler, readBaiduConfig } from './handler.mjs';

export function createBaiduServer(options = {}) {
  const server = createServer(createBaiduHandler(options));
  server.requestTimeout = 120000;
  server.headersTimeout = 30000;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT 必须是 1 至 65535 之间的整数。');
  const server = createBaiduServer({ config: readBaiduConfig() });
  server.listen(port, process.env.HOST || '0.0.0.0', () => console.log(`百度网盘连接服务已启动，端口 ${port}`));
  const shutdown = () => server.close(() => process.exit(0));
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
