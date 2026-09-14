# Store API 调用摘要（实验 02）

> 记录「浏览 → 购物车 → 结算 → 订单」主链路与收藏夹（Wishlist）自主接口的
> 方法、URL、关键请求字段、状态码与关键响应字段。凭证已脱敏。
> 完整运行证据见 `_agent_output/06-store-flow.txt` 与 `_agent_output/07-wishlist-api.txt`。

## 0. 公共约定

- Base URL：`http://localhost:9000`（Medusa v2.20.1，固定 Commit `19e8a6f`）
- 店面请求头：`x-publishable-api-key: pk_…`（店面 `.env.local` 中的 Publishable Key）
- 顾客认证（**无 `/store` 前缀**）：
  - 注册 `POST /auth/customer/emailpass/register`
  - 登录 `POST /auth/customer/emailpass`
  - 取本人 `GET /store/customers/me`
  - 建顾客记录 `POST /store/customers`
  - 之后请求头加 `Authorization: Bearer <token>`

## 1. 商品浏览

| 步骤 | 方法/URL | 关键请求字段 | 状态 | 关键响应字段 |
|---|---|---|---|---|
| 商品列表 | `GET /store/products?limit=3&region_id=…&fields=…` | `limit/offset/region_id/fields/is_giftcard` | 200 | `products[].id/handle/title/variants`、`count` |
| 搜索 | `GET /store/products?q=sweatshirt&limit=10` | `q` | 200 | `products[].handle`（含 `sweatshirt`） |
| 商品详情 | `GET /store/products/medusa-coffee-mug?region_id=…&fields=*variants.calculated_price,…` | `region_id`、`fields`（价格必须显式请求） | 200 | `id/handle/title/variants[].prices/calculated_price` |

## 2. 购物车

| 步骤 | 方法/URL | 关键请求字段 | 状态 | 关键响应字段 |
|---|---|---|---|---|
| 创建购物车 | `POST /store/carts` | `region_id` | 200 | `cart.id` |
| 加入行项目 | `POST /store/carts/{id}/line-items` | `variant_id`（**变体 ID 而非商品 ID**）、`quantity` | 200 | `cart.items[].quantity` |
| 修改数量 | `POST /store/carts/{id}/line-items/{line_id}` | `quantity` | 200 | `cart.items[].quantity` |
| 删除行项目 | `DELETE /store/carts/{id}/line-items/{line_id}` | — | 200 | `cart.items` |

## 3. 结算与订单

| 步骤 | 方法/URL | 关键请求字段 | 状态 | 关键响应字段 |
|---|---|---|---|---|
| 填地址/邮箱 | `POST /store/carts/{id}` | `email`、`shipping_address{first_name,last_name,address_1,city,country_code,postal_code}` | 200 | `cart.email` |
| 配送选项 | `GET /store/shipping-options?cart_id={id}` | `cart_id` | 200 | `shipping_options[].id` |
| 选择配送 | `POST /store/carts/{id}/shipping-methods` | `option_id` | 200 | `cart.shipping_methods` |
| 创建支付集合 | `POST /store/payment-collections` | `cart_id` | 200 | `payment_collection.id` |
| 初始化支付会话 | `POST /store/payment-collections/{pc_id}/payment-sessions` | `provider_id: "pp_system_default"` | 200 | `payment_collection.payment_sessions` |
| 完成订单 | `POST /store/carts/{id}/complete` | —（幂等：重复调用返回同一订单） | 200 | `type: "order"`、`order.id`、`order.display_id`、`order.total` |
| 查询订单 | `GET /store/orders/{id}` | — | 200 | `order.id/display_id/total/items` |

**实测订单**（`_agent_output/06-store-flow.txt`）：
`order_01M2F0PSZDG5TWCFERQ36G16D5`（display_id=1，pending，EUR，总价 1620 =
T 恤 M/黑 + 咖啡杯 ×2 + Express 配送 10），支付集合
`pay_col_01M2F0PSV9JFA0XP3JXCAFNC6M`（authorized）。库存预留：SHIRT-M-BLACK=1、
MUG-CLASSIC=2。

## 4. 收藏夹 Wishlist（自主功能）

| 步骤 | 方法/URL | 关键请求字段 | 状态 | 关键响应字段 |
|---|---|---|---|---|
| 未登录访问 | `GET /store/wishlist` | — | 401 | `{message}` |
| 收藏列表 | `GET /store/wishlist`（Bearer） | — | 200 | `wishlist[]`（按 created_at DESC） |
| 加入收藏 | `POST /store/wishlist` | `product_id` | 201 / 200 | 新建：`{wishlist}`；已存在：`{wishlist, already_exists:true}` |
| 缺少参数 | `POST /store/wishlist` | — | 400 | `{message}` |
| 取消收藏 | `DELETE /store/wishlist/{product_id}` | — | 200 | `{success:true}`（不存在项为幂等 no-op） |

测试顾客：wishlist-test@medusa-lab.test（套件内自建）；演示顾客：wishlist@medusa-lab.test。

## 5. 关键失败分支（实测）

| 场景 | 行为 |
|---|---|
| 零库存商品加入购物车 | 400 `Sales channel … is not associated with any stock location`（无可用库存被拦截） |
| 超量购买 | 400，购物车不残留失败行项目（`items=[]`） |
| 草稿商品 | 不出现在列表/详情，详情 404 |
| 重复提交订单 | 200 + 同一订单 ID，数据库仅 1 条订单 |
| 匿名收藏 | 店面 UI 跳转登录页 `/account?wishlist=1` |
