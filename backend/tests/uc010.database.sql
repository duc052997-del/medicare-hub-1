\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE d jsonb; did uuid; uid uuid; pid uuid;
BEGIN
 d:=uc010_save_doctor(NULL,'{"full_name":"CI doctor","specialty":"Internal","email":"ci-doctor@example.com","phone":"0912345678","schedules":[{"day_of_week":1,"start_time":"08:00","end_time":"12:00","slot_minutes":30}]}');
 did:=(d->>'id')::uuid;
 IF jsonb_array_length(d->'schedules')<>1 THEN RAISE EXCEPTION 'schedule missing'; END IF;
 BEGIN
  PERFORM uc010_save_doctor(did,'{"full_name":"Should rollback","specialty":"Internal","email":"changed@example.com","phone":"0912345678","schedules":[{"day_of_week":8,"start_time":"08:00","end_time":"12:00","slot_minutes":30}]}');
  RAISE EXCEPTION 'expected check violation';
 EXCEPTION WHEN check_violation THEN NULL;
 END;
 IF (SELECT full_name FROM doctors WHERE id=did)<>'CI doctor' THEN RAISE EXCEPTION 'atomic rollback failed'; END IF;
 INSERT INTO users(email,username,password_hash) VALUES('ci-patient@example.com','ci','not-a-login-hash') RETURNING id INTO uid;
 INSERT INTO patients(user_id) VALUES(uid) RETURNING id INTO pid;
 INSERT INTO appointments(patient_id,doctor_id,appointment_date,start_time,end_time,status) VALUES(pid,did,current_date+2,'08:00','08:30','PENDING');
 BEGIN
  PERFORM uc010_delete_doctor(did);
  RAISE EXCEPTION 'delete was not blocked';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM<>'FUTURE_APPOINTMENTS' THEN RAISE; END IF;
 END;
 UPDATE appointments SET status='CANCELLED' WHERE doctor_id=did;
 PERFORM uc010_delete_doctor(did);
 IF NOT EXISTS(SELECT 1 FROM doctors WHERE id=did AND is_active=false) THEN RAISE EXCEPTION 'soft delete failed'; END IF;
END $$;
ROLLBACK;
