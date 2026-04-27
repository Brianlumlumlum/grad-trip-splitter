/** Round to 2 decimal places (currency). */
export function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100
}

const ZERO_DECIMAL = new Set(['JPY', 'KRW'])

/** Format an amount in a given ISO currency (ledger uses CAD). */
export function formatMoneyCurrency(currency, n) {
  const code = currency || 'CAD'
  const v = Number(n)
  if (ZERO_DECIMAL.has(code)) {
    const whole = Math.round(v)
    return whole.toLocaleString(undefined, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    })
  }
  const rounded = roundMoney(v)
  return rounded.toLocaleString(undefined, { style: 'currency', currency: code })
}

/** Format CAD (balances and split totals). */
export function formatMoney(n) {
  return formatMoneyCurrency('CAD', n)
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
