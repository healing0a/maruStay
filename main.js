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

// Booking form
document.getElementById('bookingForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.textContent = '✓ 예약 신청이 접수되었습니다!';
  btn.style.background = '#5aaa50';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = '예약 신청하기';
    btn.style.background = '';
    btn.disabled = false;
    e.target.reset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 4000);
});
