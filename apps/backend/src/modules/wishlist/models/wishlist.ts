import { model } from "@medusajs/framework/utils";

/**
 * Wishlist item — links a storefront customer to a product they saved.
 *
 * `customer_id` and `product_id` are plain references (a production version
 * would model them as proper links/relations to the customer and product
 * modules). Uniqueness of (customer_id, product_id) is enforced in the
 * service/API layer so that adding the same product twice is idempotent.
 */
const WishlistItem = model.define("wishlist_item", {
  id: model.id().primaryKey(),
  customer_id: model.text().searchable(),
  product_id: model.text().searchable(),
});

export default WishlistItem;
