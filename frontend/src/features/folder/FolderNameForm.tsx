import { StyleSheet, Text, TextInput, View } from 'react-native';

const MAX_LENGTH = 30;

// 잘못된 이름이면 오류 문구를, 괜찮으면 빈 문자열을 돌려준다.
// 만들기 버튼은 화면 하단 고정 영역에 있어서, 버튼을 누를 때 화면이 이 함수로 검사한다.
export function validateFolderName(name: string, existingNames: string[]): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return '과목 이름을 입력해 주세요.';
  }
  // 대소문자만 다른 이름도 같은 과목으로 본다
  if (existingNames.some((n) => n.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) {
    return '이미 있는 과목이에요. 다른 이름을 입력해 주세요.';
  }
  return '';
}

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  error: string;
};

// 과목 이름 입력. 첫 과목 만들기(O-03)와 과목 추가에서 같이 쓴다.
export function FolderNameForm({ value, onChangeText, error }: Props) {
  return (
    <View style={styles.form}>
      {/* 입력창 제목 */}
      <Text>과목 이름 (필수)</Text>
      {/* 과목 이름 입력창 */}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        maxLength={MAX_LENGTH}
        placeholder="예: 컴퓨터 네트워크"
      />
      {/* 입력 오류 문구 */}
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
      {/* 입력 규칙 안내 */}
      <Text>공백만 입력할 수 없어요. 최대 {MAX_LENGTH}자예요.</Text>
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
