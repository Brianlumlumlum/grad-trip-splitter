-- Run once in Supabase SQL Editor if expenses already exist without created_by

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users (id) ON DELETE CASCADE;

UPDATE public.expenses
SET created_by = paid_by
WHERE created_by IS NULL;

ALTER TABLE public.expenses
  ALTER COLUMN created_by SET NOT NULL;

DROP POLICY IF EXISTS "expenses_insert_member" ON public.expenses;
CREATE POLICY "expenses_insert_member"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_trip_member(trip_id)
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = trip_id AND tm.user_id = paid_by
    )
  );

DROP POLICY IF EXISTS "expenses_delete_member" ON public.expenses;
CREATE POLICY "expenses_delete_creator"
  ON public.expenses FOR DELETE
  TO authenticated
  USING (public.is_trip_member(trip_id) AND created_by = auth.uid());

NOTIFY pgrst, 'reload schema';
