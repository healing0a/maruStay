# MaruStay Changelog

## v0.2.0 — 어드민 + AI 알림장

### 추가된 기능
- 어드민 페이지 (admin.html) — Supabase Auth 로그인, 예약 목록/상세, 상태 변경, 메모
- AI 알림장 (api/generate-report.js) — OpenAI GPT-4o-mini, 일일 기록 입력 → 알림장 자동 생성
- ai_reports 테이블 (Supabase) — 알림장 히스토리 저장

---

## v0.1.0 — MVP 홈페이지 초기 릴리즈

### 추가된 기능

#### 홈페이지 (index.html)
- Hero 섹션: "마루처럼 편히 쉬다 가세요." 메인 타이틀 + A Healing Stay for Your Dog
- 기존 애견호텔 vs MaruStay 비교 섹션
- 서비스 6종 소개 (단독룸·CCTV·AI리포트·IoT·픽드롭·하이오더)
- 객실 4종 (소형견룸·중형견룸·애묘룸·오션뷰 힐링룸) + 요금
- 요금표
- 픽드롭 서비스 안내 (보호자 직접 방문·하루 1회 기본 포함)
- 하이오더 서비스 6종 카드
- MaruCredit 소개 + 크레딧 카드 UI
- AI 알림장 리포트 미리보기
- 예약 신청 폼 (보호자·반려동물·이용 정보 전체 필드)
- FAQ 10개 항목 아코디언
- 카카오톡 문의 연결

#### 개인정보 처리방침 (privacy.html)
- 12개 항목 완성
- 반려동물 활동 데이터 AI 학습 활용 정책 명시
- CCTV 운영 관리 방침
- 개인정보 보호 책임자 안내

#### 예약 동의 항목
- [필수] 개인정보 수집·이용 동의
- [필수] CCTV 촬영 동의
- [선택] 반려동물 활동 데이터 AI 학습 활용 동의
- [선택] 마케팅 정보 수신 동의
- 전체 동의 체크박스 연동

#### Supabase 연동 (supabase-client.js)
- reservation_requests 테이블로 예약 폼 데이터 저장
- RLS 정책 적용 (익명 INSERT 허용, SELECT는 관리자만)
- 예약 성공/실패 UX 처리

#### DB 스키마 (schema.sql)
- rooms 테이블 + 기본 데이터 4종
- reservation_requests 테이블 (전체 예약 필드)
- RLS 정책 4개
- 성능 인덱스 4개

#### Supabase RPC 함수 (submit_reservation_request)
- SECURITY DEFINER 함수로 anon 키에서 안전하게 예약 INSERT 처리
- 필수값 및 필수 동의 항목 서버사이드 검증
- supabase-client.js: 직접 INSERT → RPC 호출 방식으로 변경

### 배포
- Vercel: https://maru-stay.vercel.app
- GitHub: https://github.com/healing0a/maruStay
