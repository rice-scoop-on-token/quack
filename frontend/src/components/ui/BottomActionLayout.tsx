import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
  // 하단에 고정할 버튼. 여러 개면 넣은 순서대로 세로로 쌓인다.
  actions: ReactNode;
  // 내용이 짧으면 세로 중앙에 둔다. 길면 그대로 스크롤된다.
  centered?: boolean;
  // 하단 탭 안의 화면이면 true. 탭 바가 홈 바 영역을 맡으므로 그만큼 띄우지 않는다.
  inTab?: boolean;
};

// 화면 내용은 위에서 스크롤되고, 다음 단계 버튼은 화면 맨 아래에 고정되는 레이아웃이다.
export function BottomActionLayout({ children, actions, centered = false, inTab = false }: Props) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();

  return (
    <View style={styles.screen}>
      {/* 스크롤되는 화면 내용 */}
      <ScrollView contentContainerStyle={[styles.content, centered && styles.centered]}>
        {children}
      </ScrollView>

      {/* 하단 고정 버튼 영역 */}
      {/* 키보드가 열려 있으면 키보드 높이만큼, 아니면 아이폰 홈 바 영역만큼 띄운다.
          키보드가 홈 바 영역을 덮으므로 둘을 더하지 않는다. */}
      <View
        style={[styles.actions, { paddingBottom: (inTab ? keyboardHeight : Math.max(keyboardHeight, insets.bottom)) + 12 }]}
      >
        {actions}
      </View>
    </View>
  );
}

// KeyboardAvoidingView는 Stack 헤더 높이만큼 보정해야 하는데, 그 값을 주는 useHeaderHeight가
// expo-router 공개 API에 없어서 키보드 높이를 직접 받는다.
// ponytail: 화면 아래 끝이 창 아래 끝이라고 가정한다. 하단 탭 안에서 쓰면 탭 높이만큼 더 올라가니 그때 탭 높이를 빼야 한다.
// 확인 필요(Android 실기기): edge-to-edge에서 키보드가 열릴 때 창 크기도 줄어든다면 여백이 두 번 들어가 버튼이 키보드보다 높이 뜬다.
// 그렇다면 Android에서는 이 값을 쓰지 않는다.
function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // iOS는 키보드가 움직이기 전(will)에 알려 줘서 버튼이 키보드와 함께 올라간다. Android에는 did 이벤트만 있다.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    gap: 12,
    padding: 24,
  },
  // flexGrow로 스크롤 영역을 화면 높이만큼 채워야 그 안에서 세로 중앙에 둘 수 있다
  centered: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  actions: {
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
});
