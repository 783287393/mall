# 业务规则决策记录 —— 收藏夹（Wishlist）

> 自主设计任务要求的一页决策记录：数据归属、接口、失败状态、重复请求、权限、
> 与商品下架/库存变化的关系。对应 Issue #1。

## 1. 数据归属

- 收藏是**客户数据**：一条记录 = `{id, customer_id, product_id, created_at}`，
  归属当前登录顾客（`req.auth_context.actor_id`），不存在“全局收藏”。
- 存储在后端自定义模块 `wishlist` 的 `wishlist_item` 表（独立迁移
  `Migration20260914035612`），**不是店面本地状态**，因此天然跨设备/跨会话同步
  ——这是选择“登录用户收藏夹及跨设备同步”选项的落地方式。
- 商品主体仍归 `product` 模块，收藏表只存 `product_id` 外键，不复制价格/库存，
  避免双写不一致。

## 2. 接口（Store API）

| 方法 | 路径 | 语义 |
|---|---|---|
| GET | `/store/wishlist` | 当前顾客收藏列表（新→旧） |
| POST | `/store/wishlist` | 加购；已存在返回 `already_exists:true`（幂等） |
| DELETE | `/store/wishlist/:product_id` | 移除；不存在时 no-op 成功（幂等） |

店面通过 Server Actions 调用同一组接口，缓存 tag `wishlist`，增删后
`revalidateTag` 保持列表一致。

## 3. 权限

- 所有接口挂 `authenticate("customer", ["session","bearer"])`；匿名请求返回 401。
- 店面 UI：匿名点击心形 → Server Action 返回 `auth_required` → 跳转
  `/account?wishlist=1`（登录后返回）。

## 4. 重复请求 / 失败状态

- **重复收藏**：POST 幂等（`already_exists`），不产生重复行。
- **重复移除**：DELETE 幂等（no-op 成功）。
- **商品不存在/已下架**：POST 时后端不校验商品（收藏允许保存“已下架但曾收藏”的
  记录），**展示层**用 `getWishlistWithProducts` 把商品 JOIN 回来，商品缺失的
  记录不渲染（下架后收藏项自动隐藏，不报错）。
- **网络/服务失败**：Server Action 返回 `{error:"failed"}`，按钮乐观状态回滚，
  不误导用户。

## 5. 与库存变化的关系

- 收藏**不预留库存**（区别于购物车）。收藏页展示的是商品当前价格与可售状态；
  库存为 0 的商品仍可收藏，但加入购物车时由订单工作流按既有规则拦截。

## 6. 为什么用真实数据

- 收藏列表由后端 `wishlist_item` 表驱动，展示价格来自 `store/products` 实时
  计算价格（`getProductPrice`），演示时以真实商品（Medusa Coffee Mug）与
  真实订单/顾客记录证明非静态页面。
