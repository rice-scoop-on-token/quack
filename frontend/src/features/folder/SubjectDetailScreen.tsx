import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTempStore } from '@/api/mock/tempStore';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CharacterGrowth } from '@/features/character/CharacterGrowth';
import { TeacherSummary } from '@/features/character/TeacherSummary';
import { buildReport } from '@/features/review/report';

const STATUS_LABEL = {
  uploaded: '올리는 중',
  processing: '읽는 중',
  ready: '처리 완료 · 학습에 활용 가능',
  failed: '읽기 실패',
} as const;

// L-02 과목·자료 상세
export function SubjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { folders, materials, sessions, deleteFolder, setSelectedFolderId } = useTempStore();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const folder = folders.find((f) => f.id === id);

  if (!folder) {
    return (
      <BottomActionLayout
        actions={
          // 과목 서랍으로 가는 버튼
          <Button title="과목 서랍으로" onPress={() => router.dismissTo('/subjects')} />
        }
      >
        {/* 과목 없음 안내 (주소로 바로 들어오거나 새로고침한 경우) */}
        <Text>과목을 찾을 수 없어요.</Text>
      </BottomActionLayout>
    );
  }

  const folderMaterials = materials.filter((m) => m.folder_id === folder.id);
  // 이 과목의 지난 학습. 최근 것부터
  const folderSessions = sessions
    .filter((s) => s.folder_id === folder.id)
    .sort((a, b) => (b.ended_at ?? '').localeCompare(a.ended_at ?? ''));

  const addMaterials = () =>
    router.push({ pathname: '/subjects/[id]/materials', params: { id: folder.id } });

  // 이 과목을 고른 과목으로 바꾸고 공부 준비로 간다. 홈의 과목 선택도 이 과목으로 바뀐다.
  const startStudy = () => {
    setSelectedFolderId(folder.id);
    router.push('/session/setup');
  };

  const handleDelete = () => {
    // QuackApi 교체 지점: folders에서 이 행을 지운다. 캐릭터와 경험치 내역은 DB가 함께 지운다.
    deleteFolder(folder.id);
    setConfirmingDelete(false);
    router.dismissTo('/subjects');
  };

  return (
    <BottomActionLayout
      actions={
        <>
          {/* 이 과목 공부하기 버튼 */}
          <Button title="이 과목 공부하기" onPress={startStudy} />
          {/* 자료 추가 버튼 */}
          <Button title="+ 자료 추가" onPress={addMaterials} />
          {/* 과목 삭제 버튼 */}
          <Button title="과목 삭제" onPress={() => setConfirmingDelete(true)} />
        </>
      }
    >
      {/* 상단 헤더 제목을 과목 이름으로 바꾼다 */}
      <Stack.Screen options={{ title: folder.name }} />

      {/* 선생님 소개 카드 (선생님은 바꿀 수 없어서 성격만 보여 준다) */}
      <TeacherSummary folder={folder} />

      {/* 과목 이름 */}
      <Text>나의 과목</Text>
      <Text>{folder.name}</Text>

      {/* 캐릭터와 성장 표시 */}
      <CharacterGrowth folder={folder} />

      {/* 학습 자료 제목 */}
      <Text>학습 자료</Text>
      {folderMaterials.length === 0 ? (
        // 자료 없음 안내
        <Text style={styles.card}>등록된 자료가 없어요. 자료 없이도 설명하며 공부할 수 있어요.</Text>
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

      {/* 학습 리포트 제목 */}
      <Text>학습 리포트</Text>
      {folderSessions.length === 0 ? (
        // 학습 기록 없음 안내
        <Text>아직 학습 기록이 없어요.</Text>
      ) : (
        // 지난 학습 리포트 목록 (누르면 설명 내용과 퀴즈 다시 풀기)
        folderSessions.map((s) => (
          // 학습 리포트 항목
          <Pressable
            key={s.id}
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: '/subjects/[id]/sessions/[sessionId]',
                params: { id: folder.id, sessionId: s.id },
              })
            }
            accessibilityRole="button"
          >
            <Text>{s.goal}</Text>
            <Text>
              {s.ended_at ? new Date(s.ended_at).toLocaleDateString() : ''} · {Math.floor(s.study_seconds / 60)}분 · 개념{' '}
              {buildReport(s).covered_concepts.length}개
            </Text>
          </Pressable>
        ))
      )}

      {/* 과목 삭제 확인 창 */}
      <ConfirmDialog
        visible={confirmingDelete}
        title={`'${folder.name}' 과목을 삭제할까요?`}
        message="이 과목의 캐릭터와 성장 기록도 함께 사라져요. 자료와 공부 기록도 모두 지워지고 되돌릴 수 없어요."
        confirmLabel="삭제"
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 4,
    padding: 12,
    borderWidth: 1,
  },
});
