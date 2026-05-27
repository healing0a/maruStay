/**
 * MaruStay — 이메일 알림 발송 (Resend)
 * POST /api/send-email
 * body: { type, data }
 *
 * type:
 *   'reservation_new'       — 예약 신청 완료 (손님 + 관리자)
 *   'reservation_confirmed' — 예약 확정 (손님)
 *   'report_ready'          — 알림장 도착 (손님)
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL   = process.env.ADMIN_EMAIL   || '';
const FROM_EMAIL    = process.env.FROM_EMAIL    || 'MaruStay <onboarding@resend.dev>';
const SITE_URL      = 'https://maru-stay.vercel.app';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  if (!RESEND_API_KEY) {
    console.error('[send-email] RESEND_API_KEY 미설정');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  const { type, data } = req.body || {};
  if (!type || !data) return res.status(400).json({ error: 'Missing type or data' });

  const emails = [];

  if (type === 'reservation_new') {
    // 손님에게
    if (data.ownerEmail) {
      emails.push({
        from:    FROM_EMAIL,
        to:      [data.ownerEmail],
        subject: `🐾 ${data.petName}의 마루스테이 예약 신청이 완료됐어요`,
        html:    tmplReservationNew(data),
      });
    }
    // 관리자에게
    if (ADMIN_EMAIL) {
      emails.push({
        from:    FROM_EMAIL,
        to:      [ADMIN_EMAIL],
        subject: `🔔 새 예약 신청 — ${data.ownerName} / ${data.petName}`,
        html:    tmplAdminNew(data),
      });
    }
  } else if (type === 'reservation_confirmed') {
    if (data.ownerEmail) {
      emails.push({
        from:    FROM_EMAIL,
        to:      [data.ownerEmail],
        subject: `✅ ${data.petName}의 마루스테이 예약이 확정됐어요!`,
        html:    tmplConfirmed(data),
      });
    }
  } else if (type === 'report_ready') {
    if (data.ownerEmail) {
      emails.push({
        from:    FROM_EMAIL,
        to:      [data.ownerEmail],
        subject: `📋 ${data.petName}의 오늘 하루 알림장이 도착했어요`,
        html:    tmplReport(data),
      });
    }
  } else {
    return res.status(400).json({ error: 'Unknown type' });
  }

  if (emails.length === 0) return res.status(200).json({ skipped: true });

  // 순차 발송
  const results = [];
  for (const email of emails) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(email),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.message || 'Resend error');
      results.push({ to: email.to[0], id: json.id });
    } catch (err) {
      console.error('[send-email] 오류:', err.message);
      results.push({ to: email.to[0], error: err.message });
    }
  }

  return res.status(200).json({ results });
};

// =====================================================
// HTML 이메일 템플릿
// =====================================================

function layout(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:'Apple SD Gothic Neo',AppleGothic,'Noto Sans KR',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:540px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
        <!-- Header -->
        <tr>
          <td style="background:#3d1e08;padding:28px 32px;text-align:center">
            <div style="font-size:26px;font-weight:800;color:#fff">🐾 MaruStay</div>
            <div style="font-size:12px;color:rgba(255,255,255,.55);margin-top:4px">반려동물 프리미엄 호텔</div>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:28px 32px">${bodyHtml}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f5f0eb;padding:18px 32px;text-align:center">
            <p style="margin:0;font-size:12px;color:#9e9e9e">
              문의: <a href="${SITE_URL}" style="color:#c87c3a;text-decoration:none">maru-stay.vercel.app</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function infoBox(rows) {
  const rowsHtml = rows.map(([k, v]) => `
    <tr>
      <td style="padding:9px 14px;font-size:13px;color:#7a4520;font-weight:700;white-space:nowrap;background:#fff8ec;border-bottom:1px solid #f5e8d2">${k}</td>
      <td style="padding:9px 14px;font-size:13px;color:#3a2010;border-bottom:1px solid #f5e8d2">${v}</td>
    </tr>`).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1.5px solid #f5e8d2;margin:18px 0">${rowsHtml}</table>`;
}

function btn(url, text) {
  return `<div style="text-align:center;margin-top:22px">
    <a href="${url}" style="display:inline-block;background:#3d1e08;color:#fff;text-decoration:none;
       font-size:14px;font-weight:700;padding:13px 32px;border-radius:50px">
      ${text}
    </a>
  </div>`;
}

function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

const ROOM_MAP = { small:'소형견룸', medium:'중형견룸', cat:'애묘룸', ocean:'오션뷰 힐링룸' };

// ── 예약 신청 완료 (손님) ──────────────────────────────
function tmplReservationNew(d) {
  const room = ROOM_MAP[d.roomType] || d.roomType || '-';
  return layout('예약 신청 완료', `
    <h2 style="font-size:20px;font-weight:800;color:#3a2010;margin:0 0 8px">예약 신청이 완료됐어요 🎉</h2>
    <p style="font-size:14px;color:#7a4520;line-height:1.8;margin:0 0 4px">
      안녕하세요 <strong>${d.ownerName}</strong>님,<br>
      <strong>${d.petName}</strong>의 예약 신청이 정상 접수됐어요.<br>
      <strong>24시간 내</strong>에 확인 후 연락드릴게요.
    </p>
    ${infoBox([
      ['반려동물', d.petName],
      ['체크인',   fmtDate(d.checkinDate)],
      ['체크아웃', fmtDate(d.checkoutDate)],
      ['객실',     room],
    ])}
    <p style="font-size:13px;color:#9e9e9e;margin:16px 0 0;text-align:center">
      궁금한 점이 있으시면 언제든 연락주세요 🐾
    </p>
    ${btn(SITE_URL, '마루스테이 바로가기')}
  `);
}

// ── 새 예약 알림 (관리자) ─────────────────────────────
function tmplAdminNew(d) {
  const room = ROOM_MAP[d.roomType] || d.roomType || '-';
  return layout('새 예약 신청', `
    <h2 style="font-size:18px;font-weight:800;color:#3a2010;margin:0 0 8px">🔔 새 예약 신청이 들어왔어요</h2>
    ${infoBox([
      ['보호자',   d.ownerName],
      ['연락처',   d.ownerPhone || '-'],
      ['반려동물', d.petName + (d.petBreed ? ' · ' + d.petBreed : '')],
      ['체크인',   fmtDate(d.checkinDate)],
      ['체크아웃', fmtDate(d.checkoutDate)],
      ['객실',     room],
    ])}
    ${btn(`${SITE_URL}/admin.html`, '관리자 페이지에서 확인하기')}
  `);
}

// ── 예약 확정 (손님) ──────────────────────────────────
function tmplConfirmed(d) {
  const room = ROOM_MAP[d.roomType] || d.roomType || '-';
  return layout('예약 확정', `
    <h2 style="font-size:20px;font-weight:800;color:#3a2010;margin:0 0 8px">예약이 확정됐어요! ✅</h2>
    <p style="font-size:14px;color:#7a4520;line-height:1.8;margin:0 0 4px">
      안녕하세요 <strong>${d.ownerName}</strong>님,<br>
      <strong>${d.petName}</strong>의 마루스테이 예약이 확정됐어요.<br>
      체크인 날 뵙겠습니다 🐾
    </p>
    ${infoBox([
      ['반려동물', d.petName],
      ['체크인',   fmtDate(d.checkinDate)],
      ['체크아웃', fmtDate(d.checkoutDate)],
      ['객실',     room],
    ])}
    <div style="background:#fff8ec;border-radius:12px;padding:14px 16px;margin-top:16px">
      <p style="margin:0;font-size:13px;color:#7a4520;line-height:1.8">
        📌 <strong>체크인 안내</strong><br>
        체크인 당일 예약 시간에 맞춰 방문해주세요.<br>
        입실 전 건강 이상이 있을 경우 미리 연락 부탁드려요.
      </p>
    </div>
    ${btn(`${SITE_URL}/mypage.html`, '내 예약 확인하기')}
  `);
}

// ── 알림장 도착 (손님) ────────────────────────────────
function tmplReport(d) {
  return layout('알림장 도착', `
    <h2 style="font-size:20px;font-weight:800;color:#3a2010;margin:0 0 8px">
      📋 ${d.petName}의 오늘 하루 알림장이 도착했어요
    </h2>
    <p style="font-size:14px;color:#7a4520;line-height:1.8;margin:0 0 16px">
      안녕하세요 <strong>${d.ownerName}</strong>님,<br>
      오늘 <strong>${d.petName}</strong>의 하루 소식을 전해드려요 🐾
    </p>
    <div style="background:#fff8ec;border:1.5px solid #f5e8d2;border-radius:14px;
                padding:18px 20px;font-size:14px;color:#3a2010;line-height:1.85;
                white-space:pre-wrap">${(d.reportContent || '').replace(/</g,'&lt;')}</div>
    ${btn(d.reportLink || SITE_URL + '/mypage.html', '전체 알림장 보기')}
    <p style="font-size:13px;color:#9e9e9e;text-align:center;margin-top:18px">
      보고 싶으시죠? 마루스테이에서 잘 지내고 있어요 💛
    </p>
  `);
}
