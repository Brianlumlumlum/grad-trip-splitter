/** Round to 2 decimal places (currency). */
export function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100
}

export function formatMoney(n) {
  const v = roundMoney(n)
  return v.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

/**
 * Split `total` dollars equally across `count` people using cent integers
 * so the parts always sum to the total.
 */
export function equalShareAmounts(total, count) {
  if (count < 1) return []
  const cents = Math.round(roundMoney(total) * 100)
  const base = Math.floor(cents / count)
  const remainder = cents % count
  const out = []
  for (let i = 0; i < count; i++) {
    const c = base + (i < remainder ? 1 : 0)
    out.push(c / 100)
  }
  return out
}
