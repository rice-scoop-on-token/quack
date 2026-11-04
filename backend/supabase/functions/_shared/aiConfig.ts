// AI 호출에 필요한 설정을 한 곳에서 읽는다.
// 키 값은 supabase secrets(배포)나 functions/.env(로컬)로만 넣는다. 코드와 로그에는 남기지 않는다.

export type LlmConfig = {
  apiKey: string;
  model: string;
};

// 요청을 처리할 때 부른다. 모듈을 불러올 때 읽으면 키가 빠졌을 때 /health까지 함수 전체가 실패하기 때문이다.
// 값이 없으면 변수 이름만 담은 에러를 던진다. errorHandler가 서버 로그에 남기고 앱에는 INTERNAL_ERROR로 보낸다.
export function readLlmConfig(): LlmConfig {
  const apiKey = Deno.env.get('LLM_API_KEY')?.trim() ?? '';
  const model = Deno.env.get('LLM_MODEL')?.trim() ?? '';

  const missing = [!apiKey && 'LLM_API_KEY', !model && 'LLM_MODEL'].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(`AI 설정이 없습니다: ${missing.join(', ')}`);
  }

  return { apiKey, model };
}

// 아래 두 값은 팀 결정 전 임시값이다(docs/Todo.md A4, 미정 사항).

// 사용자 한 명이 하루(서울 시간)에 AI 분석을 요청할 수 있는 횟수. server.consume_ai_quota에 넘긴다.
export const AI_DAILY_LIMIT = 30;

// AI 응답 한 번의 최대 출력 토큰 수. AI 담당이 첫 실제 실행(ai/evals)에서 쓴 값이며, AI 담당 확인 전 임시값이다.
export const LLM_MAX_OUTPUT_TOKENS = 4096;
