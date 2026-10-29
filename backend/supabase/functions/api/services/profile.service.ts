import type { SupabaseClient } from '@supabase/supabase-js';

import { AppError, appErrorFromDb } from '../middleware/error.ts';

// service는 HTTP 객체(Context, Request)를 받지 않는다. 필요한 값(DB 클라이언트, 사용자 id)만 인자로 받는다.
export async function getMyProfile(userDb: SupabaseClient, userId: string) {
  // RLS가 자기 행만 보여 주지만, 어떤 행을 원하는지 코드에서도 분명히 적는다.
  const { data, error } = await userDb
    .from('profiles')
    .select('id, display_name, onboarding_completed_at, created_at')
    .eq('id', userId)
    .maybeSingle();

  // DB 에러는 appErrorFromDb로 바꿔 던진다. 원문 메시지는 앱으로 나가지 않는다.
  if (error) throw appErrorFromDb(error);

  // 온보딩 전이라 프로필이 아직 없는 경우다.
  if (!data) throw new AppError('NOT_FOUND');

  return data;
}
