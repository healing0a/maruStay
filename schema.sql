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
  ('소형견룸',       'small',  '말티푸·푸들·비숑·포메라니안 등 소형견 전용', 30000, '10kg 이하',  'available'),
  ('중형견룸',       'medium', '코카·시바·웰시코기 등 중형견 전용',         35000, '10~25kg',   'available'),
  ('애묘룸',         'cat',    '고양이 전용 독립룸 — 캣타워·숨숨집 완비',   30000, '제한없음',   'available'),
  ('오션뷰 힐링룸',  'ocean',  '전망 좋은 프리미엄 단독룸',                50000, '25kg 이하',  'available')
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

-- 예약 신청은 누구나 가능 (비로그인 포함)
CREATE POLICY "reservations_insert_public"
  ON reservation_requests FOR INSERT
  WITH CHECK (true);

-- 예약 내역 조회는 관리자만 가능 (service_role 키 사용)
CREATE POLICY "reservations_select_admin"
  ON reservation_requests FOR SELECT
  USING (auth.role() = 'service_role');

-- 예약 수정·삭제는 관리자만 가능
CREATE POLICY "reservations_update_admin"
  ON reservation_requests FOR UPDATE
  USING (auth.role() = 'service_role');


-- 5. 인덱스 (빠른 조회)
CREATE INDEX IF NOT EXISTS idx_reservations_status      ON reservation_requests(status);
CREATE INDEX IF NOT EXISTS idx_reservations_checkin     ON reservation_requests(checkin_date);
CREATE INDEX IF NOT EXISTS idx_reservations_owner_phone ON reservation_requests(owner_phone);
CREATE INDEX IF NOT EXISTS idx_reservations_created_at  ON reservation_requests(created_at DESC);
