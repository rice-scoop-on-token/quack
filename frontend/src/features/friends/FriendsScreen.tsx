import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LoadingView } from '@/components/ui/LoadingView';
import { COLORS, FONT, RADIUS, SIZES } from '@/theme/assetTokens';
import { Card } from '@/components/ui/Card';
import { summarizeToday } from '@/features/home/todaySummary';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useApiQuery } from '@/api';
import { useDemoVariant } from '@/api/mock/useDemoVariant';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { CharacterBox } from '@/components/ui/CharacterBox';

// 카드 속 캐릭터 슬롯 크기. 동물·단계와 상관없이 고정한다.
const CHARACTER_SIZE = 64;

// 초 → HH:MM:SS
function hms(total: number): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(total / 3600))}:${p(Math.floor((total % 3600) / 60))}:${p(total % 60)}`;
}

// F-01 친구. 친구 한 명이 카드 하나인 3열 격자다.
export function FriendsScreen() {
  const demo = useDemoVariant();
  const friends = useApiQuery((a) => a.listFriends(), []);
  const sessions = useApiQuery((a) => a.listSessions(), []);
  const folders = useApiQuery((a) => a.listFolders(), []);
  // 화면이 보이는 동안 1초마다 올라가고, 화면을 떠나면 멈춘다. 공부 중인 친구의 시간만 이만큼 더한다.
  // 한계: 시간이 올라가는 것은 시연용 흉내다. 실제 시간은 서버가 알려 줘야 한다.
  const [elapsed, setElapsed] = useState(0);
  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
      return () => clearInterval(timer);
    }, []),
  );

  if (!friends) {
    return <LoadingView />;
  }

  // 홈의 오늘 기록과 같은 계산이다. 조회가 끝나기 전이나 실패했을 때는 카드를 숨겨서 0이 잠깐 보이지 않게 한다.
  // 한계: 지금 진행 중인 세션은 끝나야(ended_at이 생겨야) 합산된다. 그래서 공부하는 동안에는 이 값이 올라가지 않는다.
  const myToday = sessions && folders ? summarizeToday(sessions, folders, new Date()).totalSeconds : null;

  return (
    <BottomActionLayout
      inTab
      gutter={SIZES.gutter}
      actions={
        <>
          {/* ?demo=permission 같은 값은 화면 주소마다 따로라서 통화방 주소에도 넘긴다 */}
          <Button variant="primary"
            title="통화방 입장"
            onPress={() => router.push({ pathname: '/rooms', params: demo ? { demo } : {} })}
          />
          <Button title="조용히 공부하기" onPress={() => router.push('/quiet')} />
        </>
      }
    >
      <ScreenTitle title="친구" subtitle="함께 공부하는 친구들이에요." />

      {myToday === null ? null : (
        // 친구 카드의 "공부 중 = 노랑 / 쉬는 중 = 회색" 규칙과 헷갈리지 않게 바탕은 카드색 그대로 둔다
        <Card
          style={styles.mine}
          accessible
          accessibilityLabel={`나의 오늘 공부 시간, ${Math.floor(myToday / 3600)}시간 ${Math.floor((myToday % 3600) / 60)}분 ${myToday % 60}초`}
        >
          <Text style={styles.mineLabel}>나의 오늘 공부</Text>
          <Text style={styles.mineValue}>{hms(myToday)}</Text>
        </Card>
      )}

      {friends.length === 0 ? (
        <EmptyState title="아직 친구가 없어요." message="친구가 생기면 여기에서 공부 중인지 볼 수 있어요." />
      ) : (
        // 친구가 많으면 아래로 스크롤된다
        <View style={styles.grid}>
          {friends.map((f) => (
            <View key={f.id} style={styles.cell}>
              <View
                style={[styles.card, f.studying ? styles.studying : styles.resting]}
                accessible
                accessibilityLabel={`${f.name}, ${f.studying ? f.subject : '쉬는 중'}, ${hms(f.today_seconds + (f.studying ? elapsed : 0))}`}
              >
                <Text numberOfLines={1}>{f.studying ? f.subject : '쉬는 중'}</Text>
                {/* 시트 재생 없이 기본 그림만 쓴다 */}
                <CharacterBox speciesId={f.species_id} stage={f.stage} size={CHARACTER_SIZE} />
                <Text>{hms(f.today_seconds + (f.studying ? elapsed : 0))}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  mine: {
    gap: 2,
  },
  mineLabel: {
    ...FONT.caption,
    color: COLORS.mutedStrong,
  },
  mineValue: {
    ...FONT.title,
  },
  // 3열: 칸마다 좌우 4씩 띄우고 격자 전체를 그만큼 당겨 가장자리를 맞춘다
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  cell: {
    width: `${100 / 3}%`,
    padding: 4,
  },
  card: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: RADIUS.large,
  },
  studying: {
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.outline,
  },
  resting: {
    backgroundColor: COLORS.disabledBg,
    borderWidth: 2,
    borderColor: COLORS.textSub,
    opacity: 0.85,
  },
});
