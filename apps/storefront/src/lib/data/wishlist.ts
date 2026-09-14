"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { getAuthHeaders, getCacheOptions, getCacheTag } from "./cookies"
import { getRegion } from "./regions"

export type WishlistItem = {
  id: string
  customer_id: string
  product_id: string
  created_at?: string
}

export type WishlistActionResult =
  | { success: true }
  | { error: "auth_required" | "failed" }

// Returns the raw wishlist records for the logged-in customer ([] if anon).
export const getWishlist = async (): Promise<WishlistItem[]> => {
  const headers = await getAuthHeaders()

  if (!headers.authorization) {
    return []
  }

  const next = {
    ...(await getCacheOptions("wishlist")),
  }

  return sdk.client
    .fetch<{ wishlist: WishlistItem[] }>(`/store/wishlist`, {
      method: "GET",
      headers,
      next,
      cache: "force-cache",
    })
    .then(({ wishlist }) => wishlist)
    .catch(() => [])
}

// Wishlist records joined with the full store product payloads (for prices,
// thumbnails, ...). Order follows the wishlist (newest first).
export const getWishlistWithProducts = async (
  countryCode: string
): Promise<{ items: WishlistItem[]; products: HttpTypes.StoreProduct[] }> => {
  const items = await getWishlist()

  if (items.length === 0) {
    return { items, products: [] }
  }

  const region = await getRegion(countryCode)
  const headers = await getAuthHeaders()
  const next = {
    ...(await getCacheOptions("products")),
  }

  const { products } = await sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[] }>(`/store/products`, {
      method: "GET",
      query: {
        id: items.map((i) => i.product_id),
        limit: 100,
        region_id: region?.id,
        fields:
          "*variants.calculated_price,+variants.inventory_quantity,*variants.images,*variants.options,+metadata,+tags,",
      },
      headers,
      next,
      cache: "force-cache",
    })
    .catch(() => ({ products: [] }))

  const byId = new Map(products.map((p) => [p.id, p]))

  return {
    items,
    products: items
      .map((i) => byId.get(i.product_id))
      .filter((p): p is HttpTypes.StoreProduct => Boolean(p)),
  }
}

export async function addToWishlist(
  productId: string
): Promise<WishlistActionResult> {
  const headers = await getAuthHeaders()

  if (!headers.authorization) {
    return { error: "auth_required" }
  }

  try {
    await sdk.client.fetch(`/store/wishlist`, {
      method: "POST",
      headers,
      body: { product_id: productId },
    })

    const cacheTag = await getCacheTag("wishlist")
    if (cacheTag) revalidateTag(cacheTag)

    return { success: true }
  } catch {
    return { error: "failed" }
  }
}

export async function removeFromWishlist(
  productId: string
): Promise<WishlistActionResult> {
  const headers = await getAuthHeaders()

  if (!headers.authorization) {
    return { error: "auth_required" }
  }

  try {
    await sdk.client.fetch(`/store/wishlist/${productId}`, {
      method: "DELETE",
      headers,
    })

    const cacheTag = await getCacheTag("wishlist")
    if (cacheTag) revalidateTag(cacheTag)

    return { success: true }
  } catch {
    return { error: "failed" }
  }
}
