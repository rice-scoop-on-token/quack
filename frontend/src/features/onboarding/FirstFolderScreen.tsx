import { router } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';

import { CharacterBox } from '@/components/ui/CharacterBox';
import { NewFolderFields } from '@/features/folder/NewFolderFields';
import { useNewFolderForm } from '@/features/folder/useNewFolderForm';
import { OnboardingStepLayout } from '@/features/onboarding/OnboardingStepLayout';

// O-03 첫 과목 만들기 (과목 이름 + 선생님 선택)
export function FirstFolderScreen() {
  const form = useNewFolderForm();

  function handleSubmit() {
    const folder = form.submit();
    if (folder) {
      router.push({ pathname: '/materials', params: { folderId: folder.id } });
    }
  }

  return (
    <OnboardingStepLayout
      step={3}
      actions={
        // 과목 만들기 버튼
        <Button title="첫 과목 만들기" onPress={handleSubmit} />
      }
    >
      {/* 화면 제목과 설명 */}
      <Text>첫 번째 공부를 담을 서랍을 만들어요.</Text>
      <Text>과목마다 다른 선생님과 공부할 수 있어요.</Text>

      {/* 고른 선생님 캐릭터와 말풍선 */}
      <View style={styles.character}>
        <Text>어떤 이야기를 배우게 될까?</Text>
        <CharacterBox speciesId={form.speciesId} stage="baby" />
      </View>

      {/* 새 과목 입력 본문 */}
      <NewFolderFields form={form} />
    </OnboardingStepLayout>
  );
}

const styles = StyleSheet.create({
  character: {
    alignItems: 'center',
    gap: 8,
  },
});
