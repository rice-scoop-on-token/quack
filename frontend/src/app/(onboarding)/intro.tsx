import { Button, StyleSheet, Text, View } from 'react-native';

import { useTempStore } from '@/api/mock/tempStore';

// O-01 소개. 지금은 접근 가드 확인용 임시 화면이고, 온보딩 커밋에서 실제 화면으로 바꾼다.
export default function IntroScreen() {
  const { setOnboarded } = useTempStore();

  return (
    <View style={styles.container}>
      {/* 화면 이름 (임시) */}
      <Text>온보딩 (임시)</Text>
      {/* 온보딩 완료 버튼 (임시) */}
      <Button title="온보딩 완료" onPress={() => setOnboarded(true)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
});
