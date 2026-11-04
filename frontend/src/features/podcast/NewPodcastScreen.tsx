import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Pressable, StyleSheet, Text, View } from 'react-native';

import { useApiQuery, useQuackApi } from '@/api';
import { useDemoVariant } from '@/api/mock/useDemoVariant';
import type { TempPodcast } from '@/api/tempContract';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { useSelectedFolder } from '@/features/folder/SelectedFolder';
import { SubjectSelect } from '@/features/folder/SubjectSelect';
import { PodcastCreatingView } from '@/features/podcast/PodcastCreatingView';

const MINUTES: TempPodcast['minutes'][] = [5, 8, 12];

// P-01 AI 팟캐스트 만들기
export function NewPodcastScreen() {
  const api = useQuackApi();
  const demo = useDemoVariant();
  // 홈에서 고른 과목을 미리 채운다
  const { folders, selected, select } = useSelectedFolder();
  const materials = useApiQuery((a) => a.listMaterials(), []);
  // 자료는 여러 개 고를 수 있다
  const [materialIds, setMaterialIds] = useState<string[]>([]);
  const [minutes, setMinutes] = useState<TempPodcast['minutes']>(8);
  const [state, setState] = useState<'idle' | 'creating' | 'failed'>('idle');

  if (folders === undefined || !materials) {
    return null;
  }
  if (!selected) {
    return (
      <BottomActionLayout actions={<Button title="과목 만들기" onPress={() => router.replace('/subjects/new')} />}>
        <Text>팟캐스트를 만들 과목이 없어요. 과목을 먼저 만들어 주세요.</Text>
      </BottomActionLayout>
    );
  }

  // 처리가 끝난 자료만 팟캐스트로 만들 수 있다
  const ready = materials.filter((m) => m.folder_id === selected.id && m.status === 'ready');
  // 다른 과목으로 바꾸면 그 과목에 없는 자료는 빠진다
  const chosen = ready.filter((m) => materialIds.includes(m.id));
  const toggle = (id: string) =>
    setMaterialIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]));
  // ?demo=loading은 생성 중 화면에 머문다
  const creating = state === 'creating' || demo === 'loading';

  // retry: ?demo=error 실패 뒤 "다시 생성"은 실패 상태를 풀고 실제로 만든다
  async function create(retry = false) {
    if (chosen.length === 0) {
      return;
    }
    setState('creating');
    if (demo === 'error' && !retry) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setState('failed');
      return;
    }
    if (retry) {
      router.setParams({ demo: undefined });
    }
    try {
      const podcast = await api.createPodcast({ folder_id: selected!.id, material_ids: chosen.map((m) => m.id), minutes });
      router.replace({ pathname: '/podcasts/[id]', params: { id: podcast.id } });
    } catch {
      setState('failed');
    }
  }

  if (creating) {
    return <PodcastCreatingView folder={selected} />;
  }

  return (
    <BottomActionLayout
      actions={
        state === 'failed' ? (
          <Button title="다시 생성" onPress={() => create(true)} />
        ) : (
          <Button title="팟캐스트 만들기" disabled={chosen.length === 0} onPress={() => create()} />
        )
      }
    >
      <Text>공부할 과목</Text>
      <SubjectSelect folders={folders} value={selected} onChange={(f) => select(f.id)} />

      <Text>처리 완료된 자료 (여러 개 고를 수 있어요)</Text>
      {ready.length === 0 ? (
        <Text>처리가 끝난 자료가 없어요. 과목에 자료를 먼저 추가해 주세요.</Text>
      ) : (
        ready.map((m) => (
          <Pressable
            key={m.id}
            style={[styles.card, materialIds.includes(m.id) && styles.selected]}
            onPress={() => toggle(m.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: materialIds.includes(m.id) }}
          >
            <Text>{m.title}</Text>
          </Pressable>
        ))
      )}

      <Text>길이</Text>
      <View style={styles.row}>
        {MINUTES.map((m) => (
          <Pressable
            key={m}
            style={[styles.card, styles.minute, m === minutes && styles.selected]}
            onPress={() => setMinutes(m)}
            accessibilityRole="radio"
            accessibilityState={{ checked: m === minutes }}
          >
            <Text>{m}분</Text>
          </Pressable>
        ))}
      </View>

      {/* 상태 문구 자리는 늘 한 줄을 잡아 둔다 */}
      <Text accessibilityLiveRegion="polite">
        {state === 'failed' ? '팟캐스트를 만들지 못했어요. 고른 자료는 그대로예요. 다시 생성해 주세요.' : ' '}
      </Text>
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderWidth: 1,
  },
  // 고른 항목 강조 (임시 스타일)
  selected: {
    borderWidth: 3,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  minute: {
    flex: 1,
    alignItems: 'center',
  },
});
