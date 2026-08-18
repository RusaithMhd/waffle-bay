export function roundToTwoDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100
}

export interface OrderTotals {
  subtotal: number
  discountAmount: number
  taxAmount: number
  total: number
}

export function calculateOrderTotals(
  subtotal: number,
  discountType: 'percentage' | 'amount',
  discountValue: number,
  taxRatePercent: number
): OrderTotals {
  let discountAmount = 0
  if (discountType === 'percentage') {
    discountAmount = roundToTwoDecimals(subtotal * (discountValue / 100))
  } else {
    discountAmount = roundToTwoDecimals(discountValue)
  }

  // Cap discount between 0 and subtotal
  if (discountAmount > subtotal) {
    discountAmount = subtotal
  }
  if (discountAmount < 0) {
    discountAmount = 0
  }

  const discountedSubtotal = Math.max(0, subtotal - discountAmount)
  const taxAmount = roundToTwoDecimals(discountedSubtotal * (taxRatePercent / 100))
  const total = roundToTwoDecimals(discountedSubtotal + taxAmount)

  return {
    subtotal: roundToTwoDecimals(subtotal),
    discountAmount,
    taxAmount,
    total
  }
}
