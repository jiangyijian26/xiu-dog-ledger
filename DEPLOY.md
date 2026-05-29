# 修狗记账公网部署指南

目标：让项目像 `https://my-168-diet.pages.dev/` 一样通过公网网址访问。

本项目是前后端分离结构，推荐部署组合：

- 前端：Cloudflare Pages
- 后端：Render Web Service
- 数据库：Supabase PostgreSQL

## 1. 准备 GitHub 仓库

将当前项目上传到 GitHub。后续 Cloudflare Pages 和 Render 都从这个仓库自动部署。

## 2. 创建 Supabase 数据库

1. 登录 Supabase，新建项目。
2. 在项目设置中找到 PostgreSQL connection string。
3. 优先给 Render 使用 IPv4 兼容的 pooler/session 连接串。
4. 保存数据库密码，后面会配置到 Render 的 `DATABASE_URL`。

初始化表结构有两种方式：

- 在 Supabase SQL Editor 中粘贴并执行 `database/001_init.sql`。
- 或本地配置 `.env` 后运行：

```bash
npm run migrate
```

## 3. 部署后端到 Render

1. Render 新建 Web Service，选择 GitHub 仓库。
2. Runtime 选择 Node。
3. Build Command：

```bash
npm install
```

4. Start Command：

```bash
npm run start -w server
```

5. Health Check Path：

```text
/health
```

6. 配置环境变量：

```text
DATABASE_URL=你的 Supabase PostgreSQL 连接串
JWT_SECRET=一个足够长的随机字符串
DATABASE_SSL=true
CLIENT_ORIGIN=https://你的前端项目.pages.dev
```

部署完成后，Render 会生成一个类似这样的后端地址：

```text
https://xiu-dog-ledger-api.onrender.com
```

确认健康检查：

```text
https://xiu-dog-ledger-api.onrender.com/health
```

## 4. 部署前端到 Cloudflare Pages

1. Cloudflare Pages 新建项目，连接同一个 GitHub 仓库。
2. Framework preset 选择 React / Vite。
3. Build command：

```bash
npm run build -w client
```

4. Build output directory：

```text
client/dist
```

5. 配置环境变量：

```text
VITE_API_BASE_URL=https://你的 Render 后端域名/api
```

例如：

```text
VITE_API_BASE_URL=https://xiu-dog-ledger-api.onrender.com/api
```

部署成功后，Cloudflare Pages 会生成：

```text
https://你的项目名.pages.dev
```

## 5. 上线验收

- 手机和电脑都能打开同一个 `pages.dev` 地址。
- 注册登录成功。
- 新增账单后刷新页面，数据仍然存在。
- 打开 Render 后端 `/health` 返回 `ok: true`。
- Supabase 数据库中能看到 `users`、`bills` 等表写入数据。

## 注意事项

- `JWT_SECRET` 和 `DATABASE_URL` 只能放在 Render 环境变量里，不要写进前端或公开代码。
- Cloudflare Pages 只部署前端静态资源，不保存数据库数据。
- Render 免费服务如存在休眠，首次访问后端可能会慢一些。
- 如果修改了 `VITE_API_BASE_URL`，需要重新部署 Cloudflare Pages。
