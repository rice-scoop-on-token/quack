import { router } from 'expo-router';
import { useState } from 'react';
import type { Folder } from '@quack/shared';

import { LoadingView } from '@/components/ui/LoadingView';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { Text } from '@/components/ui/Text';
import { SIZES } from '@/theme/assetTokens';
import { Button } from '@/components/ui/Button';
import { useApiQuery, useQuackApi } from '@/api';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SubjectCard } from '@/features/folder/SubjectCard';

// L-01 과목 서랍
export function SubjectListScreen() {
  const api = useQuackApi();
  const [deleting, setDeleting] = useState<Folder | null>(null);
  const folders = useApiQuery((a) => a.listFolders(), []);
  const materials = useApiQuery((a) => a.listMaterials(), []);
  if (!folders || !materials) {
    return <LoadingView />;
  }

  return (
    <BottomActionLayout
      inTab
      gutter={SIZES.gutter}
      actions={
        <Button variant="primary"
          title={folders.length === 0 ? '첫 과목 만들기' : '+ 과목 추가'}
          onPress={() => router.push('/subjects/new')}
        />
      }
    >
      <ScreenTitle title="나의 과목 서랍" subtitle="배운 것들이 차곡차곡 쌓이는 곳." />

      <Text>전체 {folders.length}개</Text>

      {folders.length === 0 ? (
        <EmptyState title="아직 비어 있는 서랍이에요" message="첫 과목부터 함께 만들어 볼까요?" />
      ) : (
        // 과목 카드 목록
        folders.map((f) => (
          <SubjectCard
            key={f.id}
            folder={f}
            detail={`자료 ${materials.filter((m) => m.folder_id === f.id).length}개`}
            onPress={() => router.push({ pathname: '/subjects/[id]', params: { id: f.id } })}
            onDelete={() => setDeleting(f)}
          />
        ))
      )}

      <ConfirmDialog
        visible={deleting !== null}
        title={`'${deleting?.name}' 과목을 삭제할까요?`}
        message="이 과목의 캐릭터와 성장 기록도 함께 사라져요. 자료와 공부 기록도 모두 지워지고 되돌릴 수 없어요."
        confirmLabel="삭제"
        onConfirm={async () => {
          // 삭제 버튼이 두 번 눌려도 한 번만 지우도록 창을 먼저 닫는다
          if (!deleting) {
            return;
          }
          setDeleting(null);
          await api.deleteFolder(deleting.id);
        }}
        onCancel={() => setDeleting(null)}
      />
    </BottomActionLayout>
  );
}

