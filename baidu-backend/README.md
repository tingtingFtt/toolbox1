# 独立百度网盘连接服务

这是可单独部署的后端目录，负责设备码申请、授权轮询及百度网盘代理。前端仍由 GitHub Pages 托管。部署时只需要本目录，不需要 React、Vite、前端构建结果或项目根目录的依赖。

运行环境：Node.js 22 或更新版本。没有第三方 npm 依赖，不需要安装依赖或执行构建。

## 本机准备

进入 `baidu-backend`，将 `.env.example` 复制为 `.env`，再编辑配置。已有 `.env` 时不要覆盖。

PowerShell：

```powershell
cd baidu-backend
Copy-Item .env.example .env
npm run start:env
```

macOS / Linux：

```bash
cd baidu-backend
cp .env.example .env
npm run start:env
```

编辑配置后启动服务：`.env` 仅在 `start:env` 模式自动加载。默认 `npm start` 使用系统/托管平台环境变量。

| 配置 | 用途 |
| --- | --- |
| `BAIDU_APP_KEY` | 百度应用 AppKey；网页高级选项需填写同一个值 |
| `BAIDU_APP_SECRET` | 百度应用 AppSecret；建议只配置在后端，与 AppKey 一起填写 |
| `ALLOWED_ORIGINS` | 允许的网页 Origin，逗号分隔，不带路径；当前网页为 `https://tingtingftt.github.io` |
| `PORT` | 监听端口，默认 `3000`，支持托管平台自动提供 |
| `HOST` | 默认 `0.0.0.0`；仅本机使用可设置 `127.0.0.1` |
| `MAX_UPLOAD_MB` | 单次上传大小上限，默认 `100` MiB |
| `UPSTREAM_TIMEOUT_MS` | 百度接口请求超时，默认 `120000` 毫秒 |

两项百度凭证都留空时服务仍可启动并执行健康检查，但授权需要在网页提供应用凭证。只设置服务端 AppSecret、未设置 AppKey 会拒绝启动，避免把服务端密钥用于其他应用。服务端配置了 AppKey 后，会拒绝网页传入不一致的 AppKey。

## 以后部署

普通 Node.js 托管：设置项目根目录为 `baidu-backend`，Node.js 版本为 22 或更新版本；无需构建命令；启动命令为 `npm start`。在托管平台设置环境变量并启用 HTTPS。此目录也可独立复制到其他仓库。

Docker（在本目录执行）：

```bash
docker build -t toolbox1-baidu-backend .
docker run --env-file .env -p 3000:3000 toolbox1-baidu-backend
```

Docker 只复制运行代码，不会把 `.env` 或密钥打包进镜像。外网访问需要 HTTPS 入口/反向代理；此服务本身监听 HTTP。

部署完成后：

1. 访问 `https://您的服务地址/api/health`，应得到 `status: "ok"`。
2. 网页「设置 → 网盘同步与回滚 → 百度网盘连接服务地址」填写 `https://您的服务地址`。
3. 点击「检查连接服务」，确认可用后使用扫码登录。

连接服务地址不要填 GitHub 仓库地址或 GitHub Pages 网页地址。手机和平板的 `localhost` 指向设备本身；跨设备使用需要可访问的 HTTPS 服务地址。

## 接口与测试

| 接口 | 方法 | 内容 |
| --- | --- | --- |
| `/api/health` | GET / HEAD | 服务健康检查，无需凭证 |
| `/api/baidu-device-code` | GET / POST | 申请设备码，字段 `client_id`；也可使用服务端 AppKey |
| `/api/baidu-poll-token` | POST | JSON 字段 `code`、`client_id`；AppSecret 优先使用服务端配置 |
| `/api/baidu-proxy?url=…` | GET / POST / HEAD | 百度网盘接口转发，支持二进制与 multipart 上传 |

```bash
npm run check
npm test
```

测试通过模拟百度响应验证协议、错误处理及代理字节，不会访问真实网盘、上传用户数据或使用真实密钥。GitHub 工作流自动执行本目录测试，不会自动部署后端。

## 安全边界

- 代理仅允许指定的百度 HTTPS 主机，并检查每次重定向，禁止其他站点、非 HTTPS、URL 内凭证和自定义端口。
- 不记录 Token、AppSecret、完整网盘请求 URL 或文件内容；浏览器到服务端的 Token 换取只接受 POST。
- 不接受任意网页 Origin，不启用 `*`。`ALLOWED_ORIGINS` 不是身份认证，不能阻止非浏览器客户端访问。若公开运行个人服务，还应由托管平台/反向代理设置适合您的访问控制、请求限额及监控；本项目不包含多用户身份系统。
- 应用密钥通过环境变量管理。不要把真实 `.env` 提交 GitHub，也不要在网页填陌生人的连接服务地址。
- 本目录不包含 WebDAV 等通用代理，不托管前端页面，也不替用户保管网盘文件。

根目录的 `server.ts` 已复用相同接口实现，避免完整服务与独立后端出现两套逻辑。
