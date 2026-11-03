import type { ExplanationTurn } from '@quack/shared';
import { useEffect, useState } from 'react';

import { useQuackApi } from '@/api';
import type { SessionTurn } from '@/api/tempContract';
import { useExplainDraft } from '@/features/session/hooks/useExplainDraft';
import { MAX_FOLLOW_UPS } from '@/features/session/machine';
import type { useSessionTimer } from '@/features/session/hooks/useSessionTimer';

type Timer = ReturnType<typeof useSessionTimer>;

// 무엇에 답하는 설명인지. 스스로 설명하면 질문이 없다.
type Prompt = { trigger: ExplanationTurn['trigger']; question: string | null };

// 타이머의 설명 흐름(설명 시작 → 보내기 → 분석 → 다음 단계)과 이번 화면에서 받은 분석 결과
export function useExplanation(timer: Timer, sessionId: string | undefined) {
  const api = useQuackApi();
  const draft = useExplainDraft();
  const [prompt, setPrompt] = useState<Prompt>({ trigger: 'self', question: null });
  const [turns, setTurns] = useState<SessionTurn[]>([]);
  // 방금 넘어가기로 공부에 돌아왔는지(공부 화면에 한 줄 안내를 보여 준다). 다시 설명을 시작하면 지운다.
  const [skipped, setSkipped] = useState(false);
  // 선생님이 먼저 묻는 질문. 질문 내용은 서버가 만든다.
  const [aiQuestion, setAiQuestion] = useState<string | null>(null);
  const phase = timer.state.phase;

  useEffect(() => {
    if (phase !== 'aiQuestion' || !sessionId) {
      return;
    }
    let current = true;
    setAiQuestion(null);
    api.requestAiQuestion(sessionId).then((r) => current && setAiQuestion(r.question));
    return () => {
      current = false;
    };
  }, [phase, sessionId, api]);

  function start(next: Prompt) {
    setSkipped(false);
    setPrompt(next);
    timer.send({ type: 'startExplain' });
  }

  async function send() {
    const text = draft.text.trim();
    if (!draft.canSend || !sessionId) {
      return;
    }
    // 다시 보내기면 앞의 실패 문구를 지운다
    draft.setError('');
    timer.send({ type: 'submit' });
    try {
      const turn = await api.sendTurn(sessionId, {
        trigger: prompt.trigger,
        input_mode: draft.mode,
        text,
        question_text: prompt.question,
      });
      setTurns((prev) => [...prev, turn]);
      draft.clear();
      // 꼬리 질문을 다 하고도 부족하면 상태 머신이 바로 공부로 돌려보낸다. 넘어가기와 같게 다음 개념으로 넘긴다.
      if (turn.analysis.verdict !== 'sufficient' && timer.state.followUpCount >= MAX_FOLLOW_UPS) {
        moveToNextConcept();
        setSkipped(true);
      }
      timer.send({ type: 'analyzed', verdict: turn.analysis.verdict, now: Date.now() });
    } catch {
      draft.setError('연결이 끊겼어요. 작성한 설명은 그대로 있어요. 다시 보내 주세요.');
      timer.send({ type: 'analysisFailed' });
    }
  }

  // 다음 개념은 서버가 설명 기록으로 정한다. 앱은 다음 설명을 스스로 설명(self)으로 보내기만 한다.
  function moveToNextConcept() {
    setPrompt({ trigger: 'self', question: null });
  }

  function continueStudy() {
    moveToNextConcept();
    timer.send({ type: 'continue', now: Date.now() });
  }

  // 꼬리 질문 넘어가기: 이 개념은 보완할 개념으로 남기고 다음 개념으로 공부를 이어 간다
  // 다음 개념으로 가므로 답하다 만 초안은 지운다
  function skip() {
    moveToNextConcept();
    setSkipped(true);
    draft.stopRecording();
    draft.clear();
    draft.setError('');
    timer.send({ type: 'skip', now: Date.now() });
  }

  // 설명 입력의 "돌아가기". 꼬리 질문에 답하던 중이면 넘어가기와 같다.
  // 그 밖에는 같은 개념이라 초안을 남겨, 다시 설명을 시작하면 이어서 쓸 수 있다.
  function cancel() {
    if (prompt.trigger === 'follow_up') {
      skip();
      return;
    }
    draft.stopRecording();
    draft.setError('');
    timer.send({ type: 'cancelExplain', now: Date.now() });
  }

  return {
    draft,
    prompt,
    // 가장 최근 분석 결과(꼬리 질문, 이해 확인 화면에서 쓴다)
    last: turns.at(-1)?.analysis ?? null,
    aiQuestion,
    skipped,
    start,
    send,
    continueStudy,
    skip,
    cancel,
  };
}
