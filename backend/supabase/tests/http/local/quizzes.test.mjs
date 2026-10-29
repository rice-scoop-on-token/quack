// BE-B 라우트 시험 예시
// GET /quizzes/:id, POST /quizzes/:id/submit (담당: BE-B). api 함수가 응답해야 한다(backend/README.md "HTTP 시험").
// 새 라우트의 시험은 이 파일처럼 <도메인>.test.mjs로 만든다. 순서는 다음과 같다.
//   1. before: functions serve가 떠 있는지 확인하고, 시험에 쓸 익명 사용자와 데이터를 만든다.
//   2. test: 정상 요청, 다른 사용자 요청(404), 잘못된 요청(400), 토큰 없음(401), 상태 에러(409)를 확인한다.
//   3. after: 만든 사용자를 지운다. 사용자에 딸린 폴더·세션·퀴즈는 함께 지워진다.
// 도우미(lib.mjs)는 BE-A 담당이다. 더 필요하면 BE-A에게 요청한다.

import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { assertAppError, assertFunctionsRunning, createLocalClient } from '../lib.mjs';

const local = createLocalClient();
let A;
let B;
let quiz;
let otherQuiz;
let answers;

// 퀴즈와 문항은 앱이 만들 수 없어(서버 전용) secret key('service')로 넣는다.
// seq를 3, 1, 2 순서로 넣어 정렬을 확인한다. 정답은 1번 문항 0, 2번 1, 3번 2다.
async function makeQuiz(user) {
  const folder = await local.rest(user, 'POST', 'folders', { user_id: user.id, name: '퀴즈 폴더' });
  const session = await local.rest(user, 'POST', 'sessions', { user_id: user.id, folder_id: folder.body[0].id, goal: '목표' });
  const created = await local.rest('service', 'POST', 'quizzes', { session_id: session.body[0].id });
  const questions = await local.rest('service', 'POST', 'quiz_questions', [3, 1, 2].map((seq) => ({
    quiz_id: created.body[0].id, seq, type: 'multiple_choice', prompt: `문항 ${seq}`,
    choices: ['가', '나', '다', '라'], answer: seq - 1, explanation: `해설 ${seq}`, related_concept: null,
  })));
  const idBySeq = Object.fromEntries(questions.body.map((q) => [q.seq, q.id]));
  return { id: created.body[0].id, q1: idBySeq[1], q2: idBySeq[2], q3: idBySeq[3] };
}

const submit = (who, quizId, body) => local.api(who, `/quizzes/${quizId}/submit`, { method: 'POST', body: { answers: body } });
const attemptsOf = async (quizId) => (await local.rest('service', 'GET', `quiz_attempts?quiz_id=eq.${quizId}&select=id`)).body;

before(async () => {
  await assertFunctionsRunning(local);
  A = await local.signup();
  B = await local.signup();
  quiz = await makeQuiz(A);
  otherQuiz = await makeQuiz(A);
  answers = [
    { question_id: quiz.q1, answer: 0 }, // 정답
    { question_id: quiz.q2, answer: 1 }, // 정답
    { question_id: quiz.q3, answer: 0 }, // 오답 (정답은 2)
  ];
});

after(() => local.deleteCreatedUsers());

test('조회: 문항이 seq 순서로 오고 정답·해설이 없다', async () => {
  const res = await local.api(A, `/quizzes/${quiz.id}`);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.quiz.questions.map((q) => q.seq), [1, 2, 3]);
  assert.doesNotMatch(JSON.stringify(res.body), /"answer"|"explanation"|"related_concept"|해설/);
});

test('조회: 다른 사용자 404, 없는 퀴즈 404, uuid가 아닌 id 400, 토큰 없음 401', async () => {
  assertAppError(await local.api(B, `/quizzes/${quiz.id}`), 404, 'NOT_FOUND');
  assertAppError(await local.api(A, '/quizzes/00000000-0000-4000-8000-000000000000'), 404, 'NOT_FOUND');
  assertAppError(await local.api(A, '/quizzes/not-a-uuid'), 400, 'VALIDATION_FAILED');
  assertAppError(await local.api('anon', `/quizzes/${quiz.id}`), 401, 'UNAUTHORIZED');
});

test('제출: 잘못된 답은 400이고 저장되지 않는다', async () => {
  const cases = {
    '일부만 답': answers.slice(0, 2),
    '같은 문항에 두 번 답': [...answers.slice(0, 2), { question_id: quiz.q1, answer: 3 }],
    '다른 퀴즈의 문항에 답': [...answers.slice(0, 2), { question_id: otherQuiz.q3, answer: 2 }],
    '보기 범위 밖': [{ question_id: quiz.q1, answer: 4 }, ...answers.slice(1)],
    '빈 목록': [],
  };
  for (const [label, body] of Object.entries(cases)) {
    const res = await submit(A, quiz.id, body);
    assert.equal(res.status, 400, label);
    assert.equal(res.body.error.code, 'VALIDATION_FAILED', label);
  }

  const broken = await local.api(A, `/quizzes/${quiz.id}/submit`, { method: 'POST', body: '{not json' });
  assertAppError(broken, 400, 'VALIDATION_FAILED');

  assert.equal((await attemptsOf(quiz.id)).length, 0);
});

test('제출: 다른 사용자 404, 토큰 없음 401', async () => {
  assertAppError(await submit(B, quiz.id, answers), 404, 'NOT_FOUND');
  assertAppError(await submit('anon', quiz.id, answers), 401, 'UNAUTHORIZED');
});

test('제출: 서버가 채점하고 한 번만 저장한다', async () => {
  const res = await submit(A, quiz.id, answers);
  assert.equal(res.status, 200);
  assert.equal(res.body.attempt.correct_count, 2);
  assert.equal(res.body.attempt.total_count, 3);

  const byId = Object.fromEntries(res.body.results.map((r) => [r.question_id, r]));
  assert.equal(byId[quiz.q1].correct, true);
  assert.equal(byId[quiz.q3].correct, false);
  assert.equal(byId[quiz.q3].correct_answer, 2);
  assert.equal(byId[quiz.q3].explanation, '해설 3');

  const saved = await attemptsOf(quiz.id);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].id, res.body.attempt.id);
});

test('제출: 같은 퀴즈를 다시 내면 409 INVALID_STATE', async () => {
  assertAppError(await submit(A, quiz.id, answers), 409, 'INVALID_STATE');
});

test('제출: 같은 퀴즈를 동시에 두 번 내면 하나만 저장된다', async () => {
  const otherAnswers = [
    { question_id: otherQuiz.q1, answer: 0 },
    { question_id: otherQuiz.q2, answer: 1 },
    { question_id: otherQuiz.q3, answer: 2 },
  ];
  const results = await Promise.all([submit(A, otherQuiz.id, otherAnswers), submit(A, otherQuiz.id, otherAnswers)]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal((await attemptsOf(otherQuiz.id)).length, 1);
});
