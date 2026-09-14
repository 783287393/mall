import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  ProductStatus,
} from "@medusajs/framework/utils"

import { getPublishableKey, seedStore, storeHeaders } from "./utils"

jest.setTimeout(300000)

const getVariant = async (api: any, headers: any, handle: string, sku?: string) => {
  const { data } = await api.get(
    `/store/products?handle=${handle}&fields=*variants`,
    { headers }
  )
  const product = data.products[0]
  const variant = sku
    ? product.variants.find((v: any) => v.sku === sku)
    : product.variants[0]
  return { product, variant }
}

const newCart = async (api: any, headers: any) => {
  const regions = await api.get("/store/regions", { headers })
  const { data } = await api.post(
    "/store/carts",
    { region_id: regions.data.regions[0].id },
    { headers }
  )
  return data.cart.id
}

/**
 * Business boundary tests: zero stock, only-one-left, over-limit quantities,
 * delisted (draft) products, and duplicate checkout submission.
 */
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let pk: string
    let headers: Record<string, string>

    beforeAll(async () => {
      const container = getContainer()
      await seedStore(container)
      pk = await getPublishableKey(container)
      headers = storeHeaders(pk)
    }, 300000)

    describe("Inventory boundaries", () => {
      it("blocks adding a fully zero-stock product (socks 3-pack)", async () => {
        const { variant } = await getVariant(api, headers, "medusa-socks-3pack")
        const cartId = await newCart(api, headers)

        const res = await api
          .post(
            `/store/carts/${cartId}/line-items`,
            { variant_id: variant.id, quantity: 1 },
            { headers }
          )
          .catch((e) => e.response)

        expect(res.status).toEqual(400)
        expect(JSON.stringify(res.data).toLowerCase()).toContain("inventory")
      })

      it("blocks adding a zero-stock variant (beanie / Black)", async () => {
        const { variant } = await getVariant(api, headers, "medusa-winter-beanie", "BEANIE-BLACK")
        const cartId = await newCart(api, headers)

        const res = await api
          .post(
            `/store/carts/${cartId}/line-items`,
            { variant_id: variant.id, quantity: 1 },
            { headers }
          )
          .catch((e) => e.response)

        expect(res.status).toEqual(400)
      })

      it("allows buying the only-1-left variant with quantity 1", async () => {
        const { variant } = await getVariant(api, headers, "medusa-hoodie-limited", "HOODIE-LTD-M")
        const cartId = await newCart(api, headers)

        const { status, data } = await api.post(
          `/store/carts/${cartId}/line-items`,
          { variant_id: variant.id, quantity: 1 },
          { headers }
        )

        expect(status).toEqual(200)
        expect(data.cart.items[0].quantity).toEqual(1)
      })

      it("rejects buying more than the remaining stock (hoodie M has 1 left)", async () => {
        const { variant } = await getVariant(api, headers, "medusa-hoodie-limited", "HOODIE-LTD-M")
        const cartId = await newCart(api, headers)

        const res = await api
          .post(
            `/store/carts/${cartId}/line-items`,
            { variant_id: variant.id, quantity: 2 },
            { headers }
          )
          .catch((e) => e.response)

        expect(res.status).toEqual(400)
      })

      it("rejects an over-limit quantity on a stocked variant (beanie / White)", async () => {
        const { variant } = await getVariant(api, headers, "medusa-winter-beanie", "BEANIE-WHITE")
        const cartId = await newCart(api, headers)

        const res = await api
          .post(
            `/store/carts/${cartId}/line-items`,
            { variant_id: variant.id, quantity: 100 },
            { headers }
          )
          .catch((e) => e.response)

        expect(res.status).toEqual(400)
      })

      it("keeps the cart empty after a blocked zero-stock add", async () => {
        const { variant } = await getVariant(api, headers, "medusa-socks-3pack")
        const cartId = await newCart(api, headers)

        await api
          .post(
            `/store/carts/${cartId}/line-items`,
            { variant_id: variant.id, quantity: 1 },
            { headers }
          )
          .catch(() => void 0)

        const { data } = await api.get(`/store/carts/${cartId}`, { headers })
        expect(data.cart.items.length).toEqual(0)
      })
    })

    describe("Product delisting", () => {
      it("does not expose draft (delisted) products in the store catalog", async () => {
        const container = getContainer()
        const productModule = container.resolve(ModuleRegistrationName.PRODUCT)
        const query = container.resolve(ContainerRegistrationKeys.QUERY)

        const { data: channels } = await query.graph({
          entity: "sales_channel",
          fields: ["id"],
        })

        const created = await productModule.createProducts([
          {
            title: "Delisted Draft Product",
            handle: "hidden-draft-item",
            status: ProductStatus.DRAFT,
            options: [{ title: "Size", values: ["S"] }],
            variants: [
              {
                title: "S",
                sku: "DRAFT-S",
                options: { Size: "S" },
                prices: [{ amount: 5, currency_code: "eur" }],
              },
            ],
            sales_channels: [{ id: channels[0].id }],
          },
        ])
        expect(created.length).toEqual(1)

        // not in the store listing
        const list = await api.get("/store/products?q=draft", { headers })
        expect(
          list.data.products.some((p: any) => p.handle === "hidden-draft-item")
        ).toEqual(false)

        // not retrievable via store API
        const detail = await api
          .get(`/store/products/${created[0].id}`, { headers })
          .catch((e) => e.response)
        expect(detail.status).toBeGreaterThanOrEqual(400)
      })
    })

    describe("Duplicate submission", () => {
      it("completes the cart only once", async () => {
        const container = getContainer()
        const query = container.resolve(ContainerRegistrationKeys.QUERY)

        const cartId = await newCart(api, headers)
        const { variant } = await getVariant(api, headers, "medusa-coffee-mug")

        await api.post(
          `/store/carts/${cartId}/line-items`,
          { variant_id: variant.id, quantity: 1 },
          { headers }
        )
        await api.post(
          `/store/carts/${cartId}`,
          {
            email: "dupe@medusa-lab.test",
            shipping_address: {
              first_name: "Dupe",
              last_name: "Check",
              address_1: "Test Street 1",
              city: "Copenhagen",
              country_code: "dk",
              postal_code: "1000",
            },
          },
          { headers }
        )
        const optionsRes = await api.get(`/store/shipping-options?cart_id=${cartId}`, { headers })
        await api.post(
          `/store/carts/${cartId}/shipping-methods`,
          { option_id: optionsRes.data.shipping_options[0].id },
          { headers }
        )
        const payRes = await api.post("/store/payment-collections", { cart_id: cartId }, { headers })
        await api.post(
          `/store/payment-collections/${payRes.data.payment_collection.id}/payment-sessions`,
          { provider_id: "pp_system_default" },
          { headers }
        )

        const first = await api.post(`/store/carts/${cartId}/complete`, {}, { headers })
        expect(first.status).toEqual(200)
        expect(first.data.type).toEqual("order")

        // a second submit is idempotent: same order returned, no duplicate
        const second = await api
          .post(`/store/carts/${cartId}/complete`, {}, { headers })
          .catch((e) => e.response)
        expect(second.status).toEqual(200)
        expect(second.data.order.id).toEqual(first.data.order.id)

        const { data: orders } = await query.graph({
          entity: "order",
          fields: ["id"],
          filters: { email: "dupe@medusa-lab.test" },
        })
        expect(orders.length).toEqual(1)
      })
    })
  },
})
