CREATE TABLE public.savings_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_name text NOT NULL,
  total_amount numeric(12,2) NOT NULL CHECK (total_amount > 0),
  daily_target numeric(12,2) NOT NULL CHECK (daily_target > 0),
  duration_days integer NOT NULL CHECK (duration_days > 0),
  saved_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (saved_amount >= 0),
  product_image_url text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.savings_goals TO authenticated;
GRANT ALL ON public.savings_goals TO service_role;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own savings goals" ON public.savings_goals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.savings_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  contribution_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.savings_contributions TO authenticated;
GRANT ALL ON public.savings_contributions TO service_role;
ALTER TABLE public.savings_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own contributions" ON public.savings_contributions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER savings_goals_updated_at BEFORE UPDATE ON public.savings_goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER savings_contributions_updated_at BEFORE UPDATE ON public.savings_contributions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_goal_saved_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_goal uuid;
BEGIN
  affected_goal := COALESCE(NEW.goal_id, OLD.goal_id);
  UPDATE public.savings_goals
  SET saved_amount = COALESCE((SELECT SUM(amount) FROM public.savings_contributions WHERE goal_id = affected_goal), 0)
  WHERE id = affected_goal;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER sync_goal_after_contribution
AFTER INSERT OR UPDATE OR DELETE ON public.savings_contributions
FOR EACH ROW EXECUTE FUNCTION public.sync_goal_saved_amount();