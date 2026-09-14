import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { authenticate } from "@medusajs/framework/http";
import { WISHLIST_MODULE } from "../../../../modules/wishlist";

/**
 * DELETE /store/wishlist/:product_id — remove a product from the customer's
 * wishlist. Deleting an item that isn't saved is a successful no-op.
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context?.actor_id;

  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { product_id } = req.params as { product_id: string };

  const wishlistModule = req.scope.resolve(WISHLIST_MODULE);

  await wishlistModule.deleteWishlistItems({
    customer_id: customerId,
    product_id,
  });

  return res.json({ success: true });
}

export const middlewares = [
  {
    method: ["DELETE"],
    middlewares: [authenticate("customer", ["session", "bearer"])],
  },
];
