import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { LoadingView } from '@/components/ui/LoadingView';
import { Button } from '@/components/ui/Button';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSelectedFolder } from '@/features/folder/SelectedFolder';
import {
  InfoPanel,
  MaterialsPanel,
  PodcastPanel,
  QuizPanel,
  StudyPanel,
} from '@/features/folder/SubjectTabPanels';
import { PANEL_MARGIN, SubjectTabBar } from '@/features/folder/SubjectTabBar';
import { TAB_COLORS, type SubjectTabId } from '@/features/folder/subjectTabColors';
import { COLORS, RADIUS, SIZES } from '@/theme/assetTokens';

// L-02 과목 상세. 세로 탭 라벨과 하단 버튼은 고정이고 내용(종이)만 스크롤된다.
export function SubjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { folders, select } = useSelectedFolder();
  const [tab, setTab] = useState<SubjectTabId>('info');

  if (!folders) {
    return <LoadingView />;
  }
  const folder = folders.find((f) => f.id === id);
  if (!folder) {
    return (
      <BottomActionLayout
        actions={
          <Button variant="primary" title="과목 서랍으로" onPress={() => router.dismissTo('/subjects')} />
        }
      >
        {/* 주소로 바로 들어오거나 새로고침하면 과목이 없을 수 있다 */}
        <EmptyState error title="과목을 찾을 수 없어요." />
      </BottomActionLayout>
    );
  }

  // 이 과목을 고른 과목으로 바꾸고 공부 준비로 간다. 홈의 과목 선택도 이 과목으로 바뀐다.
  const startStudy = () => {
    select(folder.id);
    router.push('/session/setup');
  };

  return (
    <BottomActionLayout
      gutter={SIZES.gutter}
      side={<SubjectTabBar value={tab} onChange={setTab} />}
      scrollStyle={[styles.panel, { backgroundColor: TAB_COLORS[tab].paper }]}
      actions={
        <>
          <Button variant="primary" title="이 과목 공부하기" onPress={startStudy} />
          <Button
            icon="plus"
            title="자료 추가"
            onPress={() => router.push({ pathname: '/subjects/[id]/materials', params: { id: folder.id } })}
          />
        </>
      }
    >
      <Stack.Screen options={{ title: folder.name }} />

      {tab === 'info' ? <InfoPanel folder={folder} /> : null}
      {tab === 'materials' ? <MaterialsPanel folder={folder} /> : null}
      {tab === 'study' ? <StudyPanel folder={folder} /> : null}
      {tab === 'quiz' ? <QuizPanel folder={folder} /> : null}
      {tab === 'podcast' ? <PodcastPanel folder={folder} /> : null}
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  // 왼쪽 모서리를 둥글게 하고, 얇은 테두리로 종이가 겹친 느낌을 준다. 오른쪽에는 세로 탭이 붙는다.
  panel: {
    marginLeft: PANEL_MARGIN,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderTopLeftRadius: RADIUS.large,
    borderBottomLeftRadius: RADIUS.large,
  },
});
