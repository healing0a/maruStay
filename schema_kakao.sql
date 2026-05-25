-- =====================================================
-- MaruStay — 카카오 로그인 스키마 (v0.4)
-- Supabase SQL Editor에 붙여넣기 후 Run 클릭
-- =====================================================

-- 1. 프로필 테이블
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kakao_id    TEXT UNIQUE NOT NULL,
  nickname    TEXT,
  email       TEXT,
  avatar_url  TEXT,
  last_login  TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_public_read"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "profiles_insert"
  ON profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "profiles_update"
  ON profiles FOR UPDATE USING (true) WITH CHECK (true);


-- 2. Upsert RPC (SECURITY DEFINER — anon 키로 호출 가능)
CREATE OR REPLACE FUNCTION public.upsert_kakao_profile(
  p_kakao_id   TEXT,
  p_nickname   TEXT,
  p_email      TEXT,
  p_avatar_url TEXT
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO profiles (kakao_id, nickname, email, avatar_url, last_login)
  VALUES (p_kakao_id, p_nickname, p_email, p_avatar_url, NOW())
  ON CONFLICT (kakao_id) DO UPDATE
    SET nickname   = EXCLUDED.nickname,
        email      = COALESCE(EXCLUDED.email, profiles.email),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        last_login = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_kakao_profile TO anon, authenticated;


-- 3. 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_kakao_id ON profiles(kakao_id);
