// AI 분석에 넘길 이전 대화(conversation_history)를 서버에 저장된 행으로 만든다.
// DB를 부르지 않는 순수 함수로 분리해 backend/supabase/tests/unit/에서 따로 시험한다.
//
// 보안 원칙: 앱이 보낸 question_text는 쓰지 않는다. 앱이 이전 AI 질문을 바꿔 보내도 분석 이력이 바뀌지 않게 하기 위해서다.
// AI 질문은 서버가 저장한 turn_analyses의 message·question만 쓴다.

type SavedAnalysis = { message: string; question: string | null };

export type SavedTurnRow = {
  seq: number;
  text: string;
  // 행에 있어도 읽지 않는다. 시험에서 무시되는지 확인할 수 있게 타입에 둔다.
  question_text?: string | null;
  // supabase-js 관계 조회 결과. 턴 하나에 분석 하나라 객체로 오지만, 배열로 와도 처리한다.
  turn_analyses: SavedAnalysis | SavedAnalysis[] | null;
};

export type ConversationMessage = { role: 'user' | 'assistant'; content: string };

function analysisOf(row: SavedTurnRow): SavedAnalysis | null {
  const value = row.turn_analyses;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

// 저장된 턴을 순번대로 "사용자 설명 → AI 발화" 순서의 대화로 바꾸고, 이번 턴에 쓸 순번(마지막 순번 + 1)을 함께 돌려준다.
export function buildTurnHistory(rows: SavedTurnRow[]): { history: ConversationMessage[]; nextSeq: number } {
  const sorted = [...rows].sort((a, b) => a.seq - b.seq);
  const history: ConversationMessage[] = [];

  for (const row of sorted) {
    history.push({ role: 'user', content: row.text });

    // 분석 없는 턴은 정상 흐름(save_turn)에서는 생기지 않는다. 생기더라도 AI 발화를 지어내지 않고 사용자 설명만 넣는다.
    const analysis = analysisOf(row);
    if (analysis) {
      const content = analysis.question ? `${analysis.message}\n\n${analysis.question}` : analysis.message;
      history.push({ role: 'assistant', content });
    }
  }

  const lastSeq = sorted.length > 0 ? sorted[sorted.length - 1].seq : 0;

  return { history, nextSeq: lastSeq + 1 };
}
