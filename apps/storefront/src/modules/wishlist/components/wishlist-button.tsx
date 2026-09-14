"use client"

import { useRouter } from "next/navigation"
import { useOptimistic, useTransition } from "react"
import { addToWishlist, removeFromWishlist } from "@lib/data/wishlist"

type WishlistButtonProps = {
  productId: string
  initialSaved?: boolean
  countryCode: string
  label?: string
}

/**
 * Heart toggle used on the product detail page (and wishlist page rows).
 * Optimistically flips the heart, then calls the wishlist server actions.
 * Anonymous visitors are redirected to the account/login page.
 */
export default function WishlistButton({
  productId,
  initialSaved = false,
  countryCode,
  label = "Save to wishlist",
}: WishlistButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useOptimistic(initialSaved)

  const toggle = () => {
    startTransition(async () => {
      setSaved(!saved)
      const result = saved
        ? await removeFromWishlist(productId)
        : await addToWishlist(productId)

      if ("error" in result && result.error === "auth_required") {
        router.push(`/${countryCode}/account?wishlist=1`)
        return
      }

      if ("success" in result) {
        router.refresh()
      }
    })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-pressed={saved}
      aria-label={label}
      data-testid="wishlist-toggle"
      className="group flex items-center gap-x-2 text-ui-fg-subtle hover:text-ui-fg-base transition-colors disabled:opacity-60"
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        className={saved ? "text-rose-500" : "group-hover:text-rose-400"}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span className="txt-compact-small">{label}</span>
    </button>
  )
}
