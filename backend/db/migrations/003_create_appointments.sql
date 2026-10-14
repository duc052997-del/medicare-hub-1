-- MediCare-Hub | UC006 / UC007 / UC011
-- Migration: tao bang lich hen (appointments)
-- Vi tri de xuat: backend/db/migrations/003_create_appointments.sql
-- CANH BAO: Chi ap dung tren STAGING sau khi duoc PM/BE phe duyet.
-- Bang da tao thu cong tren Supabase main (PRODUCTION): KHONG chay lai
-- hoac tu dong danh dau migration da ap dung khi chua doi chieu schema.
-- Khong chua du lieu mau. Chay file seed rieng tren staging.
-- Chay SQL Editor: chon dung project staging -> New query -> paste -> Run.
-- Neu project da co bang appointments, lenh IF NOT EXISTS khong kiem tra
-- su khac biet ve cau truc; can doi chieu truoc khi ghi nhan migration.

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  patient_id_type text;
  doctor_id_type text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod) INTO patient_id_type
  FROM pg_attribute a
  WHERE a.attrelid = to_regclass('public.patients')
    AND a.attname = 'id' AND NOT a.attisdropped;

  SELECT format_type(a.atttypid, a.atttypmod) INTO doctor_id_type
  FROM pg_attribute a
  WHERE a.attrelid = to_regclass('public.doctors')
    AND a.attname = 'id' AND NOT a.attisdropped;

  IF patient_id_type IS DISTINCT FROM 'uuid' OR doctor_id_type IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION 'ID khong dung UUID: patients.id=%, doctors.id=%',
      patient_id_type, doctor_id_type;
  END IF;
END $$;

DO $$
BEGIN
  CREATE TYPE public.appointment_status AS ENUM
    ('PENDING', 'CONFIRMED', 'REJECTED', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  doctor_id uuid NOT NULL REFERENCES public.doctors(id),
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  symptoms text,
  status public.appointment_status NOT NULL DEFAULT 'PENDING',
  cancel_reason text,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointments_valid_time CHECK (end_time > start_time)
);

-- Chi chan trung gio BAT DAU, chua chan moi khoang gio chong lan.
CREATE UNIQUE INDEX IF NOT EXISTS appointments_no_double_booking
  ON public.appointments (doctor_id, appointment_date, start_time)
  WHERE status IN ('PENDING', 'CONFIRMED', 'COMPLETED');

CREATE UNIQUE INDEX IF NOT EXISTS appointments_patient_no_overlap
  ON public.appointments (patient_id, appointment_date, start_time)
  WHERE status IN ('PENDING', 'CONFIRMED', 'COMPLETED');

CREATE INDEX IF NOT EXISTS appointments_patient_idx
  ON public.appointments (patient_id, appointment_date DESC);
CREATE INDEX IF NOT EXISTS appointments_doctor_idx
  ON public.appointments (doctor_id, appointment_date);

-- Khong tao policy truy cap truc tiep: BE dung service role (giu bi mat)
-- va phai kiem tra JWT, role, patient_id o tang API.
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
COMMIT;

-- KIEM TRA SAU KHI CHAY:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='appointments'
-- ORDER BY ordinal_position;
-- SELECT indexname FROM pg_indexes
-- WHERE schemaname='public' AND tablename='appointments';
-- SELECT relrowsecurity FROM pg_class WHERE oid='public.appointments'::regclass;
