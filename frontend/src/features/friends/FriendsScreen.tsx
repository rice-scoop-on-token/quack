import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { COLORS, SIZES } from '@/theme/assetTokens';
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
    return null;
  }

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
      {friends.length === 0 ? (
        <Text>아직 친구가 없어요.</Text>
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
    borderRadius: 16,
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
