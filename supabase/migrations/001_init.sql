-- 001_init.sql
-- 초기 확장 및 프로필 테이블
-- 실행 순서: 1

create extension if not exists "pgcrypto";

-- 사용자 프로필 및 역할 관리
-- 역할 단순화: user, admin
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- updated_at 트리거 함수
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated on public.profiles;

create trigger trg_profiles_updated
before update on public.profiles
for each row execute function public.set_updated_at();

-- RLS 활성화
alter table public.profiles enable row level security;
