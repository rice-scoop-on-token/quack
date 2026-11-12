import { router } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { NewFolderFields } from '@/features/folder/NewFolderFields';
import { useNewFolderForm } from '@/features/folder/useNewFolderForm';

// 과목 추가: 과목 이름과 선생님을 한 화면에서 정한다
export function NewSubjectScreen() {
  const form = useNewFolderForm();

  async function handleSubmit() {
    const folder = await form.submit();
    if (!folder) {
      return;
    }
    // 프로토타입 흐름대로 자료 추가를 거친다. 추가 화면은 뒤로 가기로 돌아오지 않게 바꾼다.
    router.replace({ pathname: '/subjects/[id]/materials', params: { id: folder.id, from: 'new' } });
  }

  return (
    <BottomActionLayout
      actions={
        <Button variant="primary" title="과목 만들기" onPress={handleSubmit} />
      }
    >
      <NewFolderFields form={form} />
    </BottomActionLayout>
  );
}
