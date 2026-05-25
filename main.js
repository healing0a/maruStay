// =====================================================
// 카카오 로그인 & 세션 관리 (JS SDK 팝업 방식)
// =====================================================

/** 카카오 팝업 로그인 */
function startKakaoLogin() {
  if (!window.Kakao || !Kakao.isInitialized()) {
    showKakaoToast('⚠ 카카오 SDK 로딩 중이에요. 잠시 후 다시 시도해주세요.');
    return;
  }

  Kakao.Auth.login({
    scope: 'profile_nickname,profile_image',
    success: function() {
      // 로그인 성공 → 사용자 정보 조회
      Kakao.API.request({
        url: '/v2/user/me',
        success: async function(info) {
          const user = {
            kakaoId:  String(info.id),
            nickname: info.kakao_account?.profile?.nickname
                   || info.properties?.nickname
                   || '회원',
            avatar:   info.kakao_account?.profile?.thumbnail_image_url
                   || info.properties?.thumbnail_image
                   || null,
            email:    info.kakao_account?.email || null,
          };

          // 세션 저장
          localStorage.setItem('marustay_user', JSON.stringify(user));
          updateNavUser(user);
          showKakaoToast(`🐾 ${user.nickname}님, 환영해요!`);

          // Supabase 저장 (비동기 — 실패해도 로그인은 유지)
          try {
            await db.rpc('upsert_kakao_profile', {
              p_kakao_id:   user.kakaoId,
              p_nickname:   user.nickname,
              p_email:      user.email,
              p_avatar_url: user.avatar,
            });
          } catch (e) {
            console.warn('[Kakao] Supabase 저장 실패 (로그인은 정상):', e);
          }
        },
        fail: function(err) {
          console.error('[Kakao] 사용자 정보 조회 실패:', err);
          showKakaoToast('⚠ 사용자 정보를 가져오지 못했어요.');
        },
      });
    },
    fail: function(err) {
      console.error('[Kakao] 로그인 실패:', err);
      showKakaoToast('⚠ 로그인에 실패했어요. 다시 시도해주세요.');
    },
  });
}

/** 로그아웃 */
function kakaoLogout() {
  localStorage.removeItem('marustay_user');
  updateNavUser(null);
  if (window.Kakao?.Auth?.getAccessToken()) {
    Kakao.Auth.logout();
  }
  showKakaoToast('👋 로그아웃되었어요.');
}

/** Nav 사용자 UI 갱신 */
function updateNavUser(user) {
  const loginBtn = document.getElementById('navKakaoLogin');
  const userDiv  = document.getElementById('navUser');
  if (!loginBtn || !userDiv) return;

  if (user) {
    loginBtn.style.display = 'none';
    userDiv.style.display  = 'flex';
    const avatar   = document.getElementById('navAvatar');
    const nickname = document.getElementById('navNickname');
    if (avatar)   avatar.src          = user.avatar || 'images/maru.jpg';
    if (nickname) nickname.textContent = user.nickname || '회원';
  } else {
    loginBtn.style.display = '';
    userDiv.style.display  = 'none';
  }
}

/** 토스트 메시지 */
function showKakaoToast(msg) {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);' +
    'background:#4a3728;color:#fff;padding:14px 28px;border-radius:50px;' +
    'box-shadow:0 8px 32px rgba(0,0,0,.25);font-size:15px;font-weight:600;' +
    'z-index:9999;white-space:nowrap;animation:fadeUp .35s ease;';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/** 페이지 로드 시 SDK 초기화 + 세션 복원 */
(function initKakaoSession() {
  // Kakao SDK 초기화
  if (window.Kakao && !Kakao.isInitialized()) {
    Kakao.init('66570a122c6141cddd5048bc632d08f7');
    console.log('[Kakao] SDK 초기화 완료, 버전:', Kakao.VERSION);
  }

  // 기존 세션 복원
  const stored = localStorage.getItem('marustay_user');
  if (stored) {
    try { updateNavUser(JSON.parse(stored)); } catch (e) {}
  }
})();

// =====================================================
// Nav scroll
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

// Mobile nav
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');
navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

// Scroll reveal
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('visible'), i * 90);
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });
revealEls.forEach(el => io.observe(el));

// FAQ accordion
document.querySelectorAll('.faq__item').forEach(item => {
  item.querySelector('.faq__q').addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq__item.open').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

// Date inputs
const today = new Date().toISOString().split('T')[0];
const ci = document.getElementById('checkin');
const co = document.getElementById('checkout');
ci.min = today;
co.min = today;
ci.addEventListener('change', () => { co.min = ci.value; if (co.value && co.value < ci.value) co.value = ci.value; });

// 전체 동의 체크박스
const consentAll      = document.getElementById('consentAll');
const consentBoxes    = document.querySelectorAll('.consent-required, #consentAi, #consentMarketing');
const requiredBoxes   = document.querySelectorAll('.consent-required');

consentAll.addEventListener('change', () => {
  consentBoxes.forEach(cb => { cb.checked = consentAll.checked; });
});
consentBoxes.forEach(cb => {
  cb.addEventListener('change', () => {
    consentAll.checked = [...consentBoxes].every(c => c.checked);
  });
});

// Booking form — Supabase 저장
document.getElementById('bookingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn   = e.target.querySelector('button[type=submit]');
  const original = btn.textContent;

  // 로딩 상태
  btn.textContent = '⏳ 저장 중...';
  btn.disabled = true;

  try {
    const formData = collectFormData();

    // 필수 동의 확인
    if (!formData.consent_privacy || !formData.consent_cctv) {
      alert('필수 동의 항목을 확인해주세요.');
      btn.textContent = original;
      btn.disabled = false;
      return;
    }

    // Supabase 저장
    const result = await submitReservation(formData);

    // 성공
    btn.textContent = '✓ 예약 신청이 접수되었습니다!';
    btn.style.background = '#5aaa50';

    // 성공 메시지 표시
    showSuccessMessage(result.id);

    setTimeout(() => {
      btn.textContent = original;
      btn.style.background = '';
      btn.disabled = false;
      e.target.reset();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 5000);

  } catch (err) {
    console.error('예약 저장 오류:', err);
    btn.textContent = '⚠ 오류가 발생했습니다. 다시 시도해주세요.';
    btn.style.background = '#e74c3c';
    setTimeout(() => {
      btn.textContent = original;
      btn.style.background = '';
      btn.disabled = false;
    }, 3000);
  }
});

function showSuccessMessage(reservationId) {
  const existing = document.getElementById('successMsg');
  if (existing) existing.remove();

  const msg = document.createElement('div');
  msg.id = 'successMsg';
  msg.style.cssText = `
    position:fixed; bottom:32px; left:50%; transform:translateX(-50%);
    background:#4a3728; color:#fff; padding:18px 32px; border-radius:50px;
    box-shadow:0 8px 32px rgba(0,0,0,.25); font-size:15px; font-weight:600;
    z-index:999; animation:fadeUp .4s ease;
    display:flex; align-items:center; gap:10px;
  `;
  msg.innerHTML = `✓ 예약 신청 완료! 24시간 내 연락드릴게요.`;
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 5000);
}
