// =====================================================
// MaruStay — Supabase 연결 설정
// =====================================================

const SUPABASE_URL = 'https://sjzxpqtkpaehazwtonge.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhwcXRrcGFlaGF6d3RvbmdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MTYwMTMsImV4cCI6MjA5NTE5MjAxM30.M8CqLiIQeOSfoWh-rpQ-lkrnUEWhU9pS7v72vUZfxIs';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// =====================================================
// 예약 신청 저장
// =====================================================
async function submitReservation(formData) {
  const { data, error } = await db
    .from('reservation_requests')
    .insert([formData])
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// 예약 폼 데이터 수집
// =====================================================
function collectFormData() {
  const v = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };
  const radio = (name) => {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : '';
  };
  const bool = (id) => {
    const el = document.getElementById(id);
    return el ? el.checked : false;
  };

  return {
    // 보호자
    owner_name:       v('ownerName'),
    owner_phone:      v('ownerPhone'),
    owner_email:      v('ownerEmail'),
    owner_address:    v('ownerAddr'),
    owner_emergency:  v('ownerEmergency'),

    // 반려동물
    pet_name:         v('petName'),
    pet_type:         v('petType'),
    pet_breed:        v('petBreed'),
    pet_age:          v('petAge'),
    pet_gender:       v('petGender'),
    pet_neutered:     v('petNeuter'),
    pet_weight:       v('petWeight'),
    pet_reg_no:       v('petRegNo'),
    pet_vaccinated:   radio('vaccine'),
    pet_bite:         radio('bite'),
    pet_anxiety:      radio('anxiety'),
    pet_allergy:      v('petAllergy'),
    pet_medications:  v('petMeds'),
    pet_notes:        v('petNotes'),

    // 이용 정보
    checkin_date:     v('checkin'),
    checkout_date:    v('checkout'),
    room_type:        v('roomType'),
    pickup_service:   radio('pickup') || 'normal',
    hiorder_requested: radio('hiorder') === 'yes',
    requests:         v('requests'),

    // 동의
    consent_privacy:  bool('consentPrivacy'),
    consent_cctv:     bool('consentCctv'),
    consent_ai:       bool('consentAi'),
    consent_marketing:bool('consentMarketing'),

    status: 'pending'
  };
}
