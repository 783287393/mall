<p align="center">
  <a href="https://www.medusajs.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/59018053/229103275-b5e482bb-4601-46e6-8142-244f531cebdb.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    <img alt="Medusa logo" src="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    </picture>
  </a>
</p>
<h1 align="center">
  Medusa DTC Starter
</h1>

<h4 align="center">
  <a href="https://docs.medusajs.com">Documentation</a> |
  <a href="https://www.medusajs.com">Website</a>
</h4>

<p align="center">
  Building blocks for digital commerce
</p>
<p align="center">
  <a href="https://github.com/medusajs/medusa/blob/develop/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="Medusa is released under the MIT license." />
  </a>
  <a href="https://circleci.com/gh/medusajs/medusa">
    <img src="https://circleci.com/gh/medusajs/medusa.svg?style=shield" alt="Current CircleCI build status." />
  </a>
  <a href="https://github.com/medusajs/medusa/blob/develop/CONTRIBUTING.md">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat" alt="PRs welcome!" />
  </a>
    <a href="https://www.producthunt.com/posts/medusa"><img src="https://img.shields.io/badge/Product%20Hunt-%231%20Product%20of%20the%20Day-%23DA552E" alt="Product Hunt"></a>
  <a href="https://discord.gg/xpCwq3Kfn8">
    <img src="https://img.shields.io/badge/chat-on%20discord-7289DA.svg" alt="Discord Chat" />
  </a>
  <a href="https://twitter.com/intent/follow?screen_name=medusajs">
    <img src="https://img.shields.io/twitter/follow/medusajs.svg?label=Follow%20@medusajs" alt="Follow @medusajs" />
  </a>
</p>

# Medusa DTC Starter

A production-ready monorepo starter for direct-to-consumer ecommerce stores powered by Medusa and Next.js. Includes a fully featured storefront with product browsing, cart, checkout, customer accounts, and order management.

## Features

