-- 동물 3종 기본 데이터
-- 모든 환경에 있어야 하는 기본 데이터는 seed가 아니라 마이그레이션으로 넣는다(CLAUDE.md Backend 섹션, docs/decisions/0002).
-- 원격 quack-dev에는 이전에 seed.sql로 같은 행이 들어가 있어서, 이미 있으면 건너뛴다.
-- 소개 문구(description)는 기획에서 정한 뒤 별도 마이그레이션으로 채운다.
insert into public.species (id, name, persona_key, description) values
  ('rubber_duck', '러버덕', 'rubber_duck', ''),
  ('raccoon', '너구리', 'raccoon', ''),
  ('cat', '고양이', 'cat', '')
on conflict (id) do nothing;
