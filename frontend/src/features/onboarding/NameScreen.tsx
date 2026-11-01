import { router } from 'expo-router';
import { useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { useTempStore } from '@/api/mock/tempStore';

// O-05 이름 입력 (프로토타입에 없는 화면)
export function NameScreen() {
  const { displayName, setDisplayName } = useTempStore();
  const [name, setName] = useState(displayName);
  const [error, setError] = useState('');

  function handleNext() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('이름을 입력해 주세요.');
      return;
    }
    // QuackApi 교체 지점: profiles.display_name 에 저장한다.
    setDisplayName(trimmed);
    router.push('/character');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 온보딩 단계 표시 */}
      <Text>2 / 5</Text>
      {/* 화면 제목과 설명 */}
      <Text>뭐라고 부르면 될까요?</Text>
      <Text>선생님이 이 이름으로 불러 줘요.</Text>

      {/* 입력창 제목 */}
      <Text>이름 (필수)</Text>
      {/* 이름 입력창 */}
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="예: 꽥꽥이" />
      {/* 입력 오류 문구 */}
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}

      {/* 익명 로그인 안내: 계정 없이 기기에만 묶여 있어서 앱을 지우면 되찾을 방법이 없다 */}
      <Text>로그인 없이 바로 시작해요. 앱을 삭제하면 이름과 공부 기록이 모두 사라져요.</Text>

      {/* 다음 버튼 */}
      <Button title="다음" onPress={handleNext} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    padding: 24,
  },
  input: {
    borderWidth: 1,
    padding: 12,
  },
});