- All of [Medusa's commerce features](https://docs.medusajs.com/resources/commerce-modules)
- Multi-region support with automatic country detection
- Product catalog with variant selection
- Cart with promotion codes
- Multi-step checkout with shipping and payment
- Customer accounts with order history and address management
- Order transfer between accounts

## Getting Started

### Deploy with Medusa Cloud

The fastest way to get started is deploying with [Medusa Cloud](https://cloud.medusajs.com):

1. [Create a Medusa Cloud account](https://cloud.medusajs.com)
2. Deploy this starter directly from your dashboard

### Local Installation

> **Prerequisites:
>
> - [Node.js](https://nodejs.org/) v20+
> - [PostgreSQL](https://www.postgresql.org/) v15+
> - [pnpm](https://pnpm.io/) v10+

1. Clone the repository and install dependencies:

```bash
git clone https://github.com/medusajs/dtc-starter.git
cd dtc-starter
pnpm install
```

2. Set up environment variables for the backend:

```bash
cp apps/backend/.env.template apps/backend/.env
```

3. Set the database URL in `apps/backend.env`:

```bash
# Replace with actual database URL, make sure the database exists.
DATABASE_URL=postgres://postgres:@localhost:5432/medusa-dtc-starter
```

4. Run migrations:

```bash
cd apps/backend
pnpm medusa db:migrate
```

5. Add admin user:

```bash
cd apps/backend
pnpm medusa user -e admin@test.com -p supersecret
```

6. Start Medusa backend:

```bash
cd apps/backend
pnpm dev
```

7. Open the admin dashboard at `localhost:9000/app` and log in. Retrieve your publishable API key at Settings > Publishable API key.

8. Set up environment variables for the storefront:

```bash
cp apps/storefront/.env.template apps/storefront/.env.local
```

9. Update `apps/storefront/.env.local` with your Medusa publishable API key:

```bash
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_6c3...
```

10.  Start storefront:

```bash
cd apps/storefront
pnpm dev
```

The storefront runs on `http://localhost:8000`.

You can slo run the following command from the root to start both backend and storefront:

```bash
pnpm dev
```

## Configuration

The storefront is configured via environment variables in `apps/storefront/.env.local`:

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Publishable API key from your Medusa backend | — |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | URL of your Medusa backend | `http://localhost:9000` |
| `NEXT_PUBLIC_DEFAULT_REGION` | Default region country code | `dk` |
| `NEXT_PUBLIC_BASE_URL` | Base URL of the storefront | `https://localhost:8000` |
| `NEXT_PUBLIC_STRIPE_KEY` | Stripe publishable key (optional) | — |

## Resources

- [Medusa Documentation](https://docs.medusajs.com)
- [Medusa Cloud](https://cloud.medusajs.com)

---

# Lab 02 — 开源在线商城系统二次开发（扩展说明）

> 本实验在固定 Commit `19e8a6f`（Medusa v2.20.1 DTC Starter）之上二次开发，
> 完成「浏览 → 购物车 → 结算 → 下单」全链路，并自主实现**收藏夹（Wishlist）**功能。
> 所有二次开发提交位于分支 `feature/store-extension`（基线之上 5+ commits）。

## 一、运行环境（本机）

| 组件 | 版本/端口 | 说明 |
|---|---|---|
| Node.js / pnpm | pnpm 10.11.1 | Monorepo 包管理 |
| PostgreSQL | 16.9 / 5432 | 服务 `postgresql-x64-16`，库 `medusa-backend` |
| Redis | 6379 | 便携 Redis（`D:\oss-mall\redis`） |
| Medusa 后端 | 9000 | `pnpm dev`（apps/backend） |
| Next.js 店面 | 8000 | `pnpm dev`（apps/storefront） |

数据库连接：`postgres://medusa:medusa2026@localhost:5432/medusa-backend`

## 二、账号

| 角色 | 邮箱 | 密码 |
|---|---|---|
| 管理员（管理端 `/app`） | admin@medusa-lab.test | Lab2026admin |
| 店面演示顾客 | wishlist@medusa-lab.test | Wishlist2026 |

## 三、商品数据（10 个商品）

- Starter 自带 4 个：`t-shirt` / `sweatshirt` / `sweatpants` / `shorts`
- 实验种子 6 个（`apps/backend/src/scripts/seed-lab-products.ts`，幂等）：
  `medusa-coffee-mug`、`medusa-winter-beanie`、`medusa-hoodie-limited`、
  `medusa-socks-3pack`、`medusa-backpack-premium`、`medusa-water-bottle`
- 边界库存：零库存（BEANIE-BLACK=0、SOCKS-3PACK=0）、单件（HOODIE-LTD-M=1）、
  多规格（水瓶 750ML=40 / 1L=25）等

## 四、自主功能：收藏夹 Wishlist

| 层 | 文件 | 说明 |
|---|---|---|
| 模块 | `apps/backend/src/modules/wishlist/` | `wishlist_item` 表 + MedusaService CRUD |
| API | `apps/backend/src/api/store/wishlist/` | GET/POST `/store/wishlist`、DELETE `/store/wishlist/:product_id`，顾客鉴权、幂等 |
| 店面 | `apps/storefront/src/lib/data/wishlist.ts` | Server Actions（get/add/remove，缓存 tag `wishlist`） |
| UI | `apps/storefront/src/modules/wishlist/components/wishlist-button.tsx` | 商品详情页心形收藏按钮（乐观更新） |
| 页面 | `apps/storefront/src/app/[countryCode]/(main)/wishlist/page.tsx` | 收藏列表（价格/缩略图/移除）、空态、未登录跳转 |

## 五、集成测试（27/27 通过）

```bash
cd apps/backend
$env:TEST_TYPE='integration:http'
$env:NODE_OPTIONS='--experimental-vm-modules'
pnpm exec jest --silent=false --runInBand --forceExit
```

- `http/wishlist.spec.ts`（10）— 鉴权/空列表/加购/幂等/400/删除/DB 持久化
- `http/storefront-flow.spec.ts`（9）— 浏览/搜索/详情价/购物车/加行/下单/订单持久化/库存预留
- `http/inventory-boundary.spec.ts`（8）— 零库存/单件/超量/草稿商品下架/重复下单幂等

共享种子 `src/integration-tests/http/utils.ts`：测试库重建初始数据 + 实验商品，
并统一渠道链接，保证店面 API 可见全部商品（双 store 启动特性）。

## 六、演示地址

- 店面首页 http://localhost:8000/dk
- 商品列表 http://localhost:8000/dk/store
- 收藏夹 http://localhost:8000/dk/wishlist（登录后）
- 管理端 http://localhost:9000/app

## 七、系统架构（Mermaid）

```mermaid
flowchart LR
    U[顾客] -->|浏览/搜索/详情| S[Next.js 店面 :8000]
    U -->|加购/结算/下单| S
    U -->|收藏/取消收藏| S
    S -->|Store API x-publishable-api-key + Bearer| A[Medusa Store API :9000]
    A --> P[商品/变体/价格/库存模块]
    A --> C[购物车/支付/订单工作流]
    A --> W[自主模块 wishlist]
    P --> DB[(PostgreSQL medusa-backend)]
    C --> DB
    W --> DB
    C -->|库存预留| P
    M[管理端 /app] --> A
```

## 八、环境版本检查与一键启停

```powershell
node -v            # v20.19+ / 22.12+ / 24 LTS
pnpm -v            # 10.11.1（与锁文件一致）
psql --version     # PostgreSQL 16.x（服务 postgresql-x64-16）
```

一键脚本（本机路径 `D:\oss-mall\scripts\`）：

| 脚本 | 作用 |
|---|---|
| `start-all.bat` | 检查/启动 PostgreSQL 服务与 Redis，然后依次启动后端（9000）与店面（8000），日志写入 `D:\oss-mall\logs\` |
| `stop-all.bat` | 结束店面与后端进程，保留数据库与 Redis 数据（可选停止 Redis） |
| `reset-db.bat` | 重置 `medusa-backend` 库并重跑迁移 + 种子（重建演示数据） |

## 九、演示截图

见 `_agent_output/ppt-*.png`（商品列表、详情页心形、收藏页、购物车、管理端订单），
已用于课堂 PPT。

## 十、提交记录（feature/store-extension）

```
c38eacc test(backend): integration suites for wishlist, storeflow, inventory
2e2da2b feat(storefront): wishlist UI end to end
20a4da6 feat(backend): wishlist module and store API
c799fda feat(backend): seed 6 lab products with boundary inventory
2be0937 chore(root): allow pnpm postinstall for native deps
```
