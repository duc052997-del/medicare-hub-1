-- MediCare-Hub | UC011 - Quan ly lich hen (API-20,21,22,25,26,27)
-- Vi tri de xuat: backend/db/migrations/007_uc011_appointment_management.sql
-- CANH BAO: Chi ap dung tren STAGING sau khi duoc PM/BE phe duyet.
--
-- Phan 1: tao bang medical_records/prescription_items (IDEMPOTENT).
-- Luu y: 2 bang nay TRUOC DAY da duoc tao THU CONG tren staging luc lam
-- UC008 (khong co migration file di kem trong repo). Doan CREATE TABLE IF
-- NOT EXISTS o day chi la "chup lai" dung cau truc da co de repo co day du
-- lich su - chay lai tren staging se khong lam gi them (bang da ton tai).
-- Tren moi may/project MOI (vd CI, may teammate khac) thi doan nay se thuc
-- su tao bang.
--
-- Phan 2: RPC uc011_complete_appointment - dung cho API-27, gop 3 buoc
-- (kiem tra trang thai CONFIRMED, tao medical_record + prescription_items,
-- chuyen appointment sang COMPLETED) vao 1 transaction duy nhat, khoa dong
-- appointment bang FOR UPDATE de tranh 2 admin bam "hoan tat" cung luc.

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL UNIQUE REFERENCES public.appointments(id),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id),
  diagnosis text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS medical_records_patient_idx
  ON public.medical_records (patient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.prescription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id uuid NOT NULL REFERENCES public.medical_records(id) ON DELETE CASCADE,
  medicine_name text NOT NULL,
  dosage text,
  frequency text,
  duration_days integer,
  instructions text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prescription_items_record_idx
  ON public.prescription_items (medical_record_id);

ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

-- p_prescriptions: mang jsonb dang [{"medicine_name":"...","dosage":"...",
-- "frequency":"...","duration_days":7,"instructions":"..."}], co the rong.
CREATE OR REPLACE FUNCTION public.uc011_complete_appointment(
    p_appointment_id uuid,
    p_diagnosis text,
    p_notes text,
    p_prescriptions jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
    v_appt public.appointments%ROWTYPE;
    v_record public.medical_records%ROWTYPE;
    v_item jsonb;
    v_prescriptions jsonb;
BEGIN
    -- Khoa dong appointment de 2 request "hoan tat" ban cung 1 lich hen
    -- khong the cung luc di qua check status ben duoi.
    SELECT * INTO v_appt
    FROM public.appointments
    WHERE id = p_appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'UC011_APPOINTMENT_NOT_FOUND';
    END IF;

    IF v_appt.status IS DISTINCT FROM 'CONFIRMED' THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'UC011_INVALID_STATUS';
    END IF;

    -- UNIQUE(appointment_id) tren medical_records la hang rao cuoi: neu 2
    -- request van lot qua check status o tren (ly thuyet, vi da FOR UPDATE)
    -- thi insert thu 2 se bao loi 23505, BE dich sang 409.
    INSERT INTO public.medical_records (appointment_id, patient_id, doctor_id, diagnosis, notes)
    VALUES (p_appointment_id, v_appt.patient_id, v_appt.doctor_id, p_diagnosis, p_notes)
    RETURNING * INTO v_record;

    FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_prescriptions, '[]'::jsonb)) LOOP
        INSERT INTO public.prescription_items (
            medical_record_id, medicine_name, dosage, frequency, duration_days, instructions
        )
        VALUES (
            v_record.id,
            v_item->>'medicine_name',
            v_item->>'dosage',
            v_item->>'frequency',
            NULLIF(v_item->>'duration_days', '')::integer,
            v_item->>'instructions'
        );
    END LOOP;

    UPDATE public.appointments SET status = 'COMPLETED' WHERE id = p_appointment_id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', pi.id,
        'medicine_name', pi.medicine_name,
        'dosage', pi.dosage,
        'frequency', pi.frequency,
        'duration_days', pi.duration_days,
        'instructions', pi.instructions
    )), '[]'::jsonb) INTO v_prescriptions
    FROM public.prescription_items pi
    WHERE pi.medical_record_id = v_record.id;

    RETURN jsonb_build_object(
        'id', v_record.id,
        'appointment_id', v_record.appointment_id,
        'diagnosis', v_record.diagnosis,
        'notes', v_record.notes,
        'prescriptions', v_prescriptions
    );
END;
$function$;

-- Chi backend (service_role) duoc goi RPC nay - giong cach uc009/uc010 dang lam.
REVOKE ALL ON FUNCTION public.uc011_complete_appointment(uuid, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.uc011_complete_appointment(uuid, text, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.uc011_complete_appointment(uuid, text, text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.uc011_complete_appointment(uuid, text, text, jsonb) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;

-- KIEM TRA SAU KHI CHAY:
-- SELECT proname FROM pg_proc WHERE proname = 'uc011_complete_appointment';
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema='public' AND table_name IN ('medical_records','prescription_items');