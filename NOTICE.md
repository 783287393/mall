# NOTICE — 第三方资源与许可证说明

本仓库为课程实验（《开源软件与新技术》实验 02）的二次开发结果，基线为上游
开源项目，按上游许可证使用；本实验新增内容仅限 MIT 兼容范围内。

## 上游项目

| 资源 | 来源 | 固定版本/Commit | 许可证 |
|---|---|---|---|
| Medusa（Commerce 核心） | https://github.com/medusajs/medusa | DTC Starter 快照固定 2.20.1 | MIT（开源核心）；企业级材料另有许可，未使用 |
| DTC Starter | https://github.com/medusajs/dtc-starter | `19e8a6fbe5fea5a385e9502409908bfbebbecf526` | MIT |
| Next.js | https://nextjs.org | 随仓库锁文件（pnpm-lock.yaml） | MIT |
| PostgreSQL / Redis / pnpm | 官方渠道安装 | 见 README | 各自开源许可 |

## 商品图片

店面演示商品图沿用 DTC Starter 默认占位图（picsum.photos 与 Medusa S3 占位
URL），未引入第三方版权图片；实验室商品（杯子/帽子/连帽衫等）为虚构商品，
无真实品牌关联。

## 本实验新增内容（全部原创）

- `apps/backend/src/modules/wishlist/`、`apps/backend/src/api/store/wishlist/`
- `apps/backend/src/scripts/seed-lab-products.ts`
- `apps/backend/src/integration-tests/`
- `apps/storefront/src/modules/wishlist/`、`src/lib/data/wishlist.ts`、
  `src/app/[countryCode]/(main)/wishlist/`
- 对 `apps/backend/medusa-config.ts`、店面 `nav`/`product template` 的最小集成改动

## 敏感配置

- 本仓库 `.gitignore` 已排除 `apps/backend/.env`、`apps/storefront/.env.local`。
- `apps/backend/.env.test` 仅含**本地实验专用**数据库/凭据（测试库专用账号），
  不作为生产配置使用；对外发布前应替换为占位符。
