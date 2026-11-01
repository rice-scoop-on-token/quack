import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTempStore } from '@/api/mock/tempStore';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { FolderNameForm } from '@/features/folder/FolderNameForm';

// O-03 첫 과목 만들기
export function FirstFolderScreen() {
  const { draftSpeciesId, folders, createFolder } = useTempStore();

  function handleSubmit(name: string) {
    // QuackApi 교체 지점: folders에 과목과 선생님 동물을 함께 저장한다.
    const folder = createFolder(name, draftSpeciesId);
    router.push({ pathname: '/materials', params: { folderId: folder.id } });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 온보딩 단계 표시 */}
      <Text>4 / 5</Text>
      {/* 화면 제목과 설명 */}
      <Text>첫 번째 공부를 담을 서랍을 만들어요.</Text>
      <Text>과목별로 자료와 학습 기록을 모아둘게요.</Text>

      {/* 선생님 캐릭터와 말풍선 */}
      <View style={styles.character}>
        <Text>어떤 이야기를 배우게 될까?</Text>
        <CharacterBox speciesId={draftSpeciesId} stage="baby" />
      </View>

      {/* 과목 이름 입력 폼 */}
      <FolderNameForm
        existingNames={folders.map((f) => f.name)}
        submitLabel="과목 만들기"
        onSubmit={handleSubmit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    padding: 24,
  },
  character: {
    alignItems: 'center',
    gap: 8,
  },
});
