-- =====================================================
-- MaruStay Database Schema
-- Supabase SQL Editor에 전체 붙여넣기 후 Run 클릭
-- =====================================================

-- 1. 객실 테이블
CREATE TABLE IF NOT EXISTS rooms (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL, -- 'small' | 'medium' | 'cat' | 'ocean'
  description TEXT,
  price       INTEGER NOT NULL,
  max_weight  TEXT,
  status      TEXT DEFAULT 'available',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 객실 기본 데이터 삽입
INSERT INTO rooms (name, type, description, price, max_weight, status) VALUES
  ('소형견룸',       'small',  '말티푸·푸들·비숑·포메라니안 등 소형견 전용',                             30000, '10kg 이하',  'available'),
  ('중형견룸',       'medium', '코카·시바·웰시코기 등 중형견 전용',                                       40000, '10~25kg',   'available'),
  ('애묘룸',         'cat',    '고양이 전용 독립룸 — 캣타워·숨숨집 완비',                                 45000, '제한없음',   'available'),
  ('오션뷰 힐링룸',  'ocean',  '소·중형견 전용 프리미엄 단독룸 (애묘 이용 불가, 보호자 동반 숙박 불가)',   50000, '25kg 이하',  'available')
ON CONFLICT DO NOTHING;


-- 2. 예약 요청 테이블 (예약 폼 → DB 저장)
CREATE TABLE IF NOT EXISTS reservation_requests (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 보호자 정보
  owner_name          TEXT NOT NULL,
  owner_phone         TEXT NOT NULL,
  owner_email         TEXT,
  owner_address       TEXT,
  owner_emergency     TEXT,

  -- 반려동물 정보
  pet_name            TEXT NOT NULL,
  pet_type            TEXT NOT NULL,
  pet_breed           TEXT,
  pet_age             TEXT,
  pet_gender          TEXT,
  pet_neutered        TEXT,
  pet_weight          TEXT,
  pet_reg_no          TEXT,
  pet_vaccinated      TEXT,
  pet_bite            TEXT,
  pet_anxiety         TEXT,
  pet_allergy         TEXT,
  pet_medications     TEXT,
  pet_notes           TEXT,

  -- 이용 정보
  checkin_date        DATE NOT NULL,
  checkout_date       DATE NOT NULL,
  room_type           TEXT,
  pickup_service      TEXT DEFAULT 'basic',
  hiorder_requested   BOOLEAN DEFAULT FALSE,
  requests            TEXT,

  -- 동의 항목
  consent_privacy     BOOLEAN DEFAULT FALSE,
  consent_cctv        BOOLEAN DEFAULT FALSE,
  consent_ai          BOOLEAN DEFAULT FALSE,
  consent_marketing   BOOLEAN DEFAULT FALSE,

  -- 관리자용
  status              TEXT DEFAULT 'pending',  -- pending | confirmed | checked_in | checked_out | cancelled
  admin_memo          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);


-- 3. RLS(행 수준 보안) 활성화
ALTER TABLE rooms                ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_requests ENABLE ROW LEVEL SECURITY;


-- 4. RLS 정책 설정

-- 객실 정보는 누구나 읽을 수 있음 (공개 정보)
CREATE POLICY "rooms_select_public"
  ON rooms FOR SELECT
  USING (true);

-- 예약 신청: RPC 함수(SECURITY DEFINER)를 통해 INSERT → 직접 테이블 접근 정책 불필요
-- (아래는 서비스 롤 전용 직접 INSERT용 정책)
CREATE POLICY "allow_insert"
  ON reservation_requests FOR INSERT
  WITH CHECK (true);

-- 예약 내역 조회는 관리자만 가능 (service_role 키 사용)
CREATE POLICY "select_service_role"
  ON reservation_requests FOR SELECT
  TO service_role
  USING (true);

-- 예약 수정·삭제는 관리자만 가능
CREATE POLICY "update_service_role"
  ON reservation_requests FOR UPDATE
  TO service_role
  USING (true) WITH CHECK (true);


-- 6. AI 알림장 테이블
CREATE TABLE IF NOT EXISTS ai_reports (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id  UUID REFERENCES reservation_requests(id) ON DELETE CASCADE NOT NULL,
  report_date     DATE NOT NULL DEFAULT CURRENT_DATE,

  -- 일일 기록 입력값
  meal_am         TEXT,           -- 아침 식사
  meal_pm         TEXT,           -- 점심 식사
  meal_evening    TEXT,           -- 저녁 식사
  meal_notes      TEXT,           -- 식사 메모
  bathroom_count  INTEGER DEFAULT 0,
  activity_level  TEXT DEFAULT 'normal',  -- low / normal / high
  mood            TEXT DEFAULT 'good',    -- great / good / neutral / tired / anxious
  temp_celsius    NUMERIC(4,1),   -- 실내 온도
  humidity_pct    INTEGER,        -- 실내 습도
  staff_notes     TEXT,           -- 직원 특이사항

  -- 생성된 리포트
  report_content  TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (reservation_id, report_date)
);

ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_reports_admin" ON ai_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ai_reports_reservation ON ai_reports(reservation_id);
CREATE INDEX IF NOT EXISTS idx_ai_reports_date        ON ai_reports(report_date DESC);


-- 7. 예약 신청 RPC 함수 (SECURITY DEFINER — anon 키로 호출 가능)
-- anon이 테이블에 직접 INSERT하는 대신 이 함수를 통해 저장
CREATE OR REPLACE FUNCTION public.submit_reservation_request(
  p_owner_name        text,
  p_owner_phone       text,
  p_owner_email       text,
  p_owner_address     text,
  p_owner_emergency   text,
  p_pet_name          text,
  p_pet_type          text,
  p_pet_breed         text,
  p_pet_age           text,
  p_pet_gender        text,
  p_pet_neutered      text,
  p_pet_weight        text,
  p_pet_reg_no        text,
  p_pet_vaccinated    text,
  p_pet_bite          text,
  p_pet_anxiety       text,
  p_pet_allergy       text,
  p_pet_medications   text,
  p_pet_notes         text,
  p_checkin_date      date,
  p_checkout_date     date,
  p_room_type         text,
  p_pickup_service    text,
  p_hiorder_requested boolean,
  p_requests          text,
  p_consent_privacy   boolean,
  p_consent_cctv      boolean,
  p_consent_ai        boolean,
  p_consent_marketing boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- 필수값 검증
  IF p_owner_name IS NULL OR p_owner_phone IS NULL
     OR p_pet_name IS NULL OR p_pet_type IS NULL
     OR p_checkin_date IS NULL OR p_checkout_date IS NULL THEN
    RAISE EXCEPTION '필수 항목이 누락되었습니다';
  END IF;

  -- 필수 동의 검증
  IF NOT COALESCE(p_consent_privacy, false) OR NOT COALESCE(p_consent_cctv, false) THEN
    RAISE EXCEPTION '필수 동의 항목이 필요합니다';
  END IF;

  INSERT INTO reservation_requests (
    owner_name, owner_phone, owner_email, owner_address, owner_emergency,
    pet_name, pet_type, pet_breed, pet_age, pet_gender, pet_neutered,
    pet_weight, pet_reg_no, pet_vaccinated, pet_bite, pet_anxiety,
    pet_allergy, pet_medications, pet_notes,
    checkin_date, checkout_date, room_type, pickup_service,
    hiorder_requested, requests,
    consent_privacy, consent_cctv, consent_ai, consent_marketing,
    status
  ) VALUES (
    p_owner_name, p_owner_phone, p_owner_email, p_owner_address, p_owner_emergency,
    p_pet_name, p_pet_type, p_pet_breed, p_pet_age, p_pet_gender, p_pet_neutered,
    p_pet_weight, p_pet_reg_no, p_pet_vaccinated, p_pet_bite, p_pet_anxiety,
    p_pet_allergy, p_pet_medications, p_pet_notes,
    p_checkin_date, p_checkout_date, p_room_type,
    COALESCE(p_pickup_service, 'basic'),
    COALESCE(p_hiorder_requested, false), p_requests,
    COALESCE(p_consent_privacy, false), COALESCE(p_consent_cctv, false),
    COALESCE(p_consent_ai, false), COALESCE(p_consent_marketing, false),
    'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- anon, authenticated 모두 이 함수 호출 가능
GRANT EXECUTE ON FUNCTION public.submit_reservation_request TO anon, authenticated;


-- 5. 인덱스 (빠른 조회)
CREATE INDEX IF NOT EXISTS idx_reservations_status      ON reservation_requests(status);
CREATE INDEX IF NOT EXISTS idx_reservations_checkin     ON reservation_requests(checkin_date);
CREATE INDEX IF NOT EXISTS idx_reservations_owner_phone ON reservation_requests(owner_phone);
CREATE INDEX IF NOT EXISTS idx_reservations_created_at  ON reservation_requests(created_at DESC);
