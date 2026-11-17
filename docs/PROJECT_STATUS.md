# AI 뉴스룸 프로젝트 상태

## 1차 개발 목표
- JSON 기반 AI 뉴스룸 정상 작동
- GitHub 버전 관리 안정화
- 기본 데이터 소스: data/news.json 유지
- Supabase 연동은 2차 개발로 분리

## 2차 개발 목표
- Supabase 연동 및 뉴스 자동화
- RSS 수집, 자동 요약 파이프라인
- 관리자 검수 워크플로우 고도화

## 현재 구현된 기능
- 뉴스 목록 표시
- AI 한국어 요약 표시
- 학습 수준별 설명
- 검색 기능
- 카테고리 필터
- 페이지네이션 / 더 보기
- preview 모드: data/news_preview_with_summaries.json
- concise 모드: data/news_preview_concise.json
- 기본 JSON 모드: data/news.json
- Supabase 모드: ?source=supabase 시 동적 import로 설정 로드

## 확인된 오류와 미완성 기능
- Supabase 설정 파일이 없을 경우 기본 모드로 우회 동작하도록 js/app.js 수정 완료
- js/supabase-config.js는 .gitignore에 추가되어 Git에 포함되지 않음
- data/level_explanations.json, preview JSON 파일은 현재 Git 미추적 상태 → GitHub 업로드 시 포함 필요
- Supabase RLS 정책은 로컬 마이그레이션 파일 존재, 운영 적용 여부 미확인

## 다음 작업
- GitHub 저장 대상 파일 최종 확정 및 샘플 데이터 커밋
- 1차 안정화 테스트 완료 후 Supabase 연동 2차 개발 착수
