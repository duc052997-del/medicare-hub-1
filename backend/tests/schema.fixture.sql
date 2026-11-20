-- =====================================================================
-- MediCare Hub - schema.sql (BẢN NHÁP ĐỀ XUẤT cho 12 UC trong SRS)
-- PostgreSQL / Supabase. Chạy trong Supabase SQL Editor trên DB TRỐNG
-- (staging) hoặc dùng làm chuẩn để viết migration cho DB đang có.
--
-- Nguyên tắc: bảng nào cũng ghi phục vụ UC nào. Bảng/cột không truy được
-- về UC trong SRS thì không đưa vào.
-- Các bảng users / doctors / doctor_schedules / clinic_info giữ đúng tên
-- cột mà code UC001-UC005 đang dùng để không phải sửa code.
-- =====================================================================

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- ---------- Kiểu liệt kê ----------
do $$ begin
  create type user_role as enum ('PATIENT', 'ADMIN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum
    ('PENDING', 'CONFIRMED', 'REJECTED', 'COMPLETED', 'CANCELLED');
exception when duplicate_object then null; end $$;

-- ---------- 1. users  (UC001, UC002, UC003) ----------
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  username      text not null,          -- code đang bắt buộc; SRS chưa có -> cần chốt
  password_hash text not null,          -- bcrypt, không lưu mật khẩu gốc
  role          user_role not null default 'PATIENT',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create unique index if not exists users_email_uq on users (lower(email));

-- ---------- 2. patients  (UC001 tạo dòng rỗng, UC009, UC012) ----------
-- Hồ sơ bệnh nhân tách khỏi users: users = tài khoản đăng nhập,
-- patients = thông tin cá nhân. BE tạo 1 dòng patients khi đăng ký.
create table if not exists patients (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null unique references users(id) on delete cascade,
  patient_code text not null unique
               default ('BN' || lpad((floor(random()*1000000))::int::text, 6, '0')),
  full_name    text,
  phone        text,
  date_of_birth date,
  gender       text check (gender in ('MALE', 'FEMALE', 'OTHER')),
  address      text,
  updated_at   timestamptz not null default now()
);
create index if not exists patients_phone_idx on patients (phone);
create index if not exists patients_name_idx  on patients (lower(full_name));

-- ---------- 3. clinic_info  (UC004 trang chủ) ----------
create table if not exists clinic_info (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  hotline       text,
  address       text,
  email         text,
  working_hours text,
  updated_at    timestamptz not null default now()
);

-- ---------- 4. doctors  (UC004, UC005, UC006, UC010) ----------
create table if not exists doctors (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  specialty   text not null,      -- giữ dạng text vì code lọc bằng ilike
  email       text,               -- UC010 có kiểm tra email trùng
  phone       text,               -- UC010 có kiểm tra SĐT
  avatar_url  text,
  bio         text,
  is_featured boolean not null default false,
  is_active   boolean not null default true,   -- UC010 xóa = soft delete
  created_at  timestamptz not null default now()
);
create unique index if not exists doctors_email_uq
  on doctors (lower(email)) where email is not null;
create index if not exists doctors_specialty_idx on doctors (lower(specialty));

-- ---------- 5. doctor_schedules  (UC005, UC006) ----------
-- day_of_week: 0 = Chủ nhật ... 6 = Thứ bảy (khớp getUTCDay() trong code)
create table if not exists doctor_schedules (
  id           uuid primary key default gen_random_uuid(),
  doctor_id    uuid not null references doctors(id) on delete cascade,
  day_of_week  smallint not null check (day_of_week between 0 and 6),
  start_time   time not null,
  end_time     time not null,
  slot_minutes smallint not null default 30 check (slot_minutes > 0),
  is_active    boolean not null default true,
  check (end_time > start_time),
  unique (doctor_id, day_of_week, start_time)
);

-- ---------- 6. appointments  (UC006, UC007, UC011) ----------
create table if not exists appointments (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references patients(id),
  doctor_id        uuid not null references doctors(id),
  appointment_date date not null,
  start_time       time not null,
  end_time         time not null,
  symptoms         text,                          -- UC006: nhập triệu chứng
  status           appointment_status not null default 'PENDING',  -- "Chờ xác nhận"
  cancel_reason    text,
  cancelled_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (end_time > start_time)
);
-- CHỐNG TRÙNG GIỜ Ở TẦNG DB (UC006 bước 6, UC011 đổi lịch):
-- 1 bác sĩ, 1 ngày, 1 giờ bắt đầu chỉ có tối đa 1 lịch còn hiệu lực.
create unique index if not exists appointments_no_double_booking
  on appointments (doctor_id, appointment_date, start_time)
  where status in ('PENDING', 'CONFIRMED', 'COMPLETED');
-- Cùng 1 bệnh nhân không đặt 2 lịch cùng giờ.
create unique index if not exists appointments_patient_no_overlap
  on appointments (patient_id, appointment_date, start_time)
  where status in ('PENDING', 'CONFIRMED', 'COMPLETED');
create index if not exists appointments_patient_idx on appointments (patient_id, appointment_date desc);
create index if not exists appointments_doctor_idx  on appointments (doctor_id, appointment_date);

-- ---------- 7. medical_records  (UC008, UC012) ----------
-- 1 lịch khám đã hoàn tất có tối đa 1 hồ sơ bệnh án.
create table if not exists medical_records (
  id             uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references appointments(id),
  patient_id     uuid not null references patients(id),
  doctor_id      uuid not null references doctors(id),
  diagnosis      text not null,      -- kết luận
  notes          text,
  created_at     timestamptz not null default now()
);
create index if not exists medical_records_patient_idx on medical_records (patient_id, created_at desc);

-- ---------- 8. prescription_items  (UC008: đơn thuốc) ----------
create table if not exists prescription_items (
  id                uuid primary key default gen_random_uuid(),
  medical_record_id uuid not null references medical_records(id) on delete cascade,
  medicine_name     text not null,
  dosage            text,            -- liều dùng
  frequency         text,            -- ví dụ: 2 lần/ngày
  duration_days     smallint check (duration_days > 0),
  instructions      text
);
create index if not exists prescription_items_record_idx on prescription_items (medical_record_id);

-- ---------- 9. (TÙY CHỌN) appointment_reminders ----------
-- SRS UC011 nhánh c có "xem/sửa nhắc lịch" (SMS/Email), nhưng mục Giới hạn
-- của SRS ghi KHÔNG gửi email/SMS nhắc hẹn tự động. Mâu thuẫn -> nhóm phải
-- chốt. Chỉ bỏ comment bảng này nếu quyết định GIỮ nhánh nhắc lịch
-- (chỉ lưu cài đặt, không gửi thật).
-- create table if not exists appointment_reminders (
--   id                    uuid primary key default gen_random_uuid(),
--   appointment_id        uuid not null unique references appointments(id) on delete cascade,
--   remind_before_minutes int  not null check (remind_before_minutes > 0),
--   via_email             boolean not null default true,
--   via_sms               boolean not null default false,
--   check (via_email or via_sms)  -- SRS c6: phải chọn ít nhất 1 kênh
-- );

-- ---------- Bảo mật: bật RLS cho bảng nhạy cảm ----------
-- Backend dùng service role key nên bỏ qua RLS và tự phân quyền ở middleware.
-- Bật RLS không kèm policy = chặn truy cập trực tiếp bằng anon key.
alter table users             enable row level security;
alter table patients          enable row level security;
alter table appointments      enable row level security;
alter table medical_records   enable row level security;
alter table prescription_items enable row level security;
