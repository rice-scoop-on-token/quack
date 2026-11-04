import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';

const LINE_HEIGHT = 20;
// 선생님마다 말 길이가 달라도 아래 요소가 밀리지 않게 3줄 높이를 늘 잡아 둔다. 3줄을 넘는 말만 늘어난다.
const MIN_LINES = 3;
const PADDING = 12;
const BORDER = 1;

type Props = {
  children: ReactNode;
};

// 캐릭터 말풍선. 첫 과목 만들기와 타이머 화면에서 같이 쓴다.
export function SpeechBubble({ children }: Props) {
  return (
    <Text style={styles.bubble} accessibilityLiveRegion="polite">
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  // 말풍선 자리가 보이도록 테두리만 둔다 (임시 스타일, 디자인 작업 때 바꾼다)
  bubble: {
    alignSelf: 'stretch',
    lineHeight: LINE_HEIGHT,
    minHeight: LINE_HEIGHT * MIN_LINES + (PADDING + BORDER) * 2,
    padding: PADDING,
    borderWidth: BORDER,
  },
});
