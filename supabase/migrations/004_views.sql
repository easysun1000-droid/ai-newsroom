
-- 004_views.sql
-- AI 수업 뉴스룸 공개 뉴스 조회 뷰
-- 실행 순서: 4
-- 사전 조건: 001, 002, 003 적용 완료
-- articles.summary_en 컬럼이 존재해야 함

CREATE OR REPLACE VIEW public.public_news_view
WITH (security_invoker = true)
AS
SELECT
    -- 기본 뉴스 정보
    a.id,
    a.external_id,
    a.url,
    a.title AS title_en,

    -- 승인된 기사만 한국어 제목 표시
    CASE
        WHEN s.summary_status = 'reviewed'
            THEN COALESCE(s.title_ko, a.title)
        ELSE a.title
    END AS title_display,

    -- 기사 메타데이터
    a.source,
    a.published_at,
    a.collected_at,
    a.categories,
    a.levels,
    a.is_sample,
    a.is_real,

    -- 기존 영문 요약
    a.summary_en,

    -- 승인된 한국어 제목
    CASE
        WHEN s.summary_status = 'reviewed'
            THEN s.title_ko
        ELSE NULL
    END AS title_ko,

    -- 승인된 한국어 3줄 요약
    CASE
        WHEN s.summary_status = 'reviewed'
            THEN s.summary_ko
        ELSE NULL
    END AS summary_ko,

    -- 승인된 키워드
    CASE
        WHEN s.summary_status = 'reviewed'
            THEN s.keywords
        ELSE NULL
    END AS keywords,

    -- 승인된 AI 개념
    CASE
        WHEN s.summary_status = 'reviewed'
            THEN s.concepts
        ELSE NULL
    END AS concepts,

    -- 승인된 뉴스의 중요성
    CASE
        WHEN s.summary_status = 'reviewed'
            THEN s.whyimportant
        ELSE NULL
    END AS whyimportant,

    -- 공개 가능한 검수 상태만 표시
    CASE
        WHEN s.summary_status = 'reviewed'
            THEN 'reviewed'
        ELSE NULL
    END AS summary_status

FROM public.articles AS a

LEFT JOIN public.ai_summaries AS s
    ON s.article_id = a.id
    AND s.summary_status = 'reviewed'

WHERE a.is_real = true;

-- 공개 뷰 조회 권한
GRANT SELECT ON public.public_news_view
TO anon, authenticated;

-- security_invoker 뷰 조회에 필요한 기반 테이블 권한
GRANT SELECT ON public.articles
TO anon, authenticated;

GRANT SELECT ON public.ai_summaries
TO anon, authenticated;

-- 공개 사용자의 쓰기 권한 제한
REVOKE INSERT, UPDATE, DELETE
ON public.articles
FROM anon, authenticated;

REVOKE INSERT, UPDATE, DELETE
ON public.ai_summaries
FROM anon;

-- 관리자 전용 학습 자료는 일반 방문자 접근 차단
REVOKE ALL
ON public.teacher_materials
FROM anon;
