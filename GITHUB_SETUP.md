# GitHub 업로드 가이드

## 실행 필수 파일
- index.html
- css/style.css
- js/app.js
- data/news.json
- data/level_explanations.json
- data/news_preview_concise.json, data/news_preview_with_summaries.json
- js/supabase-config.js  ※ 로컬에서만 존재, 실제 키 포함

## 보안
- `.env` 파일은 .gitignore에 의해 제외됩니다. 실제 키는 환경변수로 관리하세요.
- `js/supabase-config.js`는 Publishable Anon Key를 포함합니다. Git에 올리지 말고 로컬에서만 사용하세요.
- 대체로 `js/supabase-config.example.js`를 Git에 포함합니다.

## Supabase 모드 사용
1. `js/supabase-config.example.js`를 복사해 `js/supabase-config.js`를 생성
2. Supabase 프로젝트의 URL과 anon key를 입력
3. 브라우저 URL에 `?source=supabase` 추가

## GitHub에 포함 금지
- .env, .env.*, api_keys.json, secrets.json
- js/supabase-config.js
- data/admin_reviews/*, backup/*, reports/*, tmp_reviews/*
- test_*.py, check_*.py, fix_*.py, update_*.py 등 일회성 스크립트

## 데이터
- 기본 모드는 `data/news.json`을 사용합니다.
- `data/level_explanations.json`은 필수입니다.
