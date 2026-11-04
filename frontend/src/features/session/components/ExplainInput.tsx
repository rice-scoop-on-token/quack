import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { PaperInput } from '@/components/ui/PaperInput';
import { Text } from '@/components/ui/Text';
import type { ExplainDraft, InputMode } from '@/features/session/hooks/useExplainDraft';
import { COLORS, FEEDBACK, hardShadow, PAPER, SIZES } from '@/theme/assetTokens';

const TABS: { mode: InputMode; label: string }[] = [
  { mode: 'chat', label: '글로 설명' },
  { mode: 'voice', label: '말로 설명' },
];

const RECORD_BUTTON_SIZE = 72;

// 설명 입력(글·말 탭, 입력란). 녹음·보내기 버튼은 하단 고정 영역에 두므로 아래 ExplainActions로 나눴다.
// 말 탭에서는 녹음이 끝난 전사문을 같은 입력란에서 바로 확인하고 고친다.
export function ExplainInput({ draft }: { draft: ExplainDraft }) {
  return (
    <View style={styles.container}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((tab) => (
          <Pressable
            key={tab.mode}
            style={[styles.tab, draft.mode === tab.mode && styles.selected]}
            onPress={() => draft.setMode(tab.mode)}
            accessibilityRole="tab"
            accessibilityState={{ selected: draft.mode === tab.mode }}
          >
            <Text>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* 녹음 상태 문구는 입력란 제목에 붙여 알린다(색만으로 알리지 않는다) */}
      <Text accessibilityLiveRegion="polite">
        {draft.mode === 'voice' ? '전사문 확인·수정' : '나의 설명'}
        {draft.recording ? ' · ● 듣는 중…' : ''}
      </Text>
      {/* mock: 실제 마이크는 쓰지 않는다. 녹음을 멈추면 예시 전사문이 채워진다 */}
      <PaperInput
        style={styles.input}
        value={draft.text}
        onChangeText={draft.setText}
        multiline
        editable={!draft.recording}
        placeholder={draft.mode === 'voice' ? '녹음을 멈추면 전사문이 여기에 나와요.' : '배운 개념을 내 말로 설명해 보세요.'}
      />
      {draft.error ? <Text accessibilityRole="alert">{draft.error}</Text> : null}
    </View>
  );
}

// 설명 입력의 하단 버튼(말 탭이면 녹음 시작·멈춤, 보내기). 실패했으면 보내기가 "다시 보내기"가 된다.
// 녹음 버튼은 하단 영역 맨 위에 둬서 위쪽 전사문 블록과 아래 설명 보내기 버튼 사이에 온다.
export function ExplainActions({
  draft,
  onSend,
  onCancel,
}: {
  draft: ExplainDraft;
  onSend: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      {draft.mode === 'voice' ? (
        <Pressable
          style={styles.recordButton}
          onPress={draft.toggleRecording}
          accessibilityRole="button"
          accessibilityLabel={draft.recording ? '녹음 멈추기' : '녹음 시작'}
          accessibilityState={{ selected: draft.recording }}
        >
          {/* 녹음 전: 빨간 채운 원. 녹음 중: Ⅱ 표시 */}
          {draft.recording ? (
            <View style={styles.pause}>
              <View style={styles.pauseBar} />
              <View style={styles.pauseBar} />
            </View>
          ) : (
            <View style={styles.dot} />
          )}
        </Pressable>
      ) : null}
      {/* 한 화면에 들어가도록 돌아가기와 보내기를 한 줄에 나란히 둔다 */}
      <View style={styles.buttons}>
        <Button style={styles.half} title="돌아가기" onPress={onCancel} />
        <Button
          style={styles.half}
          title={draft.error ? '다시 보내기' : '설명 보내기'}
          disabled={!draft.canSend}
          onPress={onSend}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    ...PAPER.option,
    flex: 1,
    alignItems: 'center',
  },
  selected: {
    backgroundColor: COLORS.primary,
  },
  input: {
    minHeight: 96,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  // 나란히 놓은 버튼이 폭을 반씩 나눈다
  half: {
    flex: 1,
  },
  // 큰 흰 원 녹음 버튼(가로 중앙). 그림자 자리 3을 아래에 비워 둔다.
  recordButton: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: RECORD_BUTTON_SIZE,
    height: RECORD_BUTTON_SIZE,
    marginBottom: SIZES.button.shadow,
    borderRadius: RECORD_BUTTON_SIZE / 2,
    borderWidth: SIZES.button.border,
    borderColor: COLORS.outline,
    backgroundColor: COLORS.card,
    ...hardShadow(SIZES.button.shadow),
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: FEEDBACK.record,
  },
  pause: {
    flexDirection: 'row',
    gap: 8,
  },
  pauseBar: {
    width: 8,
    height: 28,
    borderRadius: 2,
    backgroundColor: COLORS.text,
  },
});
