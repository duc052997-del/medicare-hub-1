-- UC001 - RPC dang ky benh nhan
-- Yeu cau: public.users va public.patients da ton tai.
CREATE OR REPLACE FUNCTION public.register_patient(p_email text, p_username text, p_password_hash text)
 RETURNS SETOF public.users
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
DECLARE
    v_user public.users%ROWTYPE;
BEGIN
    -- Tao tai khoan benh nhan
    INSERT INTO public.users (
        email,
        username,
        password_hash,
        role
    )
    VALUES (
        p_email,
        p_username,
        p_password_hash,
        'PATIENT'
    )
    RETURNING * INTO v_user;

    -- Tao ho so benh nhan
    INSERT INTO public.patients (
        user_id
    )
    VALUES (
        v_user.id
    );

    -- Tra thong tin tai khoan
    RETURN NEXT v_user;
END;
$function$;

-- Khong cho phep cac vai tro API cong khai goi RPC truc tiep.
REVOKE ALL ON FUNCTION public.register_patient(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_patient(text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.register_patient(text, text, text) FROM authenticated;

-- Backend su dung service_role de goi RPC.
GRANT EXECUTE ON FUNCTION public.register_patient(text, text, text) TO service_role;
