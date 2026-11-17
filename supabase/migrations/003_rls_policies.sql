-- 003_rls_policies.sql
-- RLS 활성화 및 정책 정의
-- 실행 순서: 3

alter table public.articles enable row level security;
alter table public.ai_summaries enable row level security;
alter table public.teacher_materials enable row level security;

-- profiles 정책
drop policy if exists "users can view own profile" on public.profiles;
create policy "users can view own profile"
on public.profiles for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "service can manage profiles" on public.profiles;
create policy "service can manage profiles"
on public.profiles for all
to service_role
using (true)
with check (true);

-- articles 정책
drop policy if exists "public can read real articles" on public.articles;
create policy "public can read real articles"
on public.articles for select
to anon, authenticated
using (is_real = true);

drop policy if exists "service can manage articles" on public.articles;
create policy "service can manage articles"
on public.articles for all
to service_role
using (true)
with check (true);

-- ai_summaries 정책
drop policy if exists "public can read reviewed summaries" on public.ai_summaries;
create policy "public can read reviewed summaries"
on public.ai_summaries for select
to anon, authenticated
using (summary_status = 'reviewed');

drop policy if exists "admin can read all summaries" on public.ai_summaries;
create policy "admin can read all summaries"
on public.ai_summaries for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
    and p.role = 'admin'
  )
);

drop policy if exists "admin can insert summaries" on public.ai_summaries;
create policy "admin can insert summaries"
on public.ai_summaries for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
    and p.role = 'admin'
  )
);

drop policy if exists "admin can update summaries" on public.ai_summaries;
create policy "admin can update summaries"
on public.ai_summaries for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
    and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
    and p.role = 'admin'
  )
);

drop policy if exists "service can manage summaries" on public.ai_summaries;
create policy "service can manage summaries"
on public.ai_summaries for all
to service_role
using (true)
with check (true);

-- teacher_materials 정책
drop policy if exists "admin can read materials" on public.teacher_materials;
create policy "admin can read materials"
on public.teacher_materials for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
    and p.role = 'admin'
  )
);

drop policy if exists "admin can insert materials" on public.teacher_materials;
create policy "admin can insert materials"
on public.teacher_materials for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
    and p.role = 'admin'
  )
);

drop policy if exists "admin can update materials" on public.teacher_materials;
create policy "admin can update materials"
on public.teacher_materials for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
    and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
    and p.role = 'admin'
  )
);

drop policy if exists "admin can delete materials" on public.teacher_materials;
create policy "admin can delete materials"
on public.teacher_materials for delete
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
    and p.role = 'admin'
  )
);

drop policy if exists "service can manage materials" on public.teacher_materials;
create policy "service can manage materials"
on public.teacher_materials for all
to service_role
using (true)
with check (true);
