-- 동물 3종. 소개 문구(description)는 기획에서 정한 뒤 채운다.
-- 아이템은 획득 방식(D9) 결정 후에 추가한다.
insert into public.species (id, name, persona_key, description) values
  ('rubber_duck', '러버덕', 'rubber_duck', ''),
  ('raccoon', '너구리', 'raccoon', ''),
  ('cat', '고양이', 'cat', '');
