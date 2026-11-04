import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Button, Pressable, StyleSheet, Text, View } from 'react-native';

import { useApiQuery } from '@/api';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { growthFromXp } from '@/features/character/growth';
import { SCREEN_ACTIONS } from '@/features/character/screenActions';
import { useCharacterXp } from '@/features/character/useCharacterXp';
import { useSelectedFolder } from '@/features/folder/SelectedFolder';

const CHARACTER_SIZE = 120;
const SKIP_SECONDS = 15;
const SPEEDS = [1, 1.5, 2];
// 한계: 실제 오디오가 없어서 진행 바만 흐른다. 시연에서 12분이 약 24초에 끝나도록 30배로 돌린다.
const DEMO_SPEEDUP = 30;
const TICK_MS = 250;

const clock = (seconds: number) => {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// P-02 AI 팟캐스트 듣기
export function PodcastPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const podcast = useApiQuery((a) => a.getPodcast(id), [id]);
  const { folders } = useSelectedFolder();
  const xp = useCharacterXp(podcast?.folder_id ?? '');

  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const total = (podcast?.minutes ?? 0) * 60;
  const finished = total > 0 && pos >= total;

  useEffect(() => {
    if (!playing) {
      return;
    }
    const timer = setInterval(() => setPos((p) => p + (TICK_MS / 1000) * DEMO_SPEEDUP * speed), TICK_MS);
    return () => clearInterval(timer);
  }, [playing, speed]);

  useEffect(() => {
    if (pos >= total && total > 0) {
      setPos(total);
      setPlaying(false);
    }
  }, [pos, total]);

  // 다른 화면으로 가면 멈춘다
  useFocusEffect(useCallback(() => () => setPlaying(false), []));

  if (!podcast || !folders) {
    return podcast === null ? <Text>팟캐스트를 찾을 수 없어요.</Text> : null;
  }
  const folder = folders.find((f) => f.id === podcast.folder_id);
  if (!folder) {
    return <Text>과목을 찾을 수 없어요.</Text>;
  }

  const stage = xp === undefined ? undefined : growthFromXp(xp).stage;
  const action = playing ? SCREEN_ACTIONS.podcastPlaying : SCREEN_ACTIONS.podcastPaused;
  const lineIndex = Math.min(podcast.lines.length - 1, Math.floor((pos / total) * podcast.lines.length));
  const seek = (delta: number) => setPos((p) => Math.min(total, Math.max(0, p + delta)));
  const nextSpeed = () => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length]);
  return (
    <BottomActionLayout
      actions={
        finished ? (
          <Button title="홈으로" onPress={() => router.dismissTo('/home')} />
        ) : (
          <Button title={playing ? '일시정지' : '재생'} onPress={() => setPlaying((p) => !p)} />
        )
      }
    >
      <Text>{podcast.title}</Text>

      <View style={styles.character}>
        <CharacterBox speciesId={folder.species_id} stage={stage} size={CHARACTER_SIZE} action={action} />
      </View>

      <View
        style={styles.bar}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: total, now: Math.round(pos) }}
      >
        <View style={[styles.fill, { width: `${(pos / total) * 100}%` }]} />
      </View>
      <View style={styles.row}>
        <Text>{clock(pos)}</Text>
        <Text>{clock(total)}</Text>
      </View>

      <View style={styles.row}>
        <Pressable style={styles.control} onPress={() => seek(-SKIP_SECONDS)} accessibilityRole="button">
          <Text>-15초</Text>
        </Pressable>
        <Pressable style={styles.control} onPress={nextSpeed} accessibilityRole="button">
          <Text>{speed}×</Text>
        </Pressable>
        <Pressable style={styles.control} onPress={() => seek(SKIP_SECONDS)} accessibilityRole="button">
          <Text>+15초</Text>
        </Pressable>
      </View>

      {/* 대화 문구와 완료 결과는 같은 자리를 쓴다 */}
      <View style={styles.panel}>
        {finished ? (
          <>
            <Text>듣기 완료!</Text>
            <Text>{podcast.minutes}분 팟캐스트를 끝까지 들었어요.</Text>
          </>
        ) : (
          <Text accessibilityLiveRegion="polite">{podcast.lines[lineIndex]}</Text>
        )}
      </View>
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  character: {
    height: CHARACTER_SIZE,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    height: 12,
    borderWidth: 1,
  },
  // 채운 부분이 보이도록 임시 배경색 하나만 둔다. 디자인 작업 때 바꾼다.
  fill: {
    height: '100%',
    backgroundColor: '#888',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  control: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
  },
  // 문구·결과가 바뀌어도 아래가 밀리지 않도록 최소 높이를 잡는다
  panel: {
    gap: 8,
    minHeight: 120,
  },
});
