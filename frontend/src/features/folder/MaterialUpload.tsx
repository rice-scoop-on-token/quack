import type { Folder, Material } from '@quack/shared';
import { router } from 'expo-router';
import { ActivityIndicator, Button, Pressable, StyleSheet, Text, View } from 'react-native';

import { TEMP_USER_ID, tempId, useTempStore } from '@/api/mock/tempStore';
import { useDemoVariant } from '@/api/mock/useDemoVariant';

const STATUS_LABEL: Record<Material['status'], string> = {
  uploaded: '올리는 중',
  processing: '읽는 중',
  ready: '등록 완료',
  failed: '읽기 실패',
};

type Props = {
  folder: Folder;
  // 넘기면 업로드 버튼 아래에 "나중에 추가할게요"를 보여 준다. 온보딩에서만 쓴다.
  onSkip?: () => void;
};

// 자료 추가. 온보딩 마지막 단계(O-04)와 과목 상세의 자료 추가에서 같이 쓴다.
// 완료·건너뛰기 버튼은 화면마다 다음 이동이 달라서 각 화면의 하단 고정 영역에 둔다.
export function MaterialUpload({ folder, onSkip }: Props) {
  const { materials, addMaterial, setMaterialStatus } = useTempStore();
  const demo = useDemoVariant();
  const folderMaterials = materials.filter((m) => m.folder_id === folder.id);
  const loading = demo === 'loading' || folderMaterials.some((m) => m.status === 'processing');
  const failed = demo === 'error' || folderMaterials.some((m) => m.status === 'failed');

  // 실제 파일 선택 교체 지점: 파일을 고르게 하고, Storage 업로드 후 POST /materials/:id/process 를 호출한다.
  // ponytail: supabase 구현이 아직 없어 mock 모드인지 검사하지 않고 항상 가짜 자료를 넣는다.
  function upload() {
    const material: Material = {
      id: tempId(),
      user_id: TEMP_USER_ID,
      folder_id: folder.id,
      kind: 'pdf',
      // 누를 때마다 하나씩 추가되도록 번호를 붙인다
      title: `샘플자료_${folderMaterials.length + 1}.pdf`,
      storage_path: null,
      status: 'processing',
      key_concepts: [],
      error_message: null,
      created_at: new Date().toISOString(),
    };
    addMaterial(material);
    // 서버가 자료를 읽는 시간을 흉내 낸다
    setTimeout(() => setMaterialStatus(material.id, 'ready'), 800);
  }

  return (
    <View style={styles.container}>
      {/* 화면 제목과 설명 */}
      <Text>공부할 자료가 있나요?</Text>
      <Text>자료를 더하면 배운 내용을 바탕으로 질문해요. 지금은 건너뛰어도 괜찮아요.</Text>

      {/* 자료를 넣을 과목 카드 */}
      <View style={styles.card}>
        <Text>{folder.name}</Text>
        <Text>과목 폴더</Text>
      </View>

      {/* 자료 업로드 버튼 */}
      <Button title="자료 업로드" onPress={upload} />
      {onSkip ? (
        // 나중에 추가하기 버튼 (작은 글씨)
        <Pressable onPress={onSkip} accessibilityRole="button">
          <Text style={styles.skip}>나중에 추가할게요</Text>
        </Pressable>
      ) : null}
      {/* 자료 형식 안내 */}
      <Text>PDF · 텍스트 · 이미지 자료를 올릴 수 있어요.</Text>

      {/* 자료 처리 중 상태 */}
      {loading ? (
        <View style={styles.card}>
          <Text>자료에서 텍스트를 읽고 있어요…</Text>
          <ActivityIndicator />
        </View>
      ) : null}

      {/* 자료 처리 실패 상태 */}
      {failed ? (
        <View style={styles.card}>
          <Text accessibilityRole="alert">
            자료를 읽지 못했어요. 텍스트가 있는 파일로 다시 시도해 주세요.
          </Text>
          {/* 다른 자료 선택 버튼 */}
          <Button title="다른 자료 선택" onPress={() => router.setParams({ demo: undefined })} />
        </View>
      ) : null}

      {/* 등록한 자료 목록 */}
      {folderMaterials.map((m) => (
        // 자료 항목
        <View key={m.id} style={styles.card}>
          <Text>{m.title}</Text>
          <Text>{STATUS_LABEL[m.status]}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  card: {
    gap: 4,
    padding: 12,
    borderWidth: 1,
  },
  skip: {
    fontSize: 12,
  },
});
