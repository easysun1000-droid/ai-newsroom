-- 002_tables.sql
-- articles, ai_summaries, teacher_materials 테이블 생성
-- 실행 순서: 2

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  url text unique not null,
  title text not null,
  summary_en text[],
  source text,
  published_at timestamptz,
  collected_at timestamptz default now(),
  is_sample boolean default false,
  is_real boolean default true,
  categories text[],
  levels text[],
  keywords text[],
  whyImportant text,
  concepts jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.ai_summaries (
  article_id uuid primary key references public.articles(id) on delete cascade,
  title_ko text,
  summary_ko text[],
  keywords text[],
  concepts jsonb,
  whyImportant text,
  summary_status text not null default 'generated' check (summary_status in ('generated','reviewed','rejected')),
  summary_generated_at timestamptz,
  summary_model text,
  summary_locked boolean default false,
  review_notes text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  updated_at timestamptz default now()
);

create table if not exists public.teacher_materials (
  article_id uuid primary key references public.articles(id) on delete cascade,
  explanations jsonb,
  class_core_question text,
  discussion_question text,
  activity_idea text,
  updated_at timestamptz default now()
);

-- 트리거
drop trigger if exists trg_articles_updated on public.articles;
create trigger trg_articles_updated
before update on public.articles
for each row execute function public.set_updated_at();

drop trigger if exists trg_ai_summaries_updated on public.ai_summaries;
create trigger trg_ai_summaries_updated
before update on public.ai_summaries
for each row execute function public.set_updated_at();

drop trigger if exists trg_teacher_materials_updated on public.teacher_materials;
create trigger trg_teacher_materials_updated
before update on public.teacher_materials
for each row execute function public.set_updated_at();

-- 인덱스
create index if not exists idx_articles_external_id on public.articles(external_id);
create index if not exists idx_articles_url on public.articles(url);
create index if not exists idx_articles_published_at on public.articles(published_at desc);
create index if not exists idx_ai_summaries_status on public.ai_summaries(summary_status);
create index if not exists idx_ai_summaries_locked on public.ai_summaries(summary_locked);

-- summary_locked 보호 함수
create or replace function public.prevent_locked_overwrite()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.summary_locked is true then
    if new.summary_locked is distinct from true then
      raise exception 'Locked summary cannot be unlocked directly';
    end if;
    if (
      old.title_ko,
      old.summary_ko,
      old.keywords,
      old.concepts,
      old.whyimportant
    ) is distinct from (
      new.title_ko,
      new.summary_ko,
      new.keywords,
      new.concepts,
      new.whyimportant
    ) then
      raise exception 'Locked summary content cannot be overwritten';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ai_summaries_locked_protect on public.ai_summaries;
create trigger trg_ai_summaries_locked_protect
before update on public.ai_summaries
for each row
execute function public.prevent_locked_overwrite();
