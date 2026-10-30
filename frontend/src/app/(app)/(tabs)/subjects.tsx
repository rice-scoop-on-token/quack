import { StyleSheet, Text, View } from 'react-native';

// L-01 과목 서랍. 화면 내용은 다음 커밋에서 채운다.
export default function SubjectsTab() {
  return (
    <View style={styles.container}>
      {/* 화면 이름 (임시) */}
      <Text>과목</Text>
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
