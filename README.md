# 폼메이커

기존 폼빌더와 분리된 새 폼 제작기입니다. 현재 개발은 `form-maker-next` 브랜치에서 진행하며 운영용 `main`과 `form-sheet-builder.vercel.app`은 변경하지 않습니다.

## 새 제품의 흐름

1. 여러 페이지와 질문을 구성합니다.
2. 실제 응답 화면을 중앙 미리보기에서 확인합니다.
3. 폼을 게시하고 공개 링크를 공유합니다.
4. 응답은 Supabase에 먼저 저장됩니다.
5. 연결한 Google Sheet로 응답을 기록합니다.

## 기존 폼빌더와의 분리

새 폼메이커는 아래 전용 자원만 사용합니다.

- `form_maker_projects`
- `form_maker_submissions`
- `form_maker_google_tokens`
- `form-maker-assets` Storage 버킷
- `form-maker-sheet-sync` Edge Function

기존 `forms`, `responses`, `google_tokens`, `form_builder_*`, `form-builder-assets`에는 접근하지 않습니다.

## 실행

```bash
npm install
npm run dev
```

## 확인

```bash
npm test
npm run build
```

## 배포 원칙

- 운영 `main`은 새 제품 안정화 전까지 유지합니다.
- 새 제품은 `form-maker-next` 브랜치의 Vercel Preview에서만 확인합니다.
- 응답 제출, 권한, 이미지, Google Sheets, 모바일 검수가 끝난 뒤에만 운영 전환을 결정합니다.
