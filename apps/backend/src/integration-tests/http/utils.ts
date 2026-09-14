import { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
} from "@medusajs/framework/utils"
import {
  linkProductsToSalesChannelWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"
import initialDataSeed from "../../migration-scripts/initial-data-seed"
import seedLabProducts from "../../scripts/seed-lab-products"

/**
 * Shared helpers for the Lab 02 integration suites.
 *
 * The Medusa integration test runner boots the app against a brand-new throwaway
 * database, so the seed data is NOT present. We re-run the same seeding the CLI
 * would apply, against the live test container:
 *   0. default shipping profile  (core migration script "migrate-product-shipping-profile")
 *   1. initial-data-seed  -> store, region, tax, shipping, 4 starter products
 *   2. seed-lab-products   -> 6 lab products incl. edge-case inventory
 *
 * The core itself auto-creates a default "Medusa Store" at boot, so the seed's
 * own store/channel is NOT the one the storefront API resolves. The final step
 * re-links every product, the publishable key and the stock location to the
 * FIRST store's default sales channel, making the whole catalog visible and
 * orderable through the store API.
 */
export const seedStore = async (container: MedusaContainer) => {
  const fulfillmentModule = container.resolve(ModuleRegistrationName.FULFILLMENT)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  await fulfillmentModule.createShippingProfiles({
    name: "Default Shipping Profile",
    type: "default",
  })

  await initialDataSeed({ container })
  await seedLabProducts({ container })

  // ------------------------------------------------------------------
  // Align everything with the store the storefront API actually uses.
  // ------------------------------------------------------------------
  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "default_sales_channel_id"],
  })
  const channelId = stores[0].default_sales_channel_id!

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id"],
  })
  await linkProductsToSalesChannelWorkflow(container).run({
    input: {
      id: channelId,
      add: products.map((p: any) => p.id),
    },
  })

  const { data: publishableKeys } = await query.graph({
    entity: "api_key",
    fields: ["id"],
    filters: { type: "publishable" },
  })
  for (const key of publishableKeys) {
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: key.id, add: [channelId] },
    })
  }

  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id"],
  })
  for (const location of locations) {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: location.id, add: [channelId] },
    })
  }
}

/** Returns the token of the default publishable API key created by the seed. */
export const getPublishableKey = async (
  container: MedusaContainer
): Promise<string> => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "api_key",
    fields: ["id", "token", "title", "type"],
  })

  const key = data.find((k: any) => k.title === "Default Publishable API Key")
  if (!key) {
    throw new Error("Default Publishable API Key not found after seeding")
  }

  return key.token
}

export const storeHeaders = (pk: string) => ({
  "x-publishable-api-key": pk,
})

export type AuthedApi = {
  get: (path: string, cfg?: any) => Promise<any>
  post: (path: string, body?: any, cfg?: any) => Promise<any>
  delete: (path: string, cfg?: any) => Promise<any>
}

/**
 * Registers (if needed) and logs in a store customer, creating the customer
 * record like the storefront does, and returns a usable Bearer token.
 */
export const createCustomerToken = async (
  api: any,
  pk: string,
  email = "lab-customer@medusa-lab.test",
  password = "LabTest2026"
): Promise<string> => {
  const headers = { "x-publishable-api-key": pk, "Content-Type": "application/json" }

  await api
    .post("/auth/customer/emailpass/register", { email, password }, { headers })
    .catch(() => void 0) // may already exist

  let login = await api.post("/auth/customer/emailpass", { email, password }, { headers })
  let token: string = login.data.token

  let authHeaders = { ...headers, authorization: `Bearer ${token}` }

  const me = await api.get("/store/customers/me", { headers: authHeaders }).catch(() => null)

  if (!me) {
    await api.post("/store/customers", { email }, { headers: authHeaders })
    login = await api.post("/auth/customer/emailpass", { email, password }, { headers })
    token = login.data.token
    authHeaders = { ...headers, authorization: `Bearer ${token}` }
  }

  return token
}

export const authedHeaders = (pk: string, token: string) => ({
  "x-publishable-api-key": pk,
  "Content-Type": "application/json",
  authorization: `Bearer ${token}`,
})
