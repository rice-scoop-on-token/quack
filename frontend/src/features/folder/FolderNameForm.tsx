import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';

const MAX_LENGTH = 30;

type Props = {
  // 같은 이름의 과목을 막기 위해 이미 있는 과목 이름을 받는다
  existingNames: string[];
  submitLabel: string;
  onSubmit: (name: string) => void;
};

// 과목 이름 입력. 첫 과목 만들기(O-03)와 과목 추가에서 같이 쓴다.
export function FolderNameForm({ existingNames, submitLabel, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('과목 이름을 입력해 주세요.');
      return;
    }
    // 대소문자만 다른 이름도 같은 과목으로 본다
    if (existingNames.some((n) => n.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) {
      setError('이미 있는 과목이에요. 다른 이름을 입력해 주세요.');
      return;
    }
    setError('');
    onSubmit(trimmed);
  }

  return (
    <View style={styles.form}>
      {/* 입력창 제목 */}
      <Text>과목 이름 (필수)</Text>
      {/* 과목 이름 입력창 */}
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        maxLength={MAX_LENGTH}
        placeholder="예: 컴퓨터 네트워크"
      />
      {/* 입력 오류 문구 */}
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      {/* 입력 규칙 안내 */}
      <Text>공백만 입력할 수 없어요. 최대 {MAX_LENGTH}자예요.</Text>
      {/* 과목 만들기 버튼 */}
      <Button title={submitLabel} onPress={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    padding: 12,
  },
});
