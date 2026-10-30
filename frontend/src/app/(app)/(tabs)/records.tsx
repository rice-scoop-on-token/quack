import { StyleSheet, Text, View } from 'react-native';

// R-01 학습 달력 (2차). 화면 내용은 다음 커밋에서 채운다.
export default function RecordsTab() {
  return (
    <View style={styles.container}>
      {/* 화면 이름 (임시) */}
      <Text>기록</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
