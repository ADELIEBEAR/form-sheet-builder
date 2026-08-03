# 폼메이커

폼을 제작하고 제출 응답을 Cloudflare D1과 Google Sheets에 함께 저장하는 풀스택 폼 제작기입니다. 기존 Supabase 프로젝트와 완전히 분리되어 있으며 Cloudflare 무료 한도를 우선 사용합니다.

## 포함된 기능

- Google 로그인
- 폼 생성, 복제, 수정, 삭제
- 단답형, 장문형, 이메일, 전화번호, 숫자, 날짜, 단일 선택, 다중 선택, 안내 문구
- 필수 응답 및 질문 순서 변경
- 공개 링크와 미리보기
- D1 응답 저장
- Google Sheet 새 문서 생성 또는 기존 문서 연결
- 제출 즉시 Sheet 행 추가, 실패한 응답 재전송
- R2 이미지 업로드, 브라우저 WebP 압축
- 응답 목록과 CSV 다운로드
- 선택형 Cloudflare Turnstile 검증
- 모바일 공개 폼

## 로컬 실행

```bash
npm install
copy .dev.vars.example .dev.vars
npm run db:local
npm run dev
```

`npm run dev`는 프런트엔드를 빌드하고 Cloudflare 로컬 런타임을 `http://localhost:8787`에서 시작합니다.

## Cloudflare 준비

```bash
npx wrangler login
npx wrangler d1 create form-sheet-builder-db
npx wrangler r2 bucket create form-sheet-builder-images
```

출력된 D1 ID를 `wrangler.jsonc`의 `database_id`에 넣고 다음 명령을 실행합니다.

```bash
npm run db:remote
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put TOKEN_ENCRYPTION_KEY
npx wrangler secret put SESSION_SECRET
npm run deploy
```

암호화 키는 아래처럼 만들 수 있습니다.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Google Cloud 설정

1. Google Cloud Console에서 새 프로젝트를 만듭니다.
2. Google Sheets API를 활성화합니다.
3. OAuth 동의 화면을 설정합니다.
4. 웹 애플리케이션 OAuth 클라이언트를 만듭니다.
5. 승인된 리디렉션 URI에 `https://배포주소/oauth/google/callback`을 추가합니다.
6. Client ID를 `wrangler.jsonc`의 `GOOGLE_CLIENT_ID`에 넣습니다.
7. Client Secret은 `wrangler secret put GOOGLE_CLIENT_SECRET`으로 저장합니다.

Google 검수 전에는 OAuth 테스트 사용자에 실제 관리자 계정을 추가해야 합니다.

## 보안 메모

- Google refresh token은 AES-GCM으로 암호화해 D1에 저장합니다.
- 세션 쿠키는 HttpOnly, Secure, SameSite=Lax로 발급됩니다.
- 이미지 업로드는 로그인 사용자만 가능하며 5MB로 제한됩니다.
- 공개 제출 API에는 기본 속도 제한과 선택형 Turnstile 검증이 포함됩니다.
- `ADMIN_EMAILS`를 설정하면 해당 이메일만 로그인할 수 있습니다.
- 비밀키와 `.dev.vars`는 GitHub에 올리지 않습니다.

## 데이터 흐름

1. 방문자가 공개 폼을 제출합니다.
2. Worker가 답변을 검증하고 D1에 먼저 저장합니다.
3. Google Sheet가 연결돼 있으면 같은 응답을 행으로 추가합니다.
4. Sheet 오류가 발생해도 D1 응답은 보존되고 관리자 화면에서 재전송할 수 있습니다.
