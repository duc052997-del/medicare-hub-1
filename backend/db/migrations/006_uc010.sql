BEGIN;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS phone text;
CREATE UNIQUE INDEX IF NOT EXISTS doctors_email_uq ON public.doctors(lower(email)) WHERE email IS NOT NULL;
CREATE OR REPLACE FUNCTION public.uc010_save_doctor(p_id uuid,p_body jsonb) RETURNS jsonb
LANGUAGE plpgsql SET search_path=public AS $$
DECLARE d public.doctors; s jsonb; result jsonb;
BEGIN
 IF p_id IS NULL THEN
  INSERT INTO doctors(full_name,specialty,email,phone,avatar_url,bio,is_featured)
  VALUES(p_body->>'full_name',p_body->>'specialty',lower(p_body->>'email'),p_body->>'phone',p_body->>'avatar_url',p_body->>'bio',coalesce((p_body->>'is_featured')::boolean,false)) RETURNING * INTO d;
 ELSE
  SELECT * INTO d FROM doctors WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'DOCTOR_NOT_FOUND'; END IF;
  UPDATE doctors SET full_name=p_body->>'full_name',specialty=p_body->>'specialty',email=lower(p_body->>'email'),phone=p_body->>'phone',avatar_url=p_body->>'avatar_url',bio=p_body->>'bio',is_featured=coalesce((p_body->>'is_featured')::boolean,false) WHERE id=p_id RETURNING * INTO d;
 END IF;
 IF p_body ? 'schedules' THEN
  DELETE FROM doctor_schedules WHERE doctor_id=d.id;
  FOR s IN SELECT value FROM jsonb_array_elements(p_body->'schedules') LOOP
   INSERT INTO doctor_schedules(doctor_id,day_of_week,start_time,end_time,slot_minutes,is_active)
   VALUES(d.id,(s->>'day_of_week')::int,(s->>'start_time')::time,(s->>'end_time')::time,(s->>'slot_minutes')::int,true);
  END LOOP;
 END IF;
 SELECT jsonb_build_object('id',d.id,'full_name',d.full_name,'specialty',d.specialty,'email',d.email,'phone',d.phone,'avatar_url',d.avatar_url,'bio',d.bio,'is_featured',d.is_featured,'is_active',d.is_active,'schedules',coalesce(jsonb_agg(jsonb_build_object('id',ds.id,'day_of_week',ds.day_of_week,'start_time',to_char(ds.start_time,'HH24:MI'),'end_time',to_char(ds.end_time,'HH24:MI'),'slot_minutes',ds.slot_minutes) ORDER BY ds.day_of_week,ds.start_time) FILTER(WHERE ds.id IS NOT NULL),'[]'::jsonb)) INTO result FROM doctor_schedules ds WHERE ds.doctor_id=d.id AND ds.is_active=true;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.uc010_delete_doctor(p_id uuid) RETURNS void
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 -- Serializes appointment writes with the check, including concurrent bookings.
 LOCK TABLE appointments IN SHARE ROW EXCLUSIVE MODE;
 PERFORM 1 FROM doctors WHERE id=p_id AND is_active=true FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'DOCTOR_NOT_FOUND'; END IF;
 IF EXISTS(SELECT 1 FROM appointments WHERE doctor_id=p_id AND status IN ('PENDING','CONFIRMED') AND (appointment_date+start_time) >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')) THEN
  RAISE EXCEPTION 'FUTURE_APPOINTMENTS';
 END IF;
 UPDATE doctors SET is_active=false WHERE id=p_id;
END $$;
-- Prevent a booking that passed the earlier API check from inserting after deletion.
CREATE OR REPLACE FUNCTION public.uc010_check_active_doctor() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.status IN ('PENDING','CONFIRMED') AND NOT EXISTS(SELECT 1 FROM doctors WHERE id=NEW.doctor_id AND is_active=true) THEN
  RAISE EXCEPTION 'DOCTOR_INACTIVE' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS uc010_active_doctor ON appointments;
CREATE TRIGGER uc010_active_doctor BEFORE INSERT OR UPDATE OF doctor_id,status ON appointments FOR EACH ROW EXECUTE FUNCTION uc010_check_active_doctor();
REVOKE ALL ON FUNCTION public.uc010_save_doctor(uuid,jsonb),public.uc010_delete_doctor(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.uc010_save_doctor(uuid,jsonb),public.uc010_delete_doctor(uuid) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
