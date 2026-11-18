import type { SupabaseClient } from '@supabase/supabase-js';

import { type CreateTurnRequest, type CreateTurnResponse, explanationAnalysisSchema } from '@quack/shared';

import { analyzeExplanation } from '../../_ai/openAiClient.ts';
import { AI_DAILY_LIMIT, LLM_MAX_OUTPUT_TOKENS, readLlmConfig } from '../../_shared/aiConfig.ts';
import { AppError, appErrorFromDb, zodIssuesForLog } from '../middleware/error.ts';
import { getMySession } from './sessions.service.ts';
import { buildTurnHistory, type SavedTurnRow } from './turnHistory.ts';

// 페르소나는 세션이 속한 폴더의 동물로 고른다(CLAUDE.md AI 섹션).
async function getFolderSpecies(userDb: SupabaseClient, folderId: string): Promise<string> {
  const { data, error } = await userDb.from('folders').select('species_id').eq('id', folderId).single();

  if (error) throw appErrorFromDb(error);

  return data.species_id;
}

// 같은 세션의 저장된 턴과 AI 발화를 읽는다. turn_analyses는 공개 칸(message, question)만 읽을 수 있다.
async function getSavedTurns(userDb: SupabaseClient, sessionId: string): Promise<SavedTurnRow[]> {
  const { data, error } = await userDb
    .from('explanation_turns')
    .select('seq, text, turn_analyses(message, question)')
    .eq('session_id', sessionId)
    .order('seq');

  if (error) throw appErrorFromDb(error);

  return data as SavedTurnRow[];
}

// POST /sessions/:id/turns: 텍스트 설명을 AI로 분석하고, 턴·분석·AI 발화를 저장한 뒤 공개 결과를 돌려준다.
// AI가 실패하거나 계약에 맞지 않는 결과를 내면 턴을 저장하지 않고 AI_FAILED를 던진다. 앱은 같은 설명을 다시 보낼 수 있다.
// 차감한 사용량은 돌려주지 않는다(docs/decisions/0002).
export async function createTurn(
  userDb: SupabaseClient,
  adminDb: SupabaseClient,
  userId: string,
  sessionId: string,
  request: CreateTurnRequest,
): Promise<CreateTurnResponse> {
  // 공백뿐인 설명은 AI 입력 검증에서 실패한다. 사용량을 쓰기 전에 거절한다.
  if (!request.text.trim()) throw new AppError('VALIDATION_FAILED');

  const session = await getMySession(userDb, sessionId);
  if (session.status !== 'active') throw new AppError('INVALID_STATE');

  const speciesId = await getFolderSpecies(userDb, session.folder_id);
  const { history, nextSeq } = buildTurnHistory(await getSavedTurns(userDb, session.id));

  // 키가 없으면 사용량을 쓰기 전에 실패하게 먼저 읽는다.
  const llm = readLlmConfig();

  // consume_ai_quota는 server 스키마 함수라 service role로만 부를 수 있다. user_id는 auth 미들웨어가 확인한 값이다.
  const { data: counted, error: quotaError } = await adminDb.schema('server').rpc('consume_ai_quota', {
    p_user_id: userId,
    p_kind: 'analysis',
    p_daily_limit: AI_DAILY_LIMIT,
  });
  if (quotaError) throw appErrorFromDb(quotaError);
  if (!counted) throw new AppError('AI_QUOTA_EXCEEDED');

  const result = await analyzeExplanation(
    {
      learning_goal: session.goal,
      // 자료 본문을 꺼내는 기능이 아직 없어 자료 없이 분석한다(docs/Todo.md 텍스트 시연 생략 항목).
      reference_materials: [],
      user_message: request.text,
      input_mode: request.input_mode,
      conversation_history: history,
      species_id: speciesId,
    },
    { apiKey: llm.apiKey, model: llm.model, maxOutputTokens: LLM_MAX_OUTPUT_TOKENS },
  );

  // 실패 코드만 남긴다. 설명과 AI 출력은 개인 데이터라 로그에 남기지 않는다.
  if (!result.ok) {
    console.error('[api] AI 분석 실패', result.code, result.http_status ?? '');
    throw new AppError('AI_FAILED');
  }

  // 내부 출력을 공개 형태로 바꾼 직후 shared 계약으로 검증한다.
  // 금지 조합이면 다른 행동이나 충분 판정으로 바꾸지 않고 AI_FAILED로 돌려준다(PR #17 결정).
  const { output } = result;
  const parsed = explanationAnalysisSchema.safeParse({
    answer_status: output.answer.status,
    understanding_status: output.understanding.status,
    independent_performance_status: output.independent_performance.status,
    response: output.response,
  });
  if (!parsed.success) {
    console.error('[api] AI 분석이 공개 계약과 맞지 않음', zodIssuesForLog(parsed.error));
    throw new AppError('AI_FAILED');
  }
  const analysis = parsed.data;

  // save_turn은 server 스키마 함수라 service role로만 부를 수 있다. user_id는 auth 미들웨어가 확인한 값이다.
  // 그 사이 다른 요청이 턴을 저장했다면 nextSeq가 어긋나 INVALID_STATE가 된다.
  const { data: turn, error: saveError } = await adminDb.schema('server').rpc('save_turn', {
    p_user_id: userId,
    p_session_id: session.id,
    p_seq: nextSeq,
    p_trigger: request.trigger,
    // 앱이 보낸 질문은 기록용으로만 저장한다. 다음 턴의 이력에는 쓰지 않는다(turnHistory.ts).
    p_question_text: request.question_text,
    p_input_mode: request.input_mode,
    p_text: request.text,
    p_answer_status: analysis.answer_status,
    p_understanding_status: analysis.understanding_status,
    p_independent_performance_status: analysis.independent_performance_status,
    p_action: analysis.response.action,
    p_message: analysis.response.message,
    p_question: analysis.response.question,
    p_analysis: output,
    p_model: llm.model,
  });
  if (saveError) throw appErrorFromDb(saveError);

  return { turn, analysis };
}
