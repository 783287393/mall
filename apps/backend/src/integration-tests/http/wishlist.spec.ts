import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  authedHeaders,
  createCustomerToken,
  getPublishableKey,
  seedStore,
  storeHeaders,
} from "./utils"

jest.setTimeout(300000)

/**
 * API + business-boundary tests for the self-developed Wishlist feature
 * (POST /store/wishlist, GET /store/wishlist, DELETE /store/wishlist/:product_id).
 *
 * NOTE: the Medusa test runner restores the database snapshot before EVERY test,
 * so each test is self-contained and must create its own data.
 */
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let pk: string
    let authHeaders: Record<string, string>

    const EMAIL = "wishlist-test@medusa-lab.test"
    const PASSWORD = "WishlistTest2026"

    const MUG_HANDLE = "medusa-coffee-mug"
    const HOODIE_HANDLE = "medusa-hoodie-limited"
    const BOTTLE_HANDLE = "medusa-water-bottle"
    const BACKPACK_HANDLE = "medusa-backpack-premium"

    const productByHandle = async (handle: string) => {
      const { data } = await api.get(`/store/products?handle=${handle}`, {
        headers: authHeaders,
      })
      return data.products[0]
    }

    const addProduct = async (handle: string) => {
      const product = await productByHandle(handle)
      const res = await api.post(
        "/store/wishlist",
        { product_id: product.id },
        { headers: authHeaders }
      )
      return { product, res }
    }

    beforeAll(async () => {
      const container = getContainer()
      await seedStore(container)
      pk = await getPublishableKey(container)
      const token = await createCustomerToken(api, pk, EMAIL, PASSWORD)
      authHeaders = authedHeaders(pk, token)
    }, 300000)

    describe("Wishlist API - authentication", () => {
      it("rejects unauthenticated GET with 401", async () => {
        const res = await api
          .get("/store/wishlist", { headers: storeHeaders(pk) })
          .catch((e) => e.response)

        expect(res.status).toEqual(401)
      })

      it("rejects unauthenticated POST with 401", async () => {
        const res = await api
          .post("/store/wishlist", { product_id: "p_any" }, { headers: storeHeaders(pk) })
          .catch((e) => e.response)

        expect(res.status).toEqual(401)
      })
    })

    describe("Wishlist API - CRUD", () => {
      it("returns an empty wishlist for a fresh customer", async () => {
        const { status, data } = await api.get("/store/wishlist", {
          headers: authHeaders,
        })

        expect(status).toEqual(200)
        expect(data.wishlist).toEqual([])
      })

      it("adds a product to the wishlist", async () => {
        const { product, res } = await addProduct(MUG_HANDLE)

        expect(res.status).toEqual(201)
        expect(res.data.wishlist.id).toBeTruthy()
        expect(res.data.wishlist.product_id).toEqual(product.id)
      })

      it("is idempotent when adding the same product twice", async () => {
        const product = await productByHandle(MUG_HANDLE)

        await api.post(
          "/store/wishlist",
          { product_id: product.id },
          { headers: authHeaders }
        )

        const second = await api.post(
          "/store/wishlist",
          { product_id: product.id },
          { headers: authHeaders }
        )

        expect(second.data.already_exists).toEqual(true)
        expect(second.data.wishlist).toBeTruthy()

        const list = await api.get("/store/wishlist", { headers: authHeaders })
        const matches = list.data.wishlist.filter(
          (item: any) => item.product_id === product.id
        )
        expect(matches.length).toEqual(1)
      })

      it("returns 400 when product_id is missing", async () => {
        const res = await api
          .post("/store/wishlist", {}, { headers: authHeaders })
          .catch((e) => e.response)

        expect(res.status).toEqual(400)
      })

      it("lists the saved products", async () => {
        const handles = [MUG_HANDLE, HOODIE_HANDLE, BOTTLE_HANDLE]

        for (const handle of handles) {
          await addProduct(handle)
        }

        const { status, data } = await api.get("/store/wishlist", {
          headers: authHeaders,
        })

        expect(status).toEqual(200)
        expect(data.wishlist.length).toBeGreaterThanOrEqual(3)
      })

      it("removes a product from the wishlist", async () => {
        const { product } = await addProduct(HOODIE_HANDLE)

        const { status } = await api.delete(`/store/wishlist/${product.id}`, {
          headers: authHeaders,
        })

        expect(status).toEqual(200)

        const list = await api.get("/store/wishlist", { headers: authHeaders })
        expect(
          list.data.wishlist.some((i: any) => i.product_id === product.id)
        ).toEqual(false)
      })

      it("treats removing a never-saved product as a no-op success", async () => {
        const product = await productByHandle(BACKPACK_HANDLE)

        const { status, data } = await api.delete(`/store/wishlist/${product.id}`, {
          headers: authHeaders,
        })

        expect(status).toEqual(200)
        expect(data.success).toEqual(true)
      })
    })

    describe("Wishlist - persistence", () => {
      it("persists wishlist rows in the database", async () => {
        const container = getContainer()
        const query = container.resolve(ContainerRegistrationKeys.QUERY)

        const product = await productByHandle(MUG_HANDLE)

        await api.post(
          "/store/wishlist",
          { product_id: product.id },
          { headers: authHeaders }
        )

        const { data: rows } = await query.graph({
          entity: "wishlist_item",
          fields: ["id", "customer_id", "product_id"],
          filters: { product_id: product.id },
        })

        expect(rows.length).toBeGreaterThanOrEqual(1)
        expect(rows[0].product_id).toEqual(product.id)
        expect(rows[0].customer_id).toBeTruthy()
      })
    })
  },
})
