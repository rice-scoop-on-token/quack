-- service_role의 public 테이블 권한을 명시한다 (docs/decisions/0002 "service_role 권한")
--
-- 마이그레이션은 postgres 역할로 테이블을 만든다. 로컬은 이때 service_role에 모든 권한을 기본으로 주지만,
-- 원격 프로젝트의 기본 권한은 DELETE·TRUNCATE·REFERENCES·TRIGGER만 준다(2026-11-04 확인).
-- 그래서 원격의 서버 코드(adminDb)와 security invoker인 server 함수가 조회·추가·수정에서 42501로 실패했다.
-- 플랫폼 기본값에 기대지 않고, 로컬과 원격이 같도록 직접 준다.
--
-- service_role은 RLS를 우회하는 서버 전용 역할이다. 어디서 쓰는지는 코드 규칙(쓰는 곳에 이유 주석)으로 제한한다.
-- 앱 역할(anon, authenticated)의 권한은 바꾸지 않는다.

grant select, insert, update, delete on all tables in schema public to service_role;

-- 앞으로 postgres가 만드는 테이블에도 같은 권한을 준다. 테이블을 추가하는 마이그레이션마다 다시 적지 않아도 되게 하기 위해서다.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;
