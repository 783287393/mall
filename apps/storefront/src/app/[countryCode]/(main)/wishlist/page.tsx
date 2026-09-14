import { Metadata } from "next"

import { getWishlistWithProducts } from "@lib/data/wishlist"
import { retrieveCustomer } from "@lib/data/customer"
import { getProductPrice } from "@lib/util/get-product-price"
import { Heading, Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import PreviewPrice from "@modules/products/components/product-preview/price"
import WishlistButton from "@modules/wishlist/components/wishlist-button"

export const metadata: Metadata = {
  title: "Wishlist",
  description: "View the products you saved to your wishlist.",
}

type Params = {
  params: Promise<{
    countryCode: string
  }>
}

export default async function WishlistPage(props: Params) {
  const { countryCode } = await props.params

  const customer = await retrieveCustomer()
  const { products } = await getWishlistWithProducts(countryCode)

  return (
    <div className="content-container py-12 flex flex-col gap-y-8 min-h-[40vh]">
      <Heading level="h1" className="text-3xl">
        Wishlist
      </Heading>

      {!customer ? (
        <div className="flex flex-col items-start gap-y-4">
          <Text className="text-ui-fg-subtle">
            Please log in to view your wishlist.
          </Text>
          <LocalizedClientLink
            href="/account"
            className="text-ui-fg-interactive underline"
          >
            Log in / Create account
          </LocalizedClientLink>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-start gap-y-4">
          <Text className="text-ui-fg-subtle">
            Your wishlist is empty.
          </Text>
          <LocalizedClientLink
            href="/store"
            className="text-ui-fg-interactive underline"
          >
            Browse products
          </LocalizedClientLink>
        </div>
      ) : (
        <>
          <Text className="text-ui-fg-subtle">
            {products.length} saved {products.length === 1 ? "product" : "products"}
          </Text>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 small:grid-cols-3 medium:grid-cols-4">
            {products.map((product) => {
              const { cheapestPrice } = getProductPrice({ product })

              return (
                <li key={product.id} className="flex flex-col gap-y-2">
                  <LocalizedClientLink
                    href={`/products/${product.handle}`}
                    className="group"
                  >
                    <Thumbnail
                      thumbnail={product.thumbnail}
                      images={product.images}
                      size="full"
                    />
                    <Text
                      className="mt-2 txt-compact-medium text-ui-fg-subtle line-clamp-2"
                      data-testid="wishlist-product-title"
                    >
                      {product.title}
                    </Text>
                  </LocalizedClientLink>
                  <div className="flex items-center justify-between gap-x-2">
                    {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
                    <WishlistButton
                      productId={product.id!}
                      initialSaved
                      countryCode={countryCode}
                      label="Remove"
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
