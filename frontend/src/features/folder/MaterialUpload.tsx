import type { Folder, Material } from '@quack/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import { COLORS, PAPER } from '@/theme/assetTokens';
import { FolderCard } from '@/components/ui/FolderCard';
import { Button } from '@/components/ui/Button';
import { useApiQuery, useQuackApi } from '@/api';
import { useDemoVariant } from '@/api/mock/useDemoVariant';

const STATUS_LABEL: Record<Material['status'], string> = {
  uploaded: '올리는 중',
  processing: '읽는 중',
  ready: '등록 완료',
  failed: '읽기 실패',
};

// 자료 추가. 온보딩 마지막 단계(O-04)와 과목 상세의 자료 추가에서 같이 쓴다.
// 버튼은 모두 화면 하단 고정 영역에 두므로, 본문(MaterialUploadBody)과 버튼(MaterialUploadActions)을 나눴다.
export function useMaterialUpload(folder: Folder) {
  const api = useQuackApi();
  const materials = useApiQuery((a) => a.listMaterials(), []);
  const demo = useDemoVariant();
  const folderMaterials = (materials ?? []).filter((m) => m.folder_id === folder.id);
  const loading = demo === 'loading' || folderMaterials.some((m) => m.status === 'processing');
  const failed = demo === 'error' || folderMaterials.some((m) => m.status === 'failed');

  // 한계: 실제 파일 선택이 없어서 누를 때마다 번호를 붙인 샘플 자료를 넣는다. 파일 선택을 붙일 때 고른 파일의 종류와 이름을 쓴다.
  async function upload() {
    const material = await api.createMaterial({
      folder_id: folder.id,
      kind: 'pdf',
      title: `샘플자료_${folderMaterials.length + 1}.pdf`,
    });
    await api.processMaterial(material.id);
  }

  return { folder, folderMaterials, loading, failed, upload };
}

type UploadState = ReturnType<typeof useMaterialUpload>;

type BodyProps = {
  state: UploadState;
  // 넘기면 과목 카드 아래에 "나중에 추가할게요"를 보여 준다. 온보딩에서만 쓴다.
  onSkip?: () => void;
};

// 자료 추가 본문(제목, 과목 카드, 나중에 추가하기, 처리 상태, 등록한 자료 목록)
export function MaterialUploadBody({ state, onSkip }: BodyProps) {
  return (
    <View style={styles.container}>
      <ScreenTitle title="공부할 자료가 있나요?" subtitle="자료를 더하면 배운 내용을 바탕으로 질문해요. 지금은 건너뛰어도 괜찮아요." />

      <View style={styles.card}>
        <Text>{state.folder.name}</Text>
        <Text>과목 폴더</Text>
      </View>
      {onSkip ? (
        // 온보딩 화면 설계대로 하단 영역이 아니라 본문에 작은 글씨로 둔다
        <Pressable style={styles.skipButton} onPress={onSkip} accessibilityRole="button">
          <Text style={styles.skip}>나중에 추가할게요</Text>
        </Pressable>
      ) : null}
      <Text>PDF · 텍스트 · 이미지 자료를 올릴 수 있어요.</Text>

      {state.loading ? (
        <FolderCard>
          <View style={styles.inner}>
            <Text>자료에서 텍스트를 읽고 있어요…</Text>
            <Spinner />
          </View>
        </FolderCard>
      ) : null}

      {state.failed ? (
        <FolderCard>
          <EmptyState error title="자료를 읽지 못했어요." message="텍스트가 있는 파일로 다시 시도해 주세요." />
        </FolderCard>
      ) : null}

      {state.folderMaterials.map((m) => (
        <FolderCard key={m.id}>
          <View style={styles.inner}>
            <Text style={styles.title}>{m.title}</Text>
            <Text style={styles.status}>{STATUS_LABEL[m.status]}</Text>
          </View>
        </FolderCard>
      ))}
    </View>
  );
}

// 자료 추가 버튼들. 각 화면이 하단 고정 영역에서 자기 다음 버튼(완료 등) 위에 놓는다.
export function MaterialUploadActions({ state }: { state: UploadState }) {
  return (
    <>
      {state.failed ? <Button title="다른 자료 선택" onPress={() => router.setParams({ demo: undefined })} /> : null}
      <Button title="자료 업로드" onPress={state.upload} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  // 과목 폴더 안내 카드
  card: {
    ...PAPER.card,
    gap: 4,
  },
  inner: {
    gap: 4,
  },
  title: {
    fontWeight: '700',
  },
  status: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSub,
  },
  // 버튼이 가로 전체로 늘어나지 않게 하고 가로 중앙에 둔다
  skipButton: {
    alignSelf: 'center',
  },
  skip: {
    fontSize: 12,
    color: COLORS.textSub,
  },
});
