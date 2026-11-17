-- 006_access_type.sql
-- 접근 유형 관리 추가
-- 실행 순서: 6

-- articles 테이블에 access_type 컬럼 추가
ALTER TABLE public.articles
ADD COLUMN IF NOT EXISTS access_type text
CONSTRAINT articles_access_type_check CHECK (access_type IN ('free','paid','unknown'));

-- 기존 데이터 기본값 unknown
UPDATE public.articles
SET access_type = 'unknown'
WHERE access_type IS NULL;

-- 기본값 설정
ALTER TABLE public.articles
ALTER COLUMN access_type SET DEFAULT 'unknown';

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_articles_access_type ON public.articles(access_type);

-- 공개 뉴스 뷰 재생성: access_type='free'만 공개
CREATE OR REPLACE VIEW public.public_news_view
WITH (security_invoker = true)
AS
SELECT
    a.id,
    a.external_id,
    a.url,
    a.title AS title_en,
    CASE
        WHEN s.summary_status = 'reviewed'
        THEN COALESCE(s.title_ko, a.title)
        ELSE a.title
    END AS title_display,
    a.source,
    a.published_at,
    a.collected_at,
    a.categories,
    a.levels,
    a.is_sample,
    a.is_real,
    a.summary_en,
    CASE
        WHEN s.summary_status = 'reviewed'
        THEN s.title_ko
        ELSE NULL
    END AS title_ko,
    CASE
        WHEN s.summary_status = 'reviewed'
        THEN s.summary_ko
        ELSE NULL
    END AS summary_ko,
    CASE
        WHEN s.summary_status = 'reviewed'
        THEN s.keywords
        ELSE NULL
    END AS keywords,
    CASE
        WHEN s.summary_status = 'reviewed'
        THEN s.concepts
        ELSE NULL
    END AS concepts,
    CASE
        WHEN s.summary_status = 'reviewed'
        THEN s.whyImportant
        ELSE NULL
    END AS whyimportant,
    CASE
        WHEN s.summary_status = 'reviewed'
        THEN 'reviewed'
        ELSE NULL
    END AS summary_status,
    a.access_type
FROM public.articles AS a
LEFT JOIN public.ai_summaries AS s
    ON s.article_id = a.id
    AND s.summary_status = 'reviewed'
WHERE a.is_real = true
  AND a.access_type = 'free';

-- 익명/인증 사용자 SELECT 정책: public_news_view는 이미 뷰 필터 적용
-- articles 직접 SELECT도 free만 허용하도록 RLS 정책 강화
DROP POLICY IF EXISTS "anon_select_articles_free" ON public.articles;
CREATE POLICY "anon_select_articles_free"
ON public.articles FOR SELECT
TO anon
USING (is_real = true AND access_type = 'free');

DROP POLICY IF EXISTS "auth_select_articles_free" ON public.articles;
CREATE POLICY "auth_select_articles_free"
ON public.articles FOR SELECT
TO authenticated
USING (is_real = true AND access_type = 'free');

-- service_role은 모든 접근 허용 유지
-- 기존 권한 유지
GRANT SELECT ON public.public_news_view TO anon, authenticated;
