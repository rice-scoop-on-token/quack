import type { ExplanationTurn } from '@quack/shared';
import { useRef, useState } from 'react';

import { analyzeExplanation, mockConcept } from '@/api/mock/scenarios/analysis';
import { useDemoVariant } from '@/api/mock/useDemoVariant';
import type { SessionTurn } from '@/api/tempContract';
import { useExplainDraft } from '@/features/session/hooks/useExplainDraft';
import { MAX_FOLLOW_UPS } from '@/features/session/machine';
import type { useSessionTimer } from '@/features/session/hooks/useSessionTimer';

type Timer = ReturnType<typeof useSessionTimer>;

// 무엇에 답하는 설명인지. 스스로 설명하면 질문이 없다.
type Prompt = { trigger: ExplanationTurn['trigger']; question: string | null };

// 타이머의 설명 흐름(설명 시작 → 보내기 → 분석 → 다음 단계)과 이번 세션의 설명 기록
export function useExplanation(timer: Timer) {
  const demo = useDemoVariant();
  const draft = useExplainDraft();
  const [prompt, setPrompt] = useState<Prompt>({ trigger: 'self', question: null });
  const [turns, setTurns] = useState<SessionTurn[]>([]);
  // 지금 설명하는 개념의 순서. 이어서 공부하면 다음 개념으로 넘어간다.
  const [conceptIndex, setConceptIndex] = useState(0);
  // 방금 넘어가기로 공부에 돌아왔는지(공부 화면에 한 줄 안내를 보여 준다). 다시 설명을 시작하면 지운다.
  const [skipped, setSkipped] = useState(false);
  // 이 세션의 분석 요청 수(실패 포함). ?demo=fail 은 첫 요청만 실패시킨다.
  const callCount = useRef(0);

  function start(next: Prompt) {
    setSkipped(false);
    setPrompt(next);
    timer.send({ type: 'startExplain' });
  }

  async function send() {
    const text = draft.text.trim();
    if (!draft.canSend) {
      return;
    }
    // 다시 보내기면 앞의 실패 문구를 지운다
    draft.setError('');
    timer.send({ type: 'submit' });
    // React Compiler가 callCount.current++ 를 "먼저 올리고 쓰기"로 바꿔 첫 요청이 1이 되므로, 읽고 나서 따로 올린다
    const callIndex = callCount.current;
    callCount.current = callIndex + 1;
    try {
      const analysis = await analyzeExplanation({
        concept: mockConcept(conceptIndex),
        text,
        trigger: prompt.trigger,
        followUpCount: timer.state.followUpCount,
        nextConcept: mockConcept(conceptIndex + 1),
        demo,
        callIndex,
      });
      setTurns((prev) => [
        ...prev,
        {
          seq: prev.length + 1,
          trigger: prompt.trigger,
          input_mode: draft.mode,
          question_text: prompt.question,
          text,
          analysis,
        },
      ]);
      draft.clear();
      // 꼬리 질문을 다 하고도 부족하면 상태 머신이 바로 공부로 돌려보낸다. 넘어가기와 같게 다음 개념으로 넘긴다.
      if (analysis.verdict !== 'sufficient' && timer.state.followUpCount >= MAX_FOLLOW_UPS) {
        moveToNextConcept();
        setSkipped(true);
      }
      timer.send({ type: 'analyzed', verdict: analysis.verdict, now: Date.now() });
    } catch {
      draft.setError('연결이 끊겼어요. 작성한 설명은 그대로 있어요. 다시 보내 주세요.');
      timer.send({ type: 'analysisFailed' });
    }
  }

  function moveToNextConcept() {
    setConceptIndex((i) => i + 1);
    setPrompt({ trigger: 'self', question: null });
  }

  function continueStudy() {
    moveToNextConcept();
    timer.send({ type: 'continue', now: Date.now() });
  }

  // 꼬리 질문 넘어가기: 이 개념은 보완할 개념으로 남기고 다음 개념으로 공부를 이어 간다
  function skip() {
    moveToNextConcept();
    setSkipped(true);
    timer.send({ type: 'skip', now: Date.now() });
  }

  return {
    draft,
    prompt,
    turns,
    // 가장 최근 분석 결과(꼬리 질문, 이해 확인 화면에서 쓴다)
    last: turns.at(-1)?.analysis ?? null,
    skipped,
    start,
    send,
    continueStudy,
    skip,
  };
}
