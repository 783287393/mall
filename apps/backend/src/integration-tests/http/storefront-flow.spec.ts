import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
} from "@medusajs/framework/utils"

import { getPublishableKey, seedStore, storeHeaders } from "./utils"

jest.setTimeout(300000)

/**
 * E2E functional tests for the main storefront flow:
 * browse -> search -> product detail -> cart -> checkout -> payment -> order,
 * plus persistence checks against the database.
 *
 * NOTE: the Medusa test runner restores the database snapshot before EVERY test,
 * so each test is self-contained. Stocked variants are fetched by fixed handle
 * because the default listing order is unstable and includes zero-stock items.
 */
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let pk: string
    let headers: Record<string, string>

    const STOCKED_HANDLE = "medusa-coffee-mug" // MUG-CLASSIC, 50 in stock

    const stockedVariant = async () => {
      const { data } = await api.get(
        `/store/products?handle=${STOCKED_HANDLE}&fields=*variants`,
        { headers }
      )
      const product = data.products[0]
      return { product, variant: product.variants[0] }
    }

    const newCart = async () => {
      const regions = await api.get("/store/regions", { headers })
      const { data } = await api.post(
        "/store/carts",
        { region_id: regions.data.regions[0].id },
        { headers }
      )
      return data.cart.id
    }

    const completeCheckout = async (email: string) => {
      const cartId = await newCart()
      const { variant } = await stockedVariant()

      await api.post(
        `/store/carts/${cartId}/line-items`,
        { variant_id: variant.id, quantity: 1 },
        { headers }
      )
      await api.post(
        `/store/carts/${cartId}`,
        {
          email,
          shipping_address: {
            first_name: "Lab",
            last_name: "Buyer",
            address_1: "Test Street 1",
            city: "Copenhagen",
            country_code: "dk",
            postal_code: "1000",
            phone: "+4512345678",
          },
        },
        { headers }
      )
      const optionsRes = await api.get(`/store/shipping-options?cart_id=${cartId}`, {
        headers,
      })
      await api.post(
        `/store/carts/${cartId}/shipping-methods`,
        { option_id: optionsRes.data.shipping_options[0].id },
        { headers }
      )
      const payRes = await api.post(
        "/store/payment-collections",
        { cart_id: cartId },
        { headers }
      )
      await api.post(
        `/store/payment-collections/${payRes.data.payment_collection.id}/payment-sessions`,
        { provider_id: "pp_system_default" },
        { headers }
      )
      const completeRes = await api.post(`/store/carts/${cartId}/complete`, {}, { headers })

      return { cartId, order: completeRes.data.order }
    }

    beforeAll(async () => {
      const container = getContainer()
      await seedStore(container)
      pk = await getPublishableKey(container)
      headers = storeHeaders(pk)

      // The index engine serves /store/products?q=... inside the test runner and
      // is populated asynchronously from product events. Wait for the index to
      // catch up BEFORE the runner snapshots the database, so every restored
      // test sees a fully-indexed catalog.
      for (let i = 0; i < 30; i++) {
        const probe = await api
          .get("/store/products?q=sweatshirt&limit=5", { headers })
          .catch(() => null)
        if (probe && probe.data.products.length > 0) {
          break
        }
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }, 300000)

    describe("Storefront main flow (E2E)", () => {
      it("browses the product catalog", async () => {
        const { status, data } = await api.get("/store/products", {
          headers,
        })

        expect(status).toEqual(200)
        expect(data.products.length).toBeGreaterThanOrEqual(4)
        expect(data.products[0]).toHaveProperty("handle")
      })

      it("searches products by keyword", async () => {
        // The index is populated (waited in beforeAll, captured by the snapshot);
        // poll briefly as a safety net for async lag.
        let data: any = { products: [] }

        for (let i = 0; i < 10; i++) {
          const res = await api.get("/store/products?q=sweatshirt&limit=10", {
            headers,
          })
          data = res.data
          if (data.products.length > 0) {
            break
          }
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }

        expect(data.products.length).toBeGreaterThanOrEqual(1)
        expect(data.products[0].handle).toContain("sweat")
      })

      it("fetches product detail with priced variants", async () => {
        const list = await api.get("/store/products?limit=1", { headers })
        const productId = list.data.products[0].id

        const { status, data } = await api.get(
          `/store/products/${productId}?fields=*variants.prices`,
          { headers }
        )

        expect(status).toEqual(200)
        expect(data.product.id).toEqual(productId)
        expect(data.product.variants.length).toBeGreaterThan(0)
        expect(data.product.variants[0].prices.length).toBeGreaterThan(0)
      })

      it("creates a cart", async () => {
        const cartId = await newCart()

        const { status, data } = await api.get(`/store/carts/${cartId}`, { headers })

        expect(status).toEqual(200)
        expect(data.cart.id).toEqual(cartId)
        expect(data.cart.currency_code).toBeTruthy()
      })

      it("adds a line item to the cart", async () => {
        const cartId = await newCart()
        const { variant } = await stockedVariant()

        const { status, data } = await api.post(
          `/store/carts/${cartId}/line-items`,
          { variant_id: variant.id, quantity: 2 },
          { headers }
        )

        expect(status).toEqual(200)
        expect(data.cart.items.length).toEqual(1)
        expect(data.cart.items[0].quantity).toEqual(2)
      })

      it("completes checkout: address, shipping, payment, order", async () => {
        const { order } = await completeCheckout("lab-buyer@medusa-lab.test")

        expect(order).toBeTruthy()
        expect(order.id).toBeTruthy()
        expect(order.status).toBeTruthy()
        expect(order.total).toBeGreaterThan(0)
      })

      it("returns the placed order via the store API", async () => {
        const { order } = await completeCheckout("order-view@medusa-lab.test")

        const { status, data } = await api.get(`/store/orders/${order.id}`, { headers })

        expect(status).toEqual(200)
        expect(data.order.id).toEqual(order.id)
        expect(data.order.email).toEqual("order-view@medusa-lab.test")
      })
    })

    describe("Persistence", () => {
      it("persists the completed order in the database", async () => {
        const container = getContainer()
        const query = container.resolve(ContainerRegistrationKeys.QUERY)

        const { order } = await completeCheckout("persist@medusa-lab.test")

        const { data: orders } = await query.graph({
          entity: "order",
          fields: ["id", "display_id", "status", "email", "total"],
          filters: { id: order.id },
        })

        expect(orders.length).toEqual(1)
        expect(orders[0].id).toEqual(order.id)
        expect(orders[0].email).toEqual("persist@medusa-lab.test")
        expect(Number(orders[0].total)).toBeGreaterThan(0)
      })

      it("keeps cart line items consistent with the order after completion", async () => {
        const container = getContainer()
        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const inventoryModule = container.resolve(ModuleRegistrationName.INVENTORY)

        const cartId = await newCart()
        const { variant } = await stockedVariant()

        await api.post(
          `/store/carts/${cartId}/line-items`,
          { variant_id: variant.id, quantity: 3 },
          { headers }
        )
        await api.post(
          `/store/carts/${cartId}`,
          {
            email: "line@medusa-lab.test",
            shipping_address: {
              first_name: "Line",
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
        const completeRes = await api.post(`/store/carts/${cartId}/complete`, {}, { headers })
        const orderId = completeRes.data.order.id

        const orderModule = container.resolve(ModuleRegistrationName.ORDER)
        const [order] = await orderModule.listOrders(
          { id: orderId },
          { relations: ["items"], select: ["id", "email", "total"] }
        )
        expect(order.items.length).toEqual(1)
        expect(Number(order.items[0].quantity)).toEqual(3)
        expect(order.items[0].variant_id).toEqual(variant.id)

        // reservation was created for the ordered quantity
        const [item] = await inventoryModule.listInventoryItems(
          { sku: "MUG-CLASSIC" },
          { select: ["id"] }
        )
        const [level] = await inventoryModule.listInventoryLevels(
          { inventory_item_id: item.id },
          { select: ["reserved_quantity"] }
        )
        expect(Number(level.reserved_quantity)).toBeGreaterThanOrEqual(3)
      })
    })
  },
})
