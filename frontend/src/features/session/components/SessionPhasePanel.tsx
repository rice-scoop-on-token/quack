import type { Folder } from '@quack/shared';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PERSONAS } from '@/api/mock/data/personas';
import { SpeechBubble } from '@/components/ui/SpeechBubble';
import { Text } from '@/components/ui/Text';
import type { CharacterAction } from '@/features/character/characterAssets';
import { SCREEN_ACTIONS } from '@/features/character/screenActions';
import { ExplainActions, ExplainInput } from '@/features/session/components/ExplainInput';
import type { useExplanation } from '@/features/session/hooks/useExplanation';
import type { useSessionTimer } from '@/features/session/hooks/useSessionTimer';
import { COLORS, SIZES } from '@/theme/assetTokens';

type Props = {
  folder: Folder;
  goal: string;
  timer: ReturnType<typeof useSessionTimer>;
  explanation: ReturnType<typeof useExplanation>;
  onFinish: () => void;
};

// 타이머 화면의 단계별 본문과 하단 버튼. 버튼은 모두 화면 하단 고정 영역에 두므로 둘을 나눠 돌려준다.
// 위쪽의 경과 시간과 하단의 쉬기·공부 마치기는 TimerScreen이 늘 보여 준다.
// 질문 내용(꼬리 질문, 선생님이 먼저 묻는 질문)은 서버가 정하고, 앞뒤에 붙는 말투 문구만 그 과목 선생님의 성격(personas)을 따른다.
export function phaseView({ folder, goal, timer, explanation, onFinish }: Props): {
  body: ReactNode;
  actions: ReactNode;
  // 위쪽 장면(StudyScene)의 캐릭터가 보여 줄 동작
  characterAction: CharacterAction;
} {
  const lines = PERSONAS[folder.species_id].lines;
  const { last, draft, prompt } = explanation;

  switch (timer.state.phase) {
    case 'timing':
      return {
        characterAction: timer.running ? SCREEN_ACTIONS.timing : SCREEN_ACTIONS.paused,
        body: (
          <>
            <Card>
              <Text>{goal}</Text>
            </Card>
            <Text>{timer.running ? '나도 옆에서 읽고 있을게.' : '잠깐 쉬어가자.'}</Text>
            {/* 넘어간 개념은 리포트의 보완할 개념이 된다 */}
            {explanation.skipped ? <Text accessibilityLiveRegion="polite">{lines.skip}</Text> : null}
            <Text>말이나 채팅이 없으면 선생님이 먼저 가볍게 질문해요.</Text>
          </>
        ),
        actions: (
          <>
            <Button title="이제 설명해 볼게" onPress={() => explanation.start({ trigger: 'self', question: null })} />
            <Button title="기다리지 않고 반응 보기" onPress={() => timer.send({ type: 'idleTimeout' })} />
          </>
        ),
      };

    case 'aiQuestion':
      return {
        characterAction: SCREEN_ACTIONS.aiQuestion,
        body: (
          <>
            <SpeechBubble>{explanation.aiQuestion}</SpeechBubble>
            <Text>설명이 없는 동안 책을 읽으며 기다렸어요.</Text>
          </>
        ),
        actions: (
          <>
            <Button
              title="설명하기"
              disabled={!explanation.aiQuestion}
              onPress={() => explanation.start({ trigger: 'ai_question', question: explanation.aiQuestion })}
            />
            <Button title="조금 이따가" onPress={() => timer.send({ type: 'snooze', now: Date.now() })} />
          </>
        ),
      };

    case 'explaining':
      return {
        characterAction: SCREEN_ACTIONS.explaining,
        body: (
          <>
            {prompt.question ? <Text style={styles.bubble}>{prompt.question}</Text> : <Text>네 말로 설명해 줘</Text>}
            <Text>완벽하지 않아도 괜찮아요.</Text>
            <ExplainInput draft={draft} />
          </>
        ),
        actions: (
          <>
            {/* 돌아가기는 꼬리 질문에 답하던 중이면 넘어가기와 같다. 임시 구현, 팀 확인 필요 */}
            <ExplainActions draft={draft} onSend={explanation.send} onCancel={explanation.cancel} />
          </>
        ),
      };

    case 'analyzing':
      return {
        characterAction: SCREEN_ACTIONS.analyzing,
        body: (
          <>
            <Text style={styles.bubble}>{draft.text}</Text>
            <View style={styles.center} accessibilityRole="progressbar" accessibilityLiveRegion="polite">
              <Text>설명을 살펴보고 있어요…</Text>
              <Text>{lines.thinking}</Text>
            </View>
          </>
        ),
        actions: null,
      };

    // AI가 질문했을 때(ask, explain). AI의 message와 question을 고치지 않고 그대로 보여 준다(#17 합의).
    case 'followUp':
      return {
        characterAction:
          last?.understanding_status === 'ambiguous' ? SCREEN_ACTIONS.followUpAmbiguous : SCREEN_ACTIONS.followUpInsufficient,
        body: (
          <>
            <SpeechBubble>{last?.response.message}</SpeechBubble>
            {last?.response.question ? <Text style={styles.bubble}>{last.response.question}</Text> : null}
          </>
        ),
        actions: (
          <>
            <Button
              title="답할게"
              onPress={() => explanation.start({ trigger: 'follow_up', question: last?.response.question ?? null })}
            />
            {/* 넘어간 개념은 리포트에서 보완할 개념이 된다 */}
            <Button title="넘어가기" onPress={explanation.skip} />
          </>
        ),
      };

    // AI가 대화를 마무리했을 때(correct, acknowledge). 넘어가기는 여기를 거치지 않고 바로 공부로 돌아간다.
    // 다음 주제 제안은 시연에서 뺐다(#17 합의).
    case 'confirmed':
      return {
        characterAction: SCREEN_ACTIONS.confirmed,
        body: <SpeechBubble>{last?.response.message ?? lines.praise}</SpeechBubble>,
        actions: (
          <>
            <Button title="이어서 공부하기" onPress={explanation.continueStudy} />
            <Button title="오늘 공부 마치기" onPress={onFinish} />
          </>
        ),
      };

    default:
      return { body: null, actions: null, characterAction: SCREEN_ACTIONS.explaining };
  }
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    gap: 8,
  },
  bubble: {
    padding: 12,
    borderWidth: SIZES.card.border,
    borderColor: COLORS.outline,
    borderRadius: SIZES.card.radius,
    backgroundColor: COLORS.card,
  },
});
