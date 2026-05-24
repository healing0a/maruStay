-- =====================================================
-- MaruStay v0.3 — 보호자 알림장 공유 RPC
-- Supabase SQL Editor에 붙여넣기 후 Run 클릭
-- =====================================================

-- 보호자에게 공유할 알림장 데이터를 반환하는 공개 RPC 함수
-- PII(보호자 개인정보) 없이 반려동물 정보 + 알림장 목록만 반환
CREATE OR REPLACE FUNCTION public.get_pet_reports(p_reservation_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pet_info     json;
  reports_data json;
BEGIN
  -- 반려동물 기본 정보 (PII 제외)
  SELECT json_build_object(
    'pet_name',      pet_name,
    'pet_breed',     pet_breed,
    'pet_gender',    pet_gender,
    'checkin_date',  checkin_date,
    'checkout_date', checkout_date
  )
  INTO pet_info
  FROM reservation_requests
  WHERE id = p_reservation_id;

  IF pet_info IS NULL THEN
    RETURN NULL;
  END IF;

  -- 알림장 목록 (report_content 있는 것만)
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'report_date',    report_date,
        'report_content', report_content,
        'mood',           mood,
        'activity_level', activity_level,
        'bathroom_count', bathroom_count,
        'meal_am',        meal_am,
        'meal_pm',        meal_pm,
        'meal_evening',   meal_evening
      ) ORDER BY report_date ASC
    ),
    '[]'::json
  )
  INTO reports_data
  FROM ai_reports
  WHERE reservation_id = p_reservation_id
    AND report_content IS NOT NULL;

  RETURN json_build_object(
    'pet',     pet_info,
    'reports', reports_data
  );
END;
$$;

-- anon(비로그인 보호자)도 호출 가능하게 권한 부여
GRANT EXECUTE ON FUNCTION public.get_pet_reports TO anon, authenticated;
