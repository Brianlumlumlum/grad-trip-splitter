const FRANKFURTER_LATEST = 'https://api.frankfurter.app/latest'

/**
 * How many CAD one unit of `fromCurrency` is worth (e.g. 1 JPY → 0.0091 CAD).
 * @param {string} fromCurrency ISO 4217: CAD | JPY | CNY | KRW
 */
export async function fetchCadRate(fromCurrency) {
  if (fromCurrency === 'CAD') return 1
  const url = `${FRANKFURTER_LATEST}?from=${encodeURIComponent(fromCurrency)}&to=CAD`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Exchange rate request failed (${res.status})`)
  }
  const data = await res.json()
  const rate = data.rates?.CAD
  if (typeof rate !== 'number' || !Number.isFinite(rate)) {
    throw new Error('Could not read CAD rate from response')
  }
  return rate
}
