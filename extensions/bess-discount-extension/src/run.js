// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.All,
  discounts: [],
};

export function run(input) {
  // If cart or lines are missing, no discount
  if (!input.cart?.lines?.length) {
    return EMPTY_DISCOUNT;
  }

  let totalJars = 0;
  let totalProducts = 0; // Track total number of products
  const honeyLineIds = [];
  const jarBundleLineIds = [];

  // Count total jars and total products, track honey lines
  for (const line of input.cart.lines) {
    if (line.merchandise?.__typename === "ProductVariant") {
      const quantity = line.quantity || 0;
      const productType = (line.merchandise.product?.productType || "").toLowerCase();

      // Each jar-bundle counts as 3 jars, and now also as 3 products
      if (productType === "jar-bundle") {
        totalJars += 3 * quantity;
        totalProducts += 3 * quantity; // <-- KEY CHANGE
        jarBundleLineIds.push(line.id);

      // Each honey line counts as 1 jar and 1 product
      } else if (productType === "honey") {
        totalJars += quantity;
        totalProducts += quantity;
        honeyLineIds.push(line.id);

      // Other product types simply count by their quantity
      } else {
        totalProducts += quantity;
      }
    }
  }

  // Must have at least 4 products, and at least one honey line for discount
  if (totalProducts < 4 || honeyLineIds.length === 0) {
    return EMPTY_DISCOUNT;
  }

  const discounts = [];

  // 10% off honey lines for 4+ products (excluding jar-bundles)
  discounts.push({
    targets: honeyLineIds.map((lineId) => ({ cartLine: { id: lineId } })),
    value: { percentage: { value: 10 } },
    message: "10% off (4+ JARS)",
  });

  // If 8+ jars, also apply free shipping (including jar-bundles)
  if (totalJars >= 8) {
    discounts.push({
      targets: [
        {
          shippingLine: {
            handle: "any", // Applies to any shipping method
          },
        },
      ],
      value: { percentage: { value: 100 } }, // Free shipping
      message: "Free shipping for 8+ jars",
    });
  }

  // "All" so both discounts can apply together at 8+ jars
  return {
    discountApplicationStrategy: DiscountApplicationStrategy.All,
    discounts,
  };
}
