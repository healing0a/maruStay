// =====================================================
// 카카오 로그인 & 세션 관리
// =====================================================
const KAKAO_REST_KEY = '45dac14c88de4ae0053c25da92fe425f';

/** 카카오 OAuth 시작 — 인증 페이지로 이동 */
function startKakaoLogin() {
  const redirectUri = encodeURIComponent(`${location.origin}/api/auth-kakao`);
  const scope       = encodeURIComponent('profile_nickname,profile_image');
  location.href =
    `https://kauth.kakao.com/oauth/authorize` +
    `?client_id=${KAKAO_REST_KEY}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` +
    `&scope=${scope}`;
}

/** 로그아웃 */
function kakaoLogout() {
  localStorage.removeItem('marustay_user');
  updateNavUser(null);
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

/** 환영 토스트 */
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

/** 페이지 로드 시 세션 복원 & 콜백 처리 */
(function initKakaoSession() {
  const hash = location.hash;

  if (hash.startsWith('#k=')) {
    // 로그인 콜백 — hash에서 사용자 정보 파싱
    try {
      const encoded = decodeURIComponent(hash.slice(3));
      const user    = JSON.parse(atob(encoded));
      localStorage.setItem('marustay_user', JSON.stringify(user));
      history.replaceState(null, '', location.pathname + location.search);
      updateNavUser(user);
      showKakaoToast(`🐾 ${user.nickname}님, 환영해요!`);
    } catch (e) {
      console.error('[Kakao] 콜백 파싱 오류:', e);
    }
  } else {
    // 기존 세션 복원
    const stored = localStorage.getItem('marustay_user');
    if (stored) {
      try { updateNavUser(JSON.parse(stored)); } catch (e) {}
    }
  }

  // 로그인 취소/오류 안내
  const params = new URLSearchParams(location.search);
  if (params.get('kakao') === 'cancelled') {
    history.replaceState(null, '', location.pathname);
    showKakaoToast('카카오 로그인이 취소되었어요.');
  } else if (params.get('kakao') === 'error') {
    history.replaceState(null, '', location.pathname);
    showKakaoToast('⚠ 로그인 중 오류가 발생했어요. 다시 시도해주세요.');
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
