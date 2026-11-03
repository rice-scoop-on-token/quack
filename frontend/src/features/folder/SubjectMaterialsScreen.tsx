import type { Folder } from '@quack/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Text } from 'react-native';

import { useTempStore } from '@/api/mock/tempStore';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { MaterialUploadActions, MaterialUploadBody, useMaterialUpload } from '@/features/folder/MaterialUpload';

// 과목 상세(L-02)와 과목 추가에서 들어오는 자료 추가 화면
export function SubjectMaterialsScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { folders } = useTempStore();
  const folder = folders.find((f) => f.id === id);

  // 과목 추가에서 왔으면 과목 서랍으로 간다. dismissTo는 이 화면을 스택에서 빼므로 뒤로 가기로 돌아오지 않는다.
  // 과목 상세에서 왔으면 과목 상세로 돌아간다.
  function done() {
    if (from === 'new') {
      router.dismissTo('/subjects');
    } else {
      router.back();
    }
  }

  if (!folder) {
    return <MissingFolder />;
  }
  return <MaterialsForm folder={folder} onDone={done} />;
}

// 자료 추가 본문과 하단 버튼. 훅(useMaterialUpload)이 과목을 받아야 해서 과목이 있을 때만 그린다.
function MaterialsForm({ folder, onDone }: { folder: Folder; onDone: () => void }) {
  const upload = useMaterialUpload(folder);
  return (
    <BottomActionLayout
      actions={
        <>
          <MaterialUploadActions state={upload} />
          <Button title="완료" onPress={onDone} />
        </>
      }
    >
      <MaterialUploadBody state={upload} />
    </BottomActionLayout>
  );
}

// 과목 없음 안내 (주소로 바로 들어오거나 새로고침한 경우)
function MissingFolder() {
  return (
    <BottomActionLayout
      actions={
        <Button title="과목 서랍으로" onPress={() => router.dismissTo('/subjects')} />
      }
    >
      <Text>과목을 찾을 수 없어요.</Text>
    </BottomActionLayout>
  );
}
