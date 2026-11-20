-- UC009 / API-14 PUT /api/auth/profile: cap nhat email, mat khau, ho so
-- trong CUNG MOT transaction. Token Patient/Admin, chi ho so chinh user.
-- DIEU KIEN: da chay 004_add_patient_avatar.sql; bang users/patients va
-- unique index users_email_uq (lower(email)) da ton tai.
-- Backend PHẢI su dung Supabase SERVICE ROLE KEY (khong dua key nay ra FE).
-- Moi lan goi RPC PostgREST chay trong mot transaction: exception -> rollback.
-- Nếu tạo unique index thất bại vì dữ liệu trùng email không phân biệt hoa/thường,
-- cần xử lý dữ liệu cũ trước, KHÔNG bỏ ràng buộc này.

CREATE UNIQUE INDEX IF NOT EXISTS users_email_uq ON public.users (lower(email));

CREATE OR REPLACE FUNCTION public.uc009_update_patient_profile(
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
    v_patient public.patients%ROWTYPE;
BEGIN
    -- Khoa tai khoan de tranh hai thao tac cap nhat dong thoi.
    SELECT * INTO v_user
    FROM public.users
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND OR v_user.is_active IS FALSE THEN
        RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'UC009_USER_NOT_FOUND';
    END IF;
    IF v_user.role::text NOT IN ('PATIENT', 'ADMIN') THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'UC009_FORBIDDEN';
    END IF;
    IF v_user.password_hash IS DISTINCT FROM p_expected_password_hash THEN
        RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'UC009_AUTH_STALE';
    END IF;

    -- Phai co ho so gan voi p_user_id truoc khi thay doi users.
    -- Admin khong co dong patients se tra 404, khong tu tao patients.
    SELECT * INTO v_patient
    FROM public.patients
    WHERE user_id = p_user_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'UC009_PATIENT_NOT_FOUND';
    END IF;

    -- Neu email trung (khong phan biet hoa thuong), unique index bao ve,
    -- PostgreSQL tra 23505 va rollback ca transaction.
    UPDATE public.users
    SET email = p_email,
        password_hash = COALESCE(p_new_password_hash, password_hash)
    WHERE id = p_user_id
    RETURNING * INTO v_user;

    UPDATE public.patients
    SET full_name = p_full_name,
        phone = p_phone,
        date_of_birth = p_date_of_birth,
        gender = p_gender,
        address = p_address,
        avatar_url = p_avatar_url,
        updated_at = NOW()
    WHERE id = v_patient.id
    RETURNING * INTO v_patient;

    RETURN jsonb_build_object(
        'id', v_patient.id,
        'email', v_user.email,
        'full_name', v_patient.full_name,
        'phone', v_patient.phone,
        'date_of_birth', v_patient.date_of_birth,
        'gender', v_patient.gender,
        'address', v_patient.address,
        'avatar_url', v_patient.avatar_url
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.uc009_update_patient_profile(
    uuid, text, text, text, text, text, date, text, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.uc009_update_patient_profile(
    uuid, text, text, text, text, text, date, text, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.uc009_update_patient_profile(
    uuid, text, text, text, text, text, date, text, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.uc009_update_patient_profile(
    uuid, text, text, text, text, text, date, text, text, text
) TO service_role;

NOTIFY pgrst, 'reload schema';
