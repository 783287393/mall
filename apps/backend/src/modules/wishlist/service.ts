import { MedusaService } from "@medusajs/framework/utils";
import WishlistItem from "./models/wishlist";

/**
 * Wishlist module service.
 *
 * MedusaService generates the standard CRUD methods for the WishlistItem
 * model (listWishlistItems / createWishlistItems / deleteWishlistItems ...),
 * which the custom Store API routes below rely on.
 */
class WishlistModuleService extends MedusaService({ WishlistItem }) {}

export default WishlistModuleService;
