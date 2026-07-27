-- Keep the database as the final authority for meter data integrity.

CREATE UNIQUE INDEX IF NOT EXISTS meter_readings_user_date_unique
  ON public.meter_readings (user_id, reading_date);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'meter_readings_value_nonnegative'
      AND conrelid = 'public.meter_readings'::regclass
  ) THEN
    ALTER TABLE public.meter_readings
      ADD CONSTRAINT meter_readings_value_nonnegative CHECK (value >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'meter_readings_note_length'
      AND conrelid = 'public.meter_readings'::regclass
  ) THEN
    ALTER TABLE public.meter_readings
      ADD CONSTRAINT meter_readings_note_length CHECK (char_length(note) <= 200);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_kwh_rate_nonnegative'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_kwh_rate_nonnegative CHECK (kwh_rate >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_language_supported'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_language_supported CHECK (language IN ('pl', 'en'));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_meter_reading_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  previous_value NUMERIC;
  next_value NUMERIC;
BEGIN
  -- Serialize writes for a single user so two concurrent inserts cannot cross.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 0));

  SELECT value
  INTO previous_value
  FROM public.meter_readings
  WHERE user_id = NEW.user_id
    AND reading_date < NEW.reading_date
    AND id IS DISTINCT FROM NEW.id
  ORDER BY reading_date DESC
  LIMIT 1;

  SELECT value
  INTO next_value
  FROM public.meter_readings
  WHERE user_id = NEW.user_id
    AND reading_date > NEW.reading_date
    AND id IS DISTINCT FROM NEW.id
  ORDER BY reading_date ASC
  LIMIT 1;

  IF previous_value IS NOT NULL AND NEW.value < previous_value THEN
    RAISE EXCEPTION 'Meter reading cannot be lower than the previous reading'
      USING ERRCODE = '23514';
  END IF;

  IF next_value IS NOT NULL AND NEW.value > next_value THEN
    RAISE EXCEPTION 'Meter reading cannot be higher than the next reading'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_meter_reading_order ON public.meter_readings;
CREATE TRIGGER validate_meter_reading_order
  BEFORE INSERT OR UPDATE OF user_id, reading_date, value
  ON public.meter_readings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_meter_reading_order();

CREATE OR REPLACE FUNCTION public.set_profile_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profile_updated_at ON public.profiles;
CREATE TRIGGER set_profile_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profile_updated_at();

REVOKE EXECUTE ON FUNCTION public.validate_meter_reading_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_profile_updated_at() FROM PUBLIC, anon, authenticated;
