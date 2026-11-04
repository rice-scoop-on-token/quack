// 이전 대화 구성(buildTurnHistory) 시험
// 실행: backend/에서 deno test --config supabase/functions/api/deno.json supabase/tests/unit/
//
// 확인하는 보안 원칙: 앱이 보낸 question_text는 서버 이력을 대체하지 않는다. AI 질문은 서버가 저장한 값만 쓴다.

import assert from 'node:assert/strict';

import { buildTurnHistory } from '../../functions/api/services/turnHistory.ts';

Deno.test('턴이 없으면 이력은 비어 있고 다음 순번은 1이다', () => {
  assert.deepEqual(buildTurnHistory([]), { history: [], nextSeq: 1 });
});

Deno.test('사용자 설명 → AI 발화 순서로 만들고, 질문은 발화 뒤에 붙인다', () => {
  const result = buildTurnHistory([
    { seq: 1, text: '설명1', turn_analyses: { message: '발화1', question: '질문1' } },
    { seq: 2, text: '설명2', turn_analyses: { message: '발화2', question: null } },
  ]);

  assert.deepEqual(result, {
    history: [
      { role: 'user', content: '설명1' },
      { role: 'assistant', content: '발화1\n\n질문1' },
      { role: 'user', content: '설명2' },
      { role: 'assistant', content: '발화2' },
    ],
    nextSeq: 3,
  });
});

Deno.test('앱이 보낸 question_text는 이력에 들어가지 않고, 서버에 저장된 AI 질문만 쓴다', () => {
  const result = buildTurnHistory([
    { seq: 1, text: '설명1', question_text: null, turn_analyses: { message: '발화1', question: '서버 질문' } },
    { seq: 2, text: '설명2', question_text: '앱이 바꾼 질문', turn_analyses: { message: '발화2', question: null } },
  ]);

  const all = result.history.map((m) => m.content).join('\n');
  assert.ok(all.includes('서버 질문'));
  assert.ok(!all.includes('앱이 바꾼 질문'));
});

Deno.test('순번이 섞여 와도 순번대로 만들고, 배열로 온 분석도 읽는다', () => {
  const result = buildTurnHistory([
    { seq: 2, text: '설명2', turn_analyses: [{ message: '발화2', question: null }] },
    { seq: 1, text: '설명1', turn_analyses: [{ message: '발화1', question: '질문1' }] },
  ]);

  assert.deepEqual(result.history.map((m) => m.content), ['설명1', '발화1\n\n질문1', '설명2', '발화2']);
  assert.equal(result.nextSeq, 3);
});

Deno.test('분석 없는 턴은 AI 발화를 지어내지 않고 사용자 설명만 넣는다', () => {
  const result = buildTurnHistory([{ seq: 1, text: '설명1', turn_analyses: null }]);

  assert.deepEqual(result, { history: [{ role: 'user', content: '설명1' }], nextSeq: 2 });
});
