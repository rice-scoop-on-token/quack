import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// EXPO_PUBLIC_ 값은 앱 번들에 그대로 들어간다. publishable key만 넣고 비밀 키는 넣지 않는다.
// Expo는 process.env.EXPO_PUBLIC_이름 을 그대로 적은 곳만 값으로 바꾸므로 구조 분해하지 않는다.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

// 처음 쓸 때 만든다. mock 모드에서는 부르지 않으므로 .env가 비어 있어도 앱이 깨지지 않는다.
export function getSupabase(): SupabaseClient {
  if (!url || !publishableKey) {
    throw new Error('frontend/.env에 EXPO_PUBLIC_SUPABASE_URL과 EXPO_PUBLIC_SUPABASE_ANON_KEY를 넣어 주세요.');
  }
  client ??= createClient(url, publishableKey);
  return client;
}

// 익명 로그인하고 사용자 id를 돌려준다. 이미 로그인한 세션이 있으면 그대로 쓴다(웹은 브라우저에 저장된다).
export async function ensureSignedIn(): Promise<string> {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    return data.session.user.id;
  }

  const { data: signedIn, error } = await supabase.auth.signInAnonymously();
  if (error || !signedIn.user) {
    throw error ?? new Error('익명 로그인에 실패했어요.');
  }
  return signedIn.user.id;
}
