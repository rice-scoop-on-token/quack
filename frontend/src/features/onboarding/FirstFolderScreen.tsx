import { router } from 'expo-router';
import { Button, Text } from 'react-native';

import { NewFolderFields } from '@/features/folder/NewFolderFields';
import { useNewFolderForm } from '@/features/folder/useNewFolderForm';
import { OnboardingStepLayout } from '@/features/onboarding/OnboardingStepLayout';

// O-03 첫 과목 만들기 (과목 이름 + 선생님 선택)
export function FirstFolderScreen() {
  const form = useNewFolderForm();

  async function handleSubmit() {
    const folder = await form.submit();
    if (folder) {
      router.push({ pathname: '/materials', params: { folderId: folder.id } });
    }
  }

  return (
    <OnboardingStepLayout
      step={3}
      actions={
        <Button title="첫 과목 만들기" onPress={handleSubmit} />
      }
    >
      <Text>첫 번째 공부를 담을 서랍을 만들어요.</Text>
      <Text>과목마다 다른 선생님과 공부할 수 있어요.</Text>

      <NewFolderFields form={form} />
    </OnboardingStepLayout>
  );
}
