import { router } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';

import { useApiQuery } from '@/api';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { SubjectCard } from '@/features/folder/SubjectCard';

// L-01 과목 서랍
export function SubjectListScreen() {
  const folders = useApiQuery((api) => api.listFolders(), []);
  const materials = useApiQuery((api) => api.listMaterials(), []);
  if (!folders || !materials) {
    return null;
  }

  return (
    <BottomActionLayout
      inTab
      actions={
        <Button
          title={folders.length === 0 ? '첫 과목 만들기' : '+ 과목 추가'}
          onPress={() => router.push('/subjects/new')}
        />
      }
    >
      <Text>나의 과목 서랍</Text>
      <Text>배운 것들이 차곡차곡 쌓이는 곳.</Text>

      <Text>전체 {folders.length}개</Text>

      {folders.length === 0 ? (
        <View style={styles.empty}>
          <Text>아직 비어 있는 서랍이에요</Text>
          <Text>첫 과목부터 함께 만들어 볼까요?</Text>
        </View>
      ) : (
        // 과목 카드 목록
        folders.map((f) => (
          <SubjectCard
            key={f.id}
            folder={f}
            detail={`자료 ${materials.filter((m) => m.folder_id === f.id).length}개`}
            onPress={() => router.push({ pathname: '/subjects/[id]', params: { id: f.id } })}
          />
        ))
      )}
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    gap: 8,
    padding: 24,
  },
});
