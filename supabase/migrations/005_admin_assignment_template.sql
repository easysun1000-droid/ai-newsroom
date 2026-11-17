-- 005_admin_assignment_template.sql
-- 관리자 권한 부여 템플릿
-- 자동 실행 금지, 수동으로 Supabase SQL Editor에서만 실행
-- 이메일이나 UUID를 코드에 고정하지 않음, 실행 시점에 관리자 UID를 직접 입력

-- 사용 방법:
-- 1. Supabase Auth 대시보드에서 관리자 계정 생성
-- 2. 해당 사용자의 user_id를 복사
-- 3. 아래 쿼리의 '<ADMIN_USER_ID>'를 실제 UUID로 교체 후 실행
-- 4. 실행 후 프로필 삭제 시 자동 cascade 됨

-- 예시
-- insert into public.profiles(user_id, role)
-- values ('<ADMIN_USER_ID>', 'admin')
-- on conflict (user_id) do update set role = 'admin';

-- 주의: profiles.role 변경은 service_role 키로만 수행하거나
-- 신뢰할 수 있는 관리자 작업으로 제한. 일반 사용자는 자신의 role을 변경할 수 없음.
