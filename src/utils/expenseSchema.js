/** PostgREST / Postgres error when `expenses` lacks currency columns. */
export function isLegacyExpenseSchemaError(err) {
  const m = String(err?.message ?? '')
  return m.includes('original_amount') || m.includes('original_currency')
}

export const EXPENSE_SELECT_WITH_CURRENCY =
  'id, trip_id, paid_by, created_by, title, amount, original_amount, original_currency, created_at, expense_participants ( user_id, share_amount )'

export const EXPENSE_SELECT_LEGACY =
  'id, trip_id, paid_by, created_by, title, amount, created_at, expense_participants ( user_id, share_amount )'
