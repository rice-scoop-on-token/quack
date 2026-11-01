import { router } from 'expo-router';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTempStore } from '@/api/mock/tempStore';
import { SubjectCard } from '@/features/folder/SubjectCard';

// L-01 과목 서랍
export function SubjectListScreen() {
  const { folders, materials } = useTempStore();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 화면 제목과 설명 */}
      <Text>나의 과목 서랍</Text>
      <Text>배운 것들이 차곡차곡 쌓이는 곳.</Text>

      {/* 과목 수와 과목 추가 버튼 */}
      <View style={styles.row}>
        <Text>전체 {folders.length}개</Text>
        <Button title="+ 과목 추가" onPress={() => router.push('/subjects/new')} />
      </View>

      {folders.length === 0 ? (
        // 과목 없음 안내
        <View style={styles.empty}>
          <Text>아직 비어 있는 서랍이에요</Text>
          <Text>첫 과목부터 함께 만들어 볼까요?</Text>
          {/* 첫 과목 만들기 버튼 */}
          <Button title="첫 과목 만들기" onPress={() => router.push('/subjects/new')} />
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
  empty: {
    alignItems: 'center',
    gap: 8,
    padding: 24,
  },
});
