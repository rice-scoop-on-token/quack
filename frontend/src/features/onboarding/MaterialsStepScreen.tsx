import type { Folder } from '@quack/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Text } from 'react-native';

import { useTempStore } from '@/api/mock/tempStore';
import { MaterialUploadActions, MaterialUploadBody, useMaterialUpload } from '@/features/folder/MaterialUpload';
import { OnboardingStepLayout } from '@/features/onboarding/OnboardingStepLayout';

// O-04 자료 추가 (온보딩 마지막 단계)
export function MaterialsStepScreen() {
  const { folderId } = useLocalSearchParams<{ folderId?: string }>();
  const { folders } = useTempStore();
  const folder = folders.find((f) => f.id === folderId);

  if (!folder) {
    return (
      <OnboardingStepLayout
        step={4}
        actions={
          // 과목 만들기로 돌아가는 버튼
          <Button title="과목 만들러 가기" onPress={() => router.replace('/subject')} />
        }
      >
        {/* 과목 없음 안내 (주소로 바로 들어오거나 새로고침한 경우) */}
        <Text>자료를 넣을 과목이 없어요. 과목을 먼저 만들어 주세요.</Text>
      </OnboardingStepLayout>
    );
  }

  return <MaterialsStep folder={folder} />;
}

// 자료 추가 본문과 하단 버튼. 훅(useMaterialUpload)이 과목을 받아야 해서 과목이 있을 때만 그린다.
function MaterialsStep({ folder }: { folder: Folder }) {
  const { materials, setOnboarded } = useTempStore();
  const upload = useMaterialUpload(folder);
  // 읽기를 마친 자료가 있어야 그 자료로 공부를 시작할 수 있다
  const hasReadyMaterial = materials.some((m) => m.folder_id === folder.id && m.status === 'ready');

  // 온보딩을 마치면 (onboarding) 레이아웃이 홈으로 보낸다.
  // QuackApi 교체 지점: profiles.onboarding_completed_at 을 저장한다.
  function finish() {
    setOnboarded(true);
  }

  return (
    <OnboardingStepLayout
      step={4}
      actions={
        <>
          {/* 자료 업로드 버튼 */}
          <MaterialUploadActions state={upload} />
          {/* 완료 버튼 (등록된 자료가 있어야 누를 수 있다) */}
          <Button title="이제 시작할게요" disabled={!hasReadyMaterial} onPress={finish} />
        </>
      }
    >
      {/* 자료 추가 영역 (과목 카드 아래에 나중에 추가하기) */}
      <MaterialUploadBody state={upload} onSkip={finish} />
    </OnboardingStepLayout>
  );
}
