-- =====================================================================
-- 008 - Hồ sơ cá nhân của Admin (SRS v8: UC009, UC012, mục 1.6 "Hồ sơ cá nhân")
-- - Bảng admins tách khỏi patients: Admin dùng UC009 nhưng KHÔNG xuất hiện
--   trong danh sách bệnh nhân (UC012).
-- - Trigger tự tạo dòng admins khi có tài khoản ADMIN mới.
-- - RPC uc009_update_profile cập nhật users + (patients | admins) theo vai trò
--   trong cùng một transaction (thay cho uc009_update_patient_profile).
-- ĐIỀU KIỆN: đã chạy 002, 004, 005. Chạy trong Supabase SQL Editor.
-- Backend dùng SERVICE ROLE KEY nên bỏ qua RLS; bật RLS để chặn anon/authenticated.
-- =====================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.admins (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    full_name     text,
    phone         text,
    date_of_birth date,
    gender        text CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    address       text,
    avatar_url    text,
    updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admins FROM anon, authenticated;

-- ---------- Chuyển dữ liệu cũ ----------
-- 1) Mọi tài khoản ADMIN đều có một dòng admins. Nếu Admin trước đây dùng tạm
--    một dòng patients thì chép thông tin sang; nếu không, lấy username làm họ tên.
INSERT INTO public.admins (user_id, full_name, phone, date_of_birth, gender, address, avatar_url)
SELECT u.id,
       COALESCE(p.full_name, u.username),
       p.phone, p.date_of_birth, p.gender, p.address, p.avatar_url
FROM public.users u
LEFT JOIN public.patients p ON p.user_id = u.id
WHERE u.role = 'ADMIN'
ON CONFLICT (user_id) DO NOTHING;

-- 2) Xóa dòng patients của tài khoản ADMIN nếu không có lịch hẹn/bệnh án nào
--    trỏ tới, để Admin không còn hiện trong UC012. Dòng còn dữ liệu liên quan
--    được giữ lại và cần nhóm xử lý tay (xem câu SELECT kiểm tra ở cuối file).
DELETE FROM public.patients p
USING public.users u
WHERE p.user_id = u.id
  AND u.role = 'ADMIN'
  AND NOT EXISTS (SELECT 1 FROM public.appointments a WHERE a.patient_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM public.medical_records m WHERE m.patient_id = p.id);

-- ---------- Tự tạo hồ sơ cho tài khoản ADMIN mới ----------
CREATE OR REPLACE FUNCTION public.uc009_create_admin_profile() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    IF NEW.role = 'ADMIN' THEN
        INSERT INTO public.admins (user_id, full_name)
        VALUES (NEW.id, NEW.username)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS uc009_admin_profile ON public.users;
CREATE TRIGGER uc009_admin_profile
AFTER INSERT OR UPDATE OF role ON public.users
FOR EACH ROW EXECUTE FUNCTION public.uc009_create_admin_profile();

-- ---------- RPC cập nhật hồ sơ theo vai trò ----------
CREATE OR REPLACE FUNCTION public.uc009_update_profile(
    p_user_id uuid,
    p_expected_password_hash text,
    p_email text,
    p_new_password_hash text,
    p_full_name text,
    p_phone text,
    p_date_of_birth date,
    p_gender text,
    p_address text,
    p_avatar_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
    v_user public.users%ROWTYPE;
    v_profile_id uuid;
    v_result jsonb;
BEGIN
    SELECT * INTO v_user FROM public.users WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND OR v_user.is_active IS FALSE THEN
        RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'UC009_USER_NOT_FOUND';
    END IF;
    IF v_user.role::text NOT IN ('PATIENT', 'ADMIN') THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'UC009_FORBIDDEN';
    END IF;
    IF v_user.password_hash IS DISTINCT FROM p_expected_password_hash THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'UC009_AUTH_STALE';
    END IF;

    -- Khóa dòng hồ sơ đúng bảng theo vai trò trước khi sửa users.
    IF v_user.role::text = 'ADMIN' THEN
        SELECT id INTO v_profile_id FROM public.admins WHERE user_id = p_user_id FOR UPDATE;
    ELSE
        SELECT id INTO v_profile_id FROM public.patients WHERE user_id = p_user_id FOR UPDATE;
    END IF;
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'UC009_PROFILE_NOT_FOUND';
    END IF;

    -- Email trùng (không phân biệt hoa/thường) -> unique index trả 23505, rollback.
    UPDATE public.users
    SET email = p_email,
        password_hash = COALESCE(p_new_password_hash, password_hash)
    WHERE id = p_user_id
    RETURNING * INTO v_user;

    IF v_user.role::text = 'ADMIN' THEN
        UPDATE public.admins
        SET full_name = p_full_name, phone = p_phone, date_of_birth = p_date_of_birth,
            gender = p_gender, address = p_address, avatar_url = p_avatar_url, updated_at = now()
        WHERE id = v_profile_id
        RETURNING jsonb_build_object('id', id, 'full_name', full_name, 'phone', phone,
            'date_of_birth', date_of_birth, 'gender', gender, 'address', address,
            'avatar_url', avatar_url) INTO v_result;
    ELSE
        UPDATE public.patients
        SET full_name = p_full_name, phone = p_phone, date_of_birth = p_date_of_birth,
            gender = p_gender, address = p_address, avatar_url = p_avatar_url, updated_at = now()
        WHERE id = v_profile_id
        RETURNING jsonb_build_object('id', id, 'full_name', full_name, 'phone', phone,
            'date_of_birth', date_of_birth, 'gender', gender, 'address', address,
            'avatar_url', avatar_url) INTO v_result;
    END IF;

    RETURN v_result || jsonb_build_object('email', v_user.email);
END;
$function$;

REVOKE ALL ON FUNCTION public.uc009_update_profile(uuid, text, text, text, text, text, date, text, text, text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.uc009_update_profile(uuid, text, text, text, text, text, date, text, text, text)
    TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';

-- Kiểm tra sau khi chạy (kết quả mong đợi: 0 dòng).
-- Dòng nào còn lại là tài khoản ADMIN có dòng patients đang gắn lịch hẹn/bệnh án.
-- SELECT u.email, p.id AS patient_id
-- FROM public.patients p JOIN public.users u ON u.id = p.user_id
-- WHERE u.role = 'ADMIN';
