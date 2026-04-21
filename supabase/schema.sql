-- Grad Trip Splitter — run in Supabase SQL Editor
-- Requires: Auth enabled (email/password)

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trip_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  UNIQUE (trip_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_members_trip ON public.trip_members (trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_user ON public.trip_members (user_id);

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips (id) ON DELETE CASCADE,
  paid_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title text NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_trip ON public.expenses (trip_id);

CREATE TABLE IF NOT EXISTS public.expense_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  share_amount numeric(12, 2) NOT NULL CHECK (share_amount >= 0),
  UNIQUE (expense_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_expense_participants_expense ON public.expense_participants (expense_id);

CREATE TABLE IF NOT EXISTS public.settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips (id) ON DELETE CASCADE,
  from_user uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  to_user uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_user <> to_user)
);

CREATE INDEX IF NOT EXISTS idx_settlements_trip ON public.settlements (trip_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.trip_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_participants TO authenticated;
GRANT SELECT, INSERT ON public.settlements TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS helper (stable + security definer so policies stay simple)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_trip_member(p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trip_members tm
    WHERE tm.trip_id = p_trip_id
      AND tm.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_trip_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_trip_member(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Trips: signed-in users can see all trips (discover + join). Only creator updates/deletes.
DROP POLICY IF EXISTS "trips_select_authenticated" ON public.trips;
CREATE POLICY "trips_select_authenticated"
  ON public.trips FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "trips_insert_creator" ON public.trips;
CREATE POLICY "trips_insert_creator"
  ON public.trips FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "trips_update_creator" ON public.trips;
CREATE POLICY "trips_update_creator"
  ON public.trips FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "trips_delete_creator" ON public.trips;
CREATE POLICY "trips_delete_creator"
  ON public.trips FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Trip members: readable to authenticated (see who joined). Users may only add/remove themselves.
DROP POLICY IF EXISTS "trip_members_select_authenticated" ON public.trip_members;
CREATE POLICY "trip_members_select_authenticated"
  ON public.trip_members FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "trip_members_insert_self" ON public.trip_members;
CREATE POLICY "trip_members_insert_self"
  ON public.trip_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "trip_members_delete_self" ON public.trip_members;
CREATE POLICY "trip_members_delete_self"
  ON public.trip_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Expenses: members only
DROP POLICY IF EXISTS "expenses_select_member" ON public.expenses;
CREATE POLICY "expenses_select_member"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id));

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

DROP POLICY IF EXISTS "expenses_update_member" ON public.expenses;
CREATE POLICY "expenses_update_member"
  ON public.expenses FOR UPDATE
  TO authenticated
  USING (public.is_trip_member(trip_id))
  WITH CHECK (public.is_trip_member(trip_id));

DROP POLICY IF EXISTS "expenses_delete_member" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_creator" ON public.expenses;
CREATE POLICY "expenses_delete_creator"
  ON public.expenses FOR DELETE
  TO authenticated
  USING (public.is_trip_member(trip_id) AND created_by = auth.uid());

-- Expense participants: same trip membership via parent expense
DROP POLICY IF EXISTS "ep_select_member" ON public.expense_participants;
CREATE POLICY "ep_select_member"
  ON public.expense_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_participants.expense_id
        AND public.is_trip_member(e.trip_id)
    )
  );

DROP POLICY IF EXISTS "ep_insert_member" ON public.expense_participants;
CREATE POLICY "ep_insert_member"
  ON public.expense_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_participants.expense_id
        AND public.is_trip_member(e.trip_id)
    )
  );

DROP POLICY IF EXISTS "ep_update_member" ON public.expense_participants;
CREATE POLICY "ep_update_member"
  ON public.expense_participants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_participants.expense_id
        AND public.is_trip_member(e.trip_id)
    )
  );

DROP POLICY IF EXISTS "ep_delete_member" ON public.expense_participants;
CREATE POLICY "ep_delete_member"
  ON public.expense_participants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_participants.expense_id
        AND public.is_trip_member(e.trip_id)
    )
  );

-- Settlements: members; record payments you send (from_user = you)
DROP POLICY IF EXISTS "settlements_select_member" ON public.settlements;
CREATE POLICY "settlements_select_member"
  ON public.settlements FOR SELECT
  TO authenticated
  USING (public.is_trip_member(trip_id));

DROP POLICY IF EXISTS "settlements_insert_sender" ON public.settlements;
CREATE POLICY "settlements_insert_sender"
  ON public.settlements FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_trip_member(trip_id)
    AND from_user = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Profiles (display names for members — see also supabase/profiles.sql)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id,
    COALESCE(
      NULLIF(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      NULLIF(trim(split_part(COALESCE(new.email, ''), '@', 1)), ''),
      'Traveler'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
