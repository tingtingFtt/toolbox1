# 百度网盘连接与 GitHub Pages

GitHub Pages 部署仅发布 `dist/index.html`，不运行 `server.ts`。因此 `/api/baidu-device-code`、`/api/baidu-poll-token` 和 `/api/baidu-proxy` 必须由单独的后端服务提供。修改 AppKey 或粘贴 Token 无法替代后端代理。

## 运行连接服务

使用 Node.js 22 或更新版本。在项目根目录执行：

```bash
npm ci
npm run build
node dist/server.cjs --api-only
```

服务默认监听 3000 端口，也支持托管平台提供的 `PORT` 环境变量。API-only 模式不会启动 Vite 或托管网页。将服务部署到您自己的 HTTPS 地址后，在网页的「设置 → 云端同步 → 百度网盘连接服务地址」中填写该地址，并点击「检查连接服务」。地址可包含反向代理的子路径，也可包含末尾 `/api`。

本机调试可填写 `http://localhost:3000`。手机和平板不能使用电脑的 localhost；跨设备使用需可访问的 HTTPS 服务地址。

## 配置与授权

在高级选项填写您在百度网盘开放平台创建的应用 AppKey。设备码换取 Token 时使用 AppSecret，可在高级选项填写，也可在连接服务上设置 `BAIDU_APP_SECRET` 环境变量。仅将凭证发送至您自己的服务。

连接服务可用后，点击扫码登录并在百度端同意授权。网页会使用同一个服务验证账号，再显示绑定成功；后续上传、下载和同步也使用该服务。

网页跳转授权使用应用配置的回调地址。授权回跳取得 Token 后，账号验证和网盘同步仍需要连接服务。

## 故障判断

- “当前是静态网页版本”：尚未填写连接服务地址。
- “接口返回了网页”：服务地址指向了静态网页、404 页或网页回退路由。
- “无法访问连接服务”：检查服务是否启动、HTTPS、浏览器跨域限制与网络。
- 百度返回 `invalid_client`：检查 AppKey、AppSecret 和应用授权权限。
- 账号验证失败：保留错误信息排查，不会自动将未验证的 Token 当成绑定成功。

GitHub Pages 的自动部署仍只更新网页；后端代码更新后需在后端托管环境重新部署。
