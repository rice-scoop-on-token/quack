import { Button, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { ExplainDraft, InputMode } from '@/features/session/hooks/useExplainDraft';

const TABS: { mode: InputMode; label: string }[] = [
  { mode: 'chat', label: '글로 설명' },
  { mode: 'voice', label: '말로 설명' },
];

// 설명 입력(글·말 탭, 녹음 상태, 입력란). 녹음·보내기 버튼은 하단 고정 영역에 두므로 아래 ExplainActions로 나눴다.
export function ExplainInput({ draft }: { draft: ExplainDraft }) {
  return (
    <View style={styles.container}>
      {/* 글·말 입력 방식 탭 */}
      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((tab) => (
          // 입력 방식 탭 버튼
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

      {draft.mode === 'voice' ? (
        // 녹음 영역 (실제 마이크를 쓰지 않는 mock)
        <View style={styles.recorder}>
          {/* 녹음 상태 표시 (녹음 버튼은 하단에 있다) */}
          <Text accessibilityLiveRegion="polite">{draft.recording ? '● 듣는 중…' : '준비되면 말해 주세요.'}</Text>
          {/* mock 안내 */}
          <Text>실제 마이크는 쓰지 않아요. 멈추면 예시 전사문이 채워져요.</Text>
        </View>
      ) : null}

      {/* 입력란 제목 (말로 설명하면 전사문을 고칠 수 있다) */}
      <Text>{draft.mode === 'voice' ? '전사문 확인·수정' : '나의 설명'}</Text>
      {/* 설명 입력창 */}
      <TextInput
        style={styles.input}
        value={draft.text}
        onChangeText={draft.setText}
        multiline
        editable={!draft.recording}
        placeholder="배운 개념을 내 말로 설명해 보세요."
      />
      {/* 분석 실패 문구 (입력한 설명은 그대로 남는다) */}
      {draft.error ? <Text accessibilityRole="alert">{draft.error}</Text> : null}
    </View>
  );
}

// 설명 입력의 하단 버튼(말 탭이면 녹음 시작·멈춤, 보내기). 실패했으면 보내기가 "다시 보내기"가 된다.
// 녹음 버튼은 하단 영역 맨 위에 둬서 위쪽 전사문 블록과 아래 설명 보내기 버튼 사이에 온다.
export function ExplainActions({ draft, onSend }: { draft: ExplainDraft; onSend: () => void }) {
  return (
    <>
      {/* 녹음 시작·멈춤 원형 버튼 (말로 설명할 때만) */}
      {draft.mode === 'voice' ? (
        <Pressable
          style={styles.recordButton}
          onPress={draft.toggleRecording}
          accessibilityRole="button"
          accessibilityLabel={draft.recording ? '녹음 멈추기' : '녹음 시작'}
        >
          <Text>{draft.recording ? '멈추기' : '녹음'}</Text>
        </Pressable>
      ) : null}
      {/* 보내기 버튼 (빈 입력이거나 녹음 중이면 비활성) */}
      <Button title={draft.error ? '다시 보내기' : '설명 보내기'} disabled={!draft.canSend} onPress={onSend} />
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
    flex: 1,
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
  },
  // 고른 탭 강조 (임시 스타일)
  selected: {
    borderWidth: 3,
  },
  // 원형 녹음 버튼 (가로 중앙)
  recordButton: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
  },
  recorder: {
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
  },
  input: {
    minHeight: 96,
    borderWidth: 1,
    padding: 12,
  },
});
