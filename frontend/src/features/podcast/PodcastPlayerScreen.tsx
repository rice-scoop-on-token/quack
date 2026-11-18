import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingView } from '@/components/ui/LoadingView';
import { Text } from '@/components/ui/Text';
import { COLORS, FONT, PAPER } from '@/theme/assetTokens';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
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
    return podcast === null ? <EmptyState error title="팟캐스트를 찾을 수 없어요." /> : <LoadingView />;
  }
  const folder = folders.find((f) => f.id === podcast.folder_id);
  if (!folder) {
    return <EmptyState error title="과목을 찾을 수 없어요." />;
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
          <Button variant="primary" title="홈으로" onPress={() => router.dismissTo('/home')} />
        ) : (
          <Button
            variant="primary"
            icon={playing ? 'pause' : 'play'}
            title={playing ? '일시정지' : '재생'}
            onPress={() => setPlaying((p) => !p)}
          />
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

      <View style={styles.controls}>
        <View style={styles.control}>
          <IconButton icon="rewind-15" label="15초 뒤로" onPress={() => seek(-SKIP_SECONDS)} />
          <Text style={styles.caption}>15초 뒤로</Text>
        </View>
        <View style={styles.control}>
          {/* 속도는 숫자가 곧 뜻이라 아이콘 없이 글자로 둔다 */}
          <Button variant="small" title={`${speed}×`} onPress={nextSpeed} style={styles.speed} />
          <Text style={styles.caption}>속도</Text>
        </View>
        <View style={styles.control}>
          <IconButton icon="forward-15" label="15초 앞으로" onPress={() => seek(SKIP_SECONDS)} />
          <Text style={styles.caption}>15초 앞으로</Text>
        </View>
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
    height: 14,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: 7,
    backgroundColor: COLORS.cream,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  control: {
    alignItems: 'center',
    gap: 4,
  },
  // 속도 버튼 높이(40)를 아이콘 버튼 몸통(44)에 맞춘다
  speed: {
    alignSelf: 'center',
    minWidth: 64,
    marginTop: 2,
  },
  caption: {
    ...FONT.caption,
    color: COLORS.textSub,
  },
  // 문구·결과가 바뀌어도 아래가 밀리지 않도록 최소 높이를 잡는다
  panel: {
    ...PAPER.card,
    gap: 8,
    minHeight: 120,
  },
});
