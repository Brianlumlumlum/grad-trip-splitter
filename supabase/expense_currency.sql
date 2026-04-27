-- Add original payment currency + amount; `amount` remains the CAD value used for splits/balances.
-- Run in Supabase SQL Editor after schema.sql (or on existing projects).

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS original_amount numeric(14, 4),
  ADD COLUMN IF NOT EXISTS original_currency text NOT NULL DEFAULT 'CAD';

UPDATE public.expenses
SET original_amount = amount
WHERE original_amount IS NULL;

ALTER TABLE public.expenses
  ALTER COLUMN original_amount SET NOT NULL;

ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_original_currency_check;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_original_currency_check
  CHECK (original_currency IN ('CAD', 'JPY', 'CNY', 'KRW'));

COMMENT ON COLUMN public.expenses.amount IS 'Total in CAD (ledger / splits)';
COMMENT ON COLUMN public.expenses.original_amount IS 'Amount as paid, in original_currency';
COMMENT ON COLUMN public.expenses.original_currency IS 'ISO-style code: CAD, JPY, CNY, KRW';
