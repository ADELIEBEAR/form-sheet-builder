# 폼메이커

폼을 만들고 응답을 Supabase와 Google Sheets에 저장하는 React 기반 폼 제작기입니다.

## 주요 기능

- Google 로그인
- 폼 생성, 복제, 수정, 삭제 및 공개 링크
- 단답형, 장문형, 이메일, 전화번호, 숫자, 날짜, 단일·다중 선택, 안내 문구
- Supabase Postgres 응답 저장과 RLS 접근 제어
- Google Sheets 생성·연결 및 로그인 상태의 자동 동기화
- 브라우저 WebP 압축 후 Supabase Storage 업로드
- 응답 표, CSV 다운로드, 실패한 시트 전송 재시도

## 이미지 비용 방지 구조

이미지는 `forms` JSON 안에 base64로 넣지 않습니다. 브라우저에서 WebP로 압축한 뒤 `form-builder-assets` Storage 버킷에 저장하고 DB에는 URL만 기록합니다. DB 제약 조건도 `data:image/...` 형식의 인라인 이미지 저장을 거부합니다.

기존 `forms`, `responses`, `google_tokens` 데이터는 유지하며 새 앱은 다음 전용 표를 사용합니다.

- `form_builder_forms`
- `form_builder_responses`

## 로컬 실행

```bash
npm install
npm run dev
```

기본 연결 대상은 기존 `form-builder` Supabase 프로젝트입니다. 다른 프로젝트를 쓰려면 환경 변수를 설정합니다.

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

## Supabase 구성

적용된 SQL은 `supabase/migrations/20260803190000_create_form_builder_v2.sql`에 있습니다. Google Sheets 동기화 함수는 `supabase/functions/form-builder-sheet-sync/index.ts`입니다.

Edge Function은 로그인한 폼 소유자만 실행할 수 있습니다. 공개 응답은 즉시 DB에 저장되고, 폼 소유자가 대시보드를 열면 대기 중인 응답이 Google Sheet로 자동 전송됩니다.

## Vercel 배포

1. Vercel에서 이 GitHub 저장소를 가져옵니다.
2. Framework Preset은 `Vite`, Build Command는 `npm run build`, Output Directory는 `dist`를 사용합니다.
3. 배포 주소를 Supabase Dashboard의 Authentication → URL Configuration → Redirect URLs에 추가합니다.
4. Google Cloud OAuth 설정에도 Supabase 프로젝트의 Google callback URL을 유지합니다.

`vercel.json`에 SPA 새로고침용 rewrite가 포함되어 있습니다.

## 검사

```bash
npm run check
```

프로덕션 빌드와 폼 데이터 검증 테스트를 실행합니다.
