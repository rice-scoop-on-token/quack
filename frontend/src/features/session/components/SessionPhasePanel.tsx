import type { Folder } from '@quack/shared';
import type { ReactNode } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

import { PERSONAS } from '@/api/mock/data/personas';
import type { GrowthStage } from '@/api/tempContract';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { ExplainActions, ExplainInput } from '@/features/session/components/ExplainInput';
import type { useExplanation } from '@/features/session/hooks/useExplanation';
import type { useSessionTimer } from '@/features/session/hooks/useSessionTimer';
import { MAX_FOLLOW_UPS } from '@/features/session/machine';

type Props = {
  folder: Folder;
  stage: GrowthStage;
  goal: string;
  timer: ReturnType<typeof useSessionTimer>;
  explanation: ReturnType<typeof useExplanation>;
  onFinish: () => void;
};

// 타이머 화면의 단계별 본문과 하단 버튼. 버튼은 모두 화면 하단 고정 영역에 두므로 둘을 나눠 돌려준다.
// 위쪽의 경과 시간과 하단의 쉬기·공부 마치기는 TimerScreen이 늘 보여 준다.
// 선생님 말투는 그 과목 선생님의 성격(personas)을 따른다. 질문 내용은 분석 결과가 정한다.
export function phaseView({ folder, stage, goal, timer, explanation, onFinish }: Props): {
  body: ReactNode;
  actions: ReactNode;
} {
  const lines = PERSONAS[folder.species_id].lines;
  const { last, draft, prompt } = explanation;

  switch (timer.state.phase) {
    case 'timing':
      return {
        body: (
          <>
            {/* 오늘의 학습 목표 */}
            <Text>{goal}</Text>
            {/* 선생님 캐릭터와 한 줄 안내 */}
            <View style={styles.center}>
              <CharacterBox speciesId={folder.species_id} stage={stage} size={160} />
              <Text>{timer.running ? '나도 옆에서 읽고 있을게.' : '잠깐 쉬어가자.'}</Text>
            </View>
            {/* 넘어가기·꼬리 질문 한도로 돌아왔을 때 안내 (넘어간 개념은 리포트의 보완할 개념이 된다) */}
            {explanation.skipped ? <Text accessibilityLiveRegion="polite">{lines.skip}</Text> : null}
            {/* 선생님 먼저 질문 안내 */}
            <Text>말이나 채팅이 없으면 선생님이 먼저 가볍게 질문해요.</Text>
          </>
        ),
        actions: (
          <>
            {/* 설명 시작 버튼 */}
            <Button title="이제 설명해 볼게" onPress={() => explanation.start({ trigger: 'self', question: null })} />
            {/* AI 선제 질문 바로 보기 버튼 */}
            <Button title="기다리지 않고 반응 보기" onPress={() => timer.send({ type: 'idleTimeout' })} />
          </>
        ),
      };

    case 'aiQuestion':
      return {
        body: (
          <>
            {/* 선생님 캐릭터 */}
            <View style={styles.center}>
              <CharacterBox speciesId={folder.species_id} stage={stage} size={120} />
            </View>
            {/* 선생님의 먼저 묻는 질문 말풍선 */}
            <Text style={styles.bubble} accessibilityLiveRegion="polite">
              {lines.aiQuestion}
            </Text>
            <Text>설명이 없는 동안 책을 읽으며 기다렸어요.</Text>
          </>
        ),
        actions: (
          <>
            {/* 설명하기 버튼 */}
            <Button
              title="설명하기"
              onPress={() => explanation.start({ trigger: 'ai_question', question: lines.aiQuestion })}
            />
            {/* 질문 미루기 버튼 */}
            <Button title="조금 이따가" onPress={() => timer.send({ type: 'snooze', now: Date.now() })} />
          </>
        ),
      };

    case 'explaining':
      return {
        body: (
          <>
            {/* 답하는 질문 (스스로 설명하면 없다) */}
            {prompt.question ? <Text style={styles.bubble}>{prompt.question}</Text> : <Text>네 말로 설명해 줘</Text>}
            <Text>완벽하지 않아도 괜찮아요.</Text>
            {/* 설명 입력 */}
            <ExplainInput draft={draft} />
          </>
        ),
        // 녹음·보내기 버튼 (실패했으면 다시 보내기)
        actions: <ExplainActions draft={draft} onSend={explanation.send} />,
      };

    case 'analyzing':
      return {
        body: (
          <>
            {/* 내가 보낸 설명 */}
            <Text style={styles.bubble}>{draft.text}</Text>
            {/* 분석 중 표시 */}
            <View style={styles.center} accessibilityRole="progressbar" accessibilityLiveRegion="polite">
              <Text>설명을 살펴보고 있어요…</Text>
              <Text>{lines.thinking}</Text>
            </View>
          </>
        ),
        actions: null,
      };

    case 'followUp':
      return {
        body: (
          <>
            {/* 꼬리 질문 횟수 */}
            <Text>
              꼬리 질문 {timer.state.followUpCount} / {MAX_FOLLOW_UPS}
            </Text>
            {/* 선생님 캐릭터 (지금 성장 단계) */}
            <View style={styles.center}>
              <CharacterBox speciesId={folder.species_id} stage={stage} size={120} />
            </View>
            {/* 선생님의 꼬리 질문 말풍선 */}
            <Text style={styles.bubble} accessibilityLiveRegion="polite">
              {lines.followUpLead} {last?.follow_up_question}
            </Text>
            {/* 빠진 개념 */}
            {last && last.missing_concepts.length > 0 ? (
              <Text>더 채우면 좋은 부분: {last.missing_concepts.join(', ')}</Text>
            ) : null}
          </>
        ),
        actions: (
          <>
            {/* 답하기 버튼 */}
            <Button
              title="답할게"
              onPress={() => explanation.start({ trigger: 'follow_up', question: last?.follow_up_question ?? null })}
            />
            {/* 넘어가기 버튼 (바로 공부로 돌아가고, 이 개념은 리포트에서 보완할 개념이 된다) */}
            <Button title="넘어가기" onPress={explanation.skip} />
          </>
        ),
      };

    // 충분 판정을 받았을 때만 온다(꼬리 질문 한도·넘어가기는 바로 공부로 돌아간다)
    case 'confirmed':
      return {
        body: (
          <>
            {/* 선생님 캐릭터 */}
            <View style={styles.center}>
              <CharacterBox speciesId={folder.species_id} stage={stage} size={120} />
            </View>
            {/* 이해 확인 말풍선 */}
            <Text style={styles.bubble} accessibilityLiveRegion="polite">
              {lines.praise}
            </Text>
            {/* 다음 주제 제안 */}
            {last?.next_topic ? <Text>다음 주제: {last.next_topic}</Text> : null}
          </>
        ),
        actions: (
          <>
            {/* 이어서 공부하기 버튼 */}
            <Button title="이어서 공부하기" onPress={explanation.continueStudy} />
            {/* 공부 마치기 버튼 */}
            <Button title="오늘 공부 마치기" onPress={onFinish} />
          </>
        ),
      };

    default:
      return { body: null, actions: null };
  }
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    gap: 8,
  },
  // 말풍선 자리가 보이도록 테두리만 둔다 (임시 스타일)
  bubble: {
    padding: 12,
    borderWidth: 1,
  },
});
