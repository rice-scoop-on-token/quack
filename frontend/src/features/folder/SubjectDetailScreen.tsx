import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SPECIES } from '@/api/mock/data/species';
import { useTempStore } from '@/api/mock/tempStore';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CharacterGrowth } from '@/features/character/CharacterGrowth';

const STATUS_LABEL = {
  uploaded: '올리는 중',
  processing: '읽는 중',
  ready: '처리 완료 · 학습에 활용 가능',
  failed: '읽기 실패',
} as const;

// L-02 과목·자료 상세
export function SubjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { folders, materials, deleteFolder } = useTempStore();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const folder = folders.find((f) => f.id === id);

  if (!folder) {
    return (
      <View style={styles.container}>
        {/* 과목 없음 안내 (주소로 바로 들어오거나 새로고침한 경우) */}
        <Text>과목을 찾을 수 없어요.</Text>
        {/* 과목 서랍으로 가는 버튼 */}
        <Button title="과목 서랍으로" onPress={() => router.dismissTo('/subjects')} />
      </View>
    );
  }

  const species = SPECIES.find((s) => s.id === folder.species_id);
  const folderMaterials = materials.filter((m) => m.folder_id === folder.id);

  const addMaterials = () =>
    router.push({ pathname: '/subjects/[id]/materials', params: { id: folder.id } });

  const handleDelete = () => {
    // QuackApi 교체 지점: folders에서 이 행을 지운다. 캐릭터와 경험치 내역은 DB가 함께 지운다.
    deleteFolder(folder.id);
    setConfirmingDelete(false);
    router.dismissTo('/subjects');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 상단 헤더 제목을 과목 이름으로 바꾼다 */}
      <Stack.Screen options={{ title: folder.name }} />

      {/* 선생님 요약 (선생님 소개 카드는 다음 커밋에서 만든다) */}
      <Text>
        {folder.name} 선생님 · {species?.name}
      </Text>
      <Text>{species?.description}</Text>

      {/* 과목 이름 */}
      <Text>나의 과목</Text>
      <Text>{folder.name}</Text>

      {/* 캐릭터와 성장 표시 */}
      <CharacterGrowth folder={folder} />

      {/* 이 과목 공부하기 버튼 (공부 준비 화면은 다음 커밋에서 만든다) */}
      <Button title="이 과목 공부하기 (준비 중)" disabled onPress={() => {}} />

      {/* 학습 자료 제목과 자료 추가 버튼 */}
      <View style={styles.row}>
        <Text>학습 자료</Text>
        <Button title="+ 자료 추가" onPress={addMaterials} />
      </View>
      {folderMaterials.length === 0 ? (
        // 자료 없음 안내
        <View style={styles.card}>
          <Text>등록된 자료가 없어요. 자료 없이도 설명하며 공부할 수 있어요.</Text>
          {/* 자료 추가 버튼 */}
          <Button title="자료 추가" onPress={addMaterials} />
        </View>
      ) : (
        // 학습 자료 목록
        folderMaterials.map((m) => (
          // 자료 항목
          <View key={m.id} style={styles.card}>
            <Text>{m.title}</Text>
            <Text>{STATUS_LABEL[m.status]}</Text>
          </View>
        ))
      )}

      {/* 최근 학습 목록 (세션 기록은 다음 커밋에서 연결한다) */}
      <Text>최근 학습</Text>
      <Text>아직 학습 기록이 없어요.</Text>

      {/* 과목 삭제 버튼 */}
      <Button title="과목 삭제" onPress={() => setConfirmingDelete(true)} />

      {/* 과목 삭제 확인 창 */}
      <ConfirmDialog
        visible={confirmingDelete}
        title={`'${folder.name}' 과목을 삭제할까요?`}
        message="이 과목의 캐릭터와 성장 기록도 함께 사라져요. 자료도 모두 지워지고 되돌릴 수 없어요."
        confirmLabel="삭제"
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    padding: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  card: {
    gap: 4,
    padding: 12,
    borderWidth: 1,
  },
});
