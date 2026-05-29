# 修狗记账 Web 部署版

基于 `修狗记账_标准版产品需求文档_Web部署版.docx` 拆分实现的 P0 核心版全栈项目。

## 技术栈

- 前端：React + Vite + Recharts + lucide-react
- 后端：Node.js + Express
- 数据库：PostgreSQL
- 登录：邮箱密码 + JWT

## 模块

- 认证：注册、登录、JWT 鉴权。
- 记账：收入、支出、转账，支持账单流水、搜索和删除。
- 分类与账户：初始化校园/日常分类和常用账户，支持接口扩展。
- 周期：自然月、每月起始日、固定天数周期。
- 预算：周期总预算和分类预算。
- 统计：首页周期看板、收支趋势、分类占比、账户余额。
- 学生模式：生活费发放日、生活费金额、预算分配方式，并联动账单周期。

## 本地启动

### 手机端快速测试

当前项目支持不安装 PostgreSQL 的本地演示模式，数据保存在 `server/.local-data.json`。

```bash
npm run dev:local
```

服务启动后，电脑和手机连接同一个 Wi-Fi，手机浏览器打开电脑的 WLAN IP 地址：

```text
http://10.203.233.253:5173
```

如果手机打不开，请检查 Windows 防火墙是否允许 Node.js 或端口 `5173`、`4000` 的局域网访问。

### PostgreSQL 正式本地模式

1. 安装依赖：

```bash
npm install
```

2. 准备 PostgreSQL，并复制环境变量：

```bash
copy .env.example .env
```

修改 `.env` 中的 `DATABASE_URL` 和 `JWT_SECRET`。

3. 初始化数据库：

```bash
npm run migrate -w server
```

4. 启动前后端：

```bash
npm run dev
```

默认地址：

- 前端：http://localhost:5173
- 后端：http://localhost:4000

## 部署建议

- 前端部署到 Vercel Hobby，构建命令 `npm run build -w client`，输出目录 `client/dist`。
- 后端部署到 Render Free Web Service，启动命令 `npm run start -w server`。
- 数据库使用 Supabase Free PostgreSQL，把连接串配置到后端环境变量 `DATABASE_URL`。
- `JWT_SECRET`、数据库连接串等敏感信息只配置在云平台环境变量中，不写入前端源码。

免费平台通常存在额度、休眠、带宽或容量限制；Render 免费实例可能空闲休眠，首次访问会变慢。本项目定位为学习、演示、课程提交或小规模试用版本。

## 验收重点

- 用户可以注册登录并生成默认账户、分类和当前账单周期。
- 用户可以在 3 个主要步骤内新增一笔支出。
- 设置非自然月周期后，首页、预算和统计按当前周期展示。
- 开启学生模式后，生活费发放日联动为账单周期起始日。
- 新增账单会写入后端数据库，并影响账户余额与统计。
