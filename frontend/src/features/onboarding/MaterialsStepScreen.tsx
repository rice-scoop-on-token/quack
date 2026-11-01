import { router, useLocalSearchParams } from 'expo-router';
import { Button, ScrollView, StyleSheet, Text } from 'react-native';

import { useTempStore } from '@/api/mock/tempStore';
import { MaterialUpload } from '@/features/folder/MaterialUpload';

// O-04 자료 추가 (온보딩 마지막 단계)
export function MaterialsStepScreen() {
  const { folderId } = useLocalSearchParams<{ folderId?: string }>();
  const { folders, setOnboarded } = useTempStore();
  const folder = folders.find((f) => f.id === folderId);

  // 온보딩을 마치면 (onboarding) 레이아웃이 홈으로 보낸다.
  // QuackApi 교체 지점: profiles.onboarding_completed_at 을 저장한다.
  function finish() {
    setOnboarded(true);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 온보딩 단계 표시 */}
      <Text>5 / 5</Text>

      {folder ? (
        // 자료 추가 영역
        <MaterialUpload folder={folder} doneLabel="이제 시작하기" onDone={finish} onSkip={finish} />
      ) : (
        <>
          {/* 과목 없음 안내 (주소로 바로 들어오거나 새로고침한 경우) */}
          <Text>자료를 넣을 과목이 없어요. 과목을 먼저 만들어 주세요.</Text>
          {/* 과목 만들기로 돌아가는 버튼 */}
          <Button title="과목 만들러 가기" onPress={() => router.replace('/subject')} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    padding: 24,
  },
});
