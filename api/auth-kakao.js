/**
 * MaruStay — 카카오 OAuth 콜백 핸들러
 * GET /api/auth-kakao?code=...
 *
 * 흐름:
 *  1. 카카오 code → access_token 교환
 *  2. access_token → 사용자 정보 조회
 *  3. Supabase profiles 테이블 upsert (RPC)
 *  4. /#k=BASE64 로 리다이렉트 (클라이언트가 localStorage에 저장)
 */

const KAKAO_REST_API_KEY = '45dac14c88de4ae0053c25da92fe425f';
const SUPABASE_URL       = 'https://sjzxpqtkpaehazwtonge.supabase.co';
const SUPABASE_ANON_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhwcXRrcGFlaGF6d3RvbmdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MTYwMTMsImV4cCI6MjA5NTE5MjAxM30.M8CqLiIQeOSfoWh-rpQ-lkrnUEWhU9pS7v72vUZfxIs';

module.exports = async function handler(req, res) {
  const { code, error: kakaoError } = req.query;

  // 사용자가 카카오 로그인을 취소한 경우
  if (kakaoError || !code) {
    return res.redirect('/?kakao=cancelled');
  }

  // Redirect URI — 카카오 개발자 콘솔에 등록한 URI와 정확히 일치해야 함
  const proto       = req.headers['x-forwarded-proto'] || 'https';
  const host        = req.headers['x-forwarded-host']  || req.headers.host;
  const redirectUri = `${proto}://${host}/api/auth-kakao`;

  try {
    // ── 1. code → access_token ──────────────────────────────
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: new URLSearchParams({
        grant_type:   'authorization_code',
        client_id:    KAKAO_REST_API_KEY,
        redirect_uri: redirectUri,
        code,
      }),
    });
    const token = await tokenRes.json();

    if (!token.access_token) {
      console.error('[auth-kakao] 토큰 발급 오류:', token);
      return res.redirect('/?kakao=error');
    }

    // ── 2. access_token → 사용자 정보 ────────────────────────
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const user = await userRes.json();

    const kakaoId  = String(user.id);
    const nickname = user.kakao_account?.profile?.nickname
                  || user.properties?.nickname
                  || '회원';
    const avatar   = user.kakao_account?.profile?.thumbnail_image_url
                  || user.properties?.thumbnail_image
                  || null;
    const email    = user.kakao_account?.email || null;

    // ── 3. Supabase profiles upsert (RPC) ────────────────────
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/upsert_kakao_profile`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          p_kakao_id:   kakaoId,
          p_nickname:   nickname,
          p_email:      email,
          p_avatar_url: avatar,
        }),
      });
    } catch (supaErr) {
      // DB 저장 실패해도 로그인 자체는 허용 (MVP)
      console.error('[auth-kakao] Supabase upsert 오류:', supaErr);
    }

    // ── 4. 클라이언트로 사용자 정보 전달 (hash fragment) ─────
    // hash는 서버로 전송되지 않아 상대적으로 안전
    const payload = encodeURIComponent(
      Buffer.from(JSON.stringify({ kakaoId, nickname, avatar, email })).toString('base64')
    );
    return res.redirect(`/#k=${payload}`);

  } catch (err) {
    console.error('[auth-kakao] 처리 오류:', err);
    return res.redirect('/?kakao=error');
  }
};
