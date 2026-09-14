import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * Lab 02 seed script — adds 6 extra products on top of the DTC starter's
 * initial 4 products (total 10), covering the required edge cases:
 *   - multi-variant products   (beanie, hoodie, bottle)
 *   - a fully zero-stock product  (socks 3-pack)
 *   - a zero-stock variant       (beanie / Black)
 *   - a "only 1 left" variant    (limited hoodie / M)
 *   - a long product title       (premium backpack)
 *
 * The script is idempotent: products whose handle already exists are skipped.
 * Run with:  pnpm exec medusa exec ./src/scripts/seed-lab-products.ts
 */
export default async function seedLabProducts({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productModule = container.resolve(ModuleRegistrationName.PRODUCT);
  const inventoryModule = container.resolve(ModuleRegistrationName.INVENTORY);

  // ------------------------------------------------------------------
  // 1. Resolve the shared entities created by the initial seed
  // ------------------------------------------------------------------
  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  });
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id"],
  });
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id"],
  });

  const shippingProfile = shippingProfiles[0];
  const stockLocation = locations[0];
  const defaultSalesChannel = salesChannels[0];

  const cat = (name: string) =>
    categories.find((c: any) => c.name === name)!.id;

  // ------------------------------------------------------------------
  // 2. Define the six lab products (handle => stock level per variant SKU)
  // ------------------------------------------------------------------
  const labHandles = [
    "medusa-coffee-mug",
    "medusa-winter-beanie",
    "medusa-hoodie-limited",
    "medusa-socks-3pack",
    "medusa-backpack-premium",
    "medusa-water-bottle",
  ];

  // Idempotency: skip handles that already exist
  const existing = await productModule.listProducts(
    { handle: labHandles },
    { select: ["id", "handle"] }
  );
  const existingHandles = new Set(existing.map((p) => p.handle));
  const missingHandles = labHandles.filter((h) => !existingHandles.has(h));
  if (missingHandles.length === 0) {
    logger.info("[lab-seed] All lab products already exist, nothing to do.");
    return;
  }
  logger.info(`[lab-seed] Creating ${missingHandles.length} missing product(s): ${missingHandles.join(", ")}`);

  const productsToCreate = (
    [
      {
        title: "Medusa Coffee Mug",
        handle: "medusa-coffee-mug",
        description:
          "A sturdy ceramic mug for your daily caffeine fix. Dishwasher and microwave safe.",
        category: "Merch",
        option: { title: "Style", values: ["Classic"] },
        variants: [
          {
            title: "Classic",
            sku: "MUG-CLASSIC",
            option: { Style: "Classic" },
            prices: [
              { amount: 800, currency_code: "eur" },
              { amount: 1000, currency_code: "usd" },
            ],
            stock: 50,
          },
        ],
      },
      {
        title: "Medusa Winter Beanie",
        handle: "medusa-winter-beanie",
        description:
          "Keep warm with our knitted beanie. One size fits most. Black variant currently out of stock.",
        category: "Merch",
        option: { title: "Color", values: ["Black", "White"] },
        variants: [
          {
            title: "Black",
            sku: "BEANIE-BLACK",
            option: { Color: "Black" },
            prices: [{ amount: 1200, currency_code: "eur" }],
            stock: 0, // zero-stock variant (edge case)
          },
          {
            title: "White",
            sku: "BEANIE-WHITE",
            option: { Color: "White" },
            prices: [{ amount: 1200, currency_code: "eur" }],
            stock: 20,
          },
        ],
      },
      {
        title: "Medusa Limited Edition Hoodie",
        handle: "medusa-hoodie-limited",
        description:
          "Limited edition drop. Only a few units left in each size — size M has exactly 1 unit remaining.",
        category: "Sweatshirts",
        option: { title: "Size", values: ["S", "M", "L"] },
        variants: [
          {
            title: "S",
            sku: "HOODIE-LTD-S",
            option: { Size: "S" },
            prices: [{ amount: 4500, currency_code: "eur" }],
            stock: 5,
          },
          {
            title: "M",
            sku: "HOODIE-LTD-M",
            option: { Size: "M" },
            prices: [{ amount: 4500, currency_code: "eur" }],
            stock: 1, // only-one-left (edge case)
          },
          {
            title: "L",
            sku: "HOODIE-LTD-L",
            option: { Size: "L" },
            prices: [{ amount: 4500, currency_code: "eur" }],
            stock: 3,
          },
        ],
      },
      {
        title: "Medusa Socks 3-Pack",
        handle: "medusa-socks-3pack",
        description:
          "Three pairs of cozy cotton socks. This product is temporarily out of stock.",
        category: "Merch",
        option: { title: "Size", values: ["One Size"] },
        variants: [
          {
            title: "One Size",
            sku: "SOCKS-3PACK",
            option: { Size: "One Size" },
            prices: [{ amount: 1000, currency_code: "eur" }],
            stock: 0, // fully zero-stock product (edge case)
          },
        ],
      },
      {
        title:
          "Medusa Premium Backpack - Extra Long Product Title For Display And Search Testing Purposes",
        handle: "medusa-backpack-premium",
        description:
          "A waterproof 25L backpack with padded laptop compartment. Long title used to verify storefront truncation and search matching.",
        category: "Merch",
        option: { title: "Color", values: ["Navy"] },
        variants: [
          {
            title: "Navy",
            sku: "BACKPACK-NAVY",
            option: { Color: "Navy" },
            prices: [
              { amount: 7000, currency_code: "eur" },
              { amount: 8500, currency_code: "usd" },
            ],
            stock: 30,
          },
        ],
      },
      {
        title: "Medusa Water Bottle",
        handle: "medusa-water-bottle",
        description:
          "Insulated stainless steel bottle. Keeps drinks cold for 24h or hot for 12h.",
        category: "Merch",
        option: { title: "Capacity", values: ["750ml", "1L"] },
        variants: [
          {
            title: "750ml",
            sku: "BOTTLE-750ML",
            option: { Capacity: "750ml" },
            prices: [{ amount: 1800, currency_code: "eur" }],
            stock: 40,
          },
          {
            title: "1L",
            sku: "BOTTLE-1L",
            option: { Capacity: "1L" },
            prices: [{ amount: 2200, currency_code: "eur" }],
            stock: 25,
          },
        ],
      },
    ] as any[]
  ).filter((p) => missingHandles.includes(p.handle));

  // ------------------------------------------------------------------
  // 3. Create the products (workflow also creates inventory items + variants)
  // ------------------------------------------------------------------
  const { result: created } = await createProductsWorkflow(container).run({
    input: {
      products: productsToCreate.map((p) => ({
        title: p.title,
        handle: p.handle,
        status: ProductStatus.PUBLISHED,
        description: p.description,
        weight: 400,
        category_ids: [cat(p.category)],
        options: [p.option],
        variants: p.variants.map((v: any) => ({
          title: v.title,
          sku: v.sku,
          options: v.option,
          prices: v.prices,
        })),
        images: [
          { url: `https://picsum.photos/seed/${p.handle}/800/800` },
        ],
        sales_channels: [{ id: defaultSalesChannel.id }],
        shipping_profile_id: shippingProfile.id,
      })),
    },
  });
  logger.info(`[lab-seed] Created ${created.length} product(s).`);

  // ------------------------------------------------------------------
  // 4. Set inventory levels (edge-case quantities)
  // ------------------------------------------------------------------
  const skuStockMap = new Map<string, number>();
  for (const p of productsToCreate) {
    for (const v of p.variants) {
      skuStockMap.set(v.sku, v.stock);
    }
  }

  const inventoryItems = await inventoryModule.listInventoryItems(
    { sku: [...skuStockMap.keys()] },
    { select: ["id", "sku"] }
  );

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryItems
        .filter((item) => skuStockMap.has(item.sku!))
        .map((item) => ({
          location_id: stockLocation.id,
          stocked_quantity: skuStockMap.get(item.sku!)!,
          inventory_item_id: item.id,
        })),
    },
  });
  logger.info(
    `[lab-seed] Inventory levels set: ${[...skuStockMap.entries()]
      .map(([sku, qty]) => `${sku}=${qty}`)
      .join(", ")}`
  );

  logger.info("[lab-seed] Finished.");
}
