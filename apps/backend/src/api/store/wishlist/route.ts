import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { authenticate } from "@medusajs/framework/http";
import { WISHLIST_MODULE } from "../../../modules/wishlist";

/**
 * Wishlist store API — customer-scoped.
 *
 * GET  /store/wishlist            -> list the customer's saved products
 * POST /store/wishlist            -> add { product_id } (idempotent)
 *
 * Requires a customer token (bearer or session cookie).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context?.actor_id;

  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const wishlistModule = req.scope.resolve(WISHLIST_MODULE);

  const items = await wishlistModule.listWishlistItems(
    { customer_id: customerId },
    { order: { created_at: "DESC" } }
  );

  return res.json({ wishlist: items });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = req.auth_context?.actor_id;

  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const productId = req.body?.product_id as string | undefined;

  if (!productId) {
    return res.status(400).json({ message: "product_id is required" });
  }

  const wishlistModule = req.scope.resolve(WISHLIST_MODULE);

  // Idempotent: adding an already-saved product is a no-op that returns the
  // existing record instead of creating a duplicate.
  const existing = await wishlistModule.listWishlistItems({
    customer_id: customerId,
    product_id: productId,
  });

  if (existing.length > 0) {
    return res.json({ wishlist: existing[0], already_exists: true });
  }

  const [item] = await wishlistModule.createWishlistItems([
    { customer_id: customerId, product_id: productId },
  ]);

  return res.status(201).json({ wishlist: item });
}

export const middlewares = [
  {
    method: ["GET", "POST"],
    middlewares: [authenticate("customer", ["session", "bearer"])],
  },
];
