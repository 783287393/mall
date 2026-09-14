# PR 自审记录

> 本地仓库无法在 GitHub 发起真实 PR，按课程要求以 Feature Branch + 本地
> Code Review 记录 + 测试/运行证据代替，合并前完成一次有文字记录的自审。

## PR #1：feature/store-extension → main（基线 19e8a6f）

- **关联 Issue**：#1、#2、#3
- **分支**：`feature/store-extension`（自基线 `19e8a6f` 检出）
- **提交**：5 个（详见文末 `git log`）
- **运行证据**：
  - 集成测试 27/27 通过（`_agent_output/jest-all2.txt`：`Test Suites: 3 passed`,
    `Tests: 27 passed`）
  - 主链路脚本 `06-store-flow.ps1` 创建订单
    `order_01M2F0PSZDG5TWCFERQ36G16D5`（管理端可见，#1 / €1620 EUR）
  - 收藏 API 脚本 `07-wishlist-api.ps1` 全通过
  - 浏览器演示：匿名跳转登录 → 登录 → 收藏心形实心 → 收藏页 1 件 → 移除 →
    空态 → 再加购；加购后购物车 Cart(1)；管理端登录可见订单 #1

### 自审检查清单（合并前逐项核验）

| # | 检查项 | 结果 | 备注 |
|---|---|---|---|
| 1 | 基线固定、锁文件未混装 | ✅ | 分支从 `19e8a6f` 检出，pnpm 10.11.1 + frozen-lockfile |
| 2 | 未修改 node_modules / 核心框架 | ✅ | 全部改动在 `apps/backend/src/{api,modules,scripts,integration-tests}`、`medusa-config.ts`、`apps/storefront/src`、`package.json` |
| 3 | .env / 密钥未入库 | ✅ | `apps/backend/.env`、`apps/storefront/.env.local` 已被 .gitignore 排除；`.env.test` 为测试库本地凭据（实验专用账号） |
| 4 | 主链路 API 契约正确 | ✅ | 变体 ID 入车、`/store/payment-collections`、`/store/shipping-options?cart_id=`、complete 幂等 |
| 5 | 自主功能有持久化与失败状态 | ✅ | `wishlist_item` 表 + 401/400/幂等；UI 匿名跳转、服务失败回滚 |
| 6 | 测试可重复执行 | ✅ | `pnpm exec jest --runInBand --forceExit`（Windows PowerShell 环境变量写法已记录） |
| 7 | 库存/重复提交边界有证据 | ✅ | 零库存、超量、重复 complete、草稿下架均有用例 |
| 8 | 许可证与来源说明 | ✅ | NOTICE.md + README 记录上游与第三方资源 |
| 9 | 文档可复现 | ✅ | README 含启停、种子、测试、演示流程 |
| 10 | 代码风格与遗留 TODO | ✅ | 无 TODO；路由/模块/组件职责单一 |

### 自审发现并修复的问题（部分）

1. **测试库渠道不一致**：测试库同时存在核心自建 "Medusa Store" 与种子 "Default
   Store"，店面列表只显示第一个 store 渠道的商品 → `seedStore` 统一把全部商品、
   Publishable Key、库存位置链接到首 store 渠道（`linkProductsToSalesChannelWorkflow`
   的 `id` 为渠道、`add` 为商品数组）。
2. **金额/数量断言**：`query.graph` 返回 BigNumber 对象（`{value,precision}`），
   断言前用 `Number()` 归一化；订单行项目数量经 `order.items` 关系读取。
3. **重复提交语义**：Medusa 对已完成的 cart 二次 complete 返回 200 + 同一订单，
   断言改为“同一订单 ID + 数据库仅 1 条”，而非强求 4xx。
4. **搜索等待**：测试内 search index 异步填充，beforeAll 轮询等待后再快照，
   保证每个用例（快照恢复后）搜索索引已就绪。

### Git 过程证据

```text
c38eacc test(backend): integration suites for wishlist, storeflow, inventory
2e2da2b feat(storefront): wishlist UI end to end
20a4da6 feat(backend): wishlist module and store API
c799fda feat(backend): seed 6 lab products with boundary inventory
2be0937 chore(root): allow pnpm postinstall for native deps
19e8a6f chore: update @medusajs/* to v2.20.1 (#58)   ← 固定基线
```

`git log --oneline --graph --decorate --all -n 30` 与 `git shortlog -sne HEAD`
输出见 `_agent_output/git-evidence.txt`。
