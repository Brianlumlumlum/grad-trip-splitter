/**
 * CAD per 1 unit of foreign currency (no API — edit values here when you want them closer to market).
 * Splits and balances always use the CAD amount: original × rate.
 */
export const CAD_PER_UNIT = {
  CAD: 1,
  /** Japanese yen */
  JPY: 0.0091,
  /** Chinese yuan (RMB) */
  CNY: 0.195,
  /** Korean won */
  KRW: 0.00105,
}

/**
 * How many CAD one unit of `fromCurrency` is worth (e.g. 1 JPY → 0.0091 CAD).
 * @param {string} fromCurrency CAD | JPY | CNY | KRW
 */
export function getCadPerUnit(fromCurrency) {
  const rate = CAD_PER_UNIT[fromCurrency]
  if (typeof rate !== 'number' || !Number.isFinite(rate)) {
    throw new Error(`Unknown currency: ${fromCurrency}`)
  }
  return rate
}
