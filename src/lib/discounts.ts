export interface DiscountTier {
  minQuantity: number;
  discountPercent: number;
}

export const QUANTITY_DISCOUNT_TIERS: DiscountTier[] = [
  { minQuantity: 1, discountPercent: 0 },
  { minQuantity: 2, discountPercent: 10 },
  { minQuantity: 3, discountPercent: 15 },
  { minQuantity: 5, discountPercent: 20 },
  { minQuantity: 10, discountPercent: 30 }
];

export function getQuantityDiscount(quantity: number): number {
  const applicableTier = [...QUANTITY_DISCOUNT_TIERS]
    .reverse()
    .find(tier => quantity >= tier.minQuantity);

  return applicableTier?.discountPercent || 0;
}

export function calculateSubscriptionDiscount(months: number, baseDiscount: number): number {
  return baseDiscount;
}

export function calculateItemPrice(
  basePrice: number,
  months: number,
  subscriptionDiscount: number,
  quantity: number,
  itemIndex: number
): {
  originalPrice: number;
  finalPrice: number;
  totalDiscount: number;
  subscriptionDiscount: number;
  quantityDiscount: number;
} {
  const monthlyOriginalPrice = basePrice * months;

  let priceAfterSubscription = monthlyOriginalPrice;
  if (subscriptionDiscount > 0) {
    priceAfterSubscription = monthlyOriginalPrice * (1 - subscriptionDiscount / 100);
  }

  let quantityDiscount = 0;
  if (itemIndex > 0) {
    quantityDiscount = getQuantityDiscount(itemIndex + 1);
  }

  let finalPrice = priceAfterSubscription;
  if (quantityDiscount > 0) {
    finalPrice = priceAfterSubscription * (1 - quantityDiscount / 100);
  }

  const totalDiscount = ((monthlyOriginalPrice - finalPrice) / monthlyOriginalPrice) * 100;

  return {
    originalPrice: monthlyOriginalPrice,
    finalPrice: Math.round(finalPrice * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 10) / 10,
    subscriptionDiscount,
    quantityDiscount
  };
}

export function calculateCartTotal(items: Array<{
  basePrice: number;
  months: number;
  subscriptionDiscount: number;
  quantity: number;
  isSIM: boolean;
}>): {
  originalTotal: number;
  finalTotal: number;
  totalSaved: number;
  items: Array<{
    originalPrice: number;
    finalPrice: number;
    totalDiscount: number;
    subscriptionDiscount: number;
    quantityDiscount: number;
  }>;
} {
  let originalTotal = 0;
  let finalTotal = 0;
  const calculatedItems = [];

  let currentSimIndex = 0;

  for (const item of items) {
    if (item.isSIM) {
      for (let q = 0; q < item.quantity; q++) {
        const calculation = calculateItemPrice(
          item.basePrice,
          item.months,
          item.subscriptionDiscount,
          item.quantity,
          currentSimIndex
        );

        originalTotal += calculation.originalPrice;
        finalTotal += calculation.finalPrice;

        if (q === 0) {
          calculatedItems.push(calculation);
        }

        currentSimIndex++;
      }
    } else {
      const itemPrice = item.basePrice * item.quantity;
      originalTotal += itemPrice;
      finalTotal += itemPrice;

      calculatedItems.push({
        originalPrice: item.basePrice,
        finalPrice: item.basePrice,
        totalDiscount: 0,
        subscriptionDiscount: 0,
        quantityDiscount: 0
      });
    }
  }

  return {
    originalTotal: Math.round(originalTotal * 100) / 100,
    finalTotal: Math.round(finalTotal * 100) / 100,
    totalSaved: Math.round((originalTotal - finalTotal) * 100) / 100,
    items: calculatedItems
  };
}
