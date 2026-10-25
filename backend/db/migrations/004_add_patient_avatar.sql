-- UC009 - Them cot anh dai dien cho ho so benh nhan (API-13 / API-14).
-- Luu data URI (data:image/...;base64,...), toi da 700.000 ky tu.
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.patients
  DROP CONSTRAINT IF EXISTS patients_avatar_url_len_chk;
ALTER TABLE public.patients
  ADD CONSTRAINT patients_avatar_url_len_chk
  CHECK (avatar_url IS NULL OR char_length(avatar_url) <= 700000);
