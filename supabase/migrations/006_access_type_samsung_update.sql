-- 삼성 기사 접근 유형 변경: 삭제 없이 paid로 전환
-- 실행 전 주의: production DB에서 실행 시 백업 필수
UPDATE public.articles
SET access_type = 'paid'
WHERE external_id = 'rss-506646dbe5';

-- 변경 확인
SELECT id, external_id, url, access_type
FROM public.articles
WHERE external_id = 'rss-506646dbe5';
