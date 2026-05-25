-- =====================================================
-- MaruStay — 내 예약 조회 RPC (v0.5)
-- Supabase SQL Editor에 붙여넣기 후 Run
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_my_reservations(p_phone TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      json_agg(
        json_build_object(
          'id',            id,
          'pet_name',      pet_name,
          'pet_breed',     pet_breed,
          'pet_type',      pet_type,
          'checkin_date',  checkin_date,
          'checkout_date', checkout_date,
          'room_type',     room_type,
          'status',        status,
          'created_at',    created_at
        ) ORDER BY created_at DESC
      ),
      '[]'::json
    )
    FROM reservation_requests
    WHERE owner_phone = p_phone
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_reservations TO anon, authenticated;
