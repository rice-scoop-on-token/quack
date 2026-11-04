import type { SpeciesId } from '@quack/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { useApiQuery } from '@/api';
import { useDemoVariant } from '@/api/mock/useDemoVariant';
import type { GrowthStage } from '@/api/tempContract';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { growthFromXp } from '@/features/character/growth';
import { useCharacterXp } from '@/features/character/useCharacterXp';
import { useSelectedFolder } from '@/features/folder/SelectedFolder';

const AVATAR_SIZE = 80;
// 말하는 링 자리. 링은 늘 이 두께로 잡아 두고 색만 바꿔서, 말하는 사람이 바뀌어도 크기와 이름 위치가 변하지 않는다.
const RING = 4;
const SPEAKER_CHANGE_MS = 2500;

type Participant = { id: string; name: string; species_id: SpeciesId; stage: GrowthStage | undefined; micOn: boolean };

// F-03 통화방. 친구들이 함께 있는 방 하나다.
// 한계: 실제 통화와 마이크를 쓰지 않는다. 말하는 사람은 시연용으로 2~3초마다 바뀌고, 나갈 때 기록은 남기지 않는다.
export function RoomScreen() {
  const demo = useDemoVariant();
  const { selected } = useSelectedFolder();
  const friends = useApiQuery((a) => a.listFriends(), []);
  const profile = useApiQuery((a) => a.getProfile(), []);
  const xp = useCharacterXp(selected?.id ?? '');
  // 입장할 때 마이크는 꺼져 있다. ?demo=permission이면 권한이 없어 듣기 모드로만 들어온다.
  const [micOn, setMicOn] = useState(false);
  const listenOnly = demo === 'permission';
  const [speakerId, setSpeakerId] = useState<string | null>(null);

  const participants: Participant[] = [
    {
      id: 'me',
      name: profile?.display_name ?? '나',
      species_id: selected?.species_id ?? 'rubber_duck',
      stage: xp === undefined ? undefined : growthFromXp(xp).stage,
      micOn,
    },
    // 친구는 짝수 번째만 마이크가 켜져 있는 것으로 둔다
    ...(friends ?? []).map((f, i) => ({
      id: f.id,
      name: f.name,
      species_id: f.species_id,
      stage: f.stage,
      micOn: i % 2 === 0,
    })),
  ];
  // 마이크가 켜진 사람만 말한다. 나는 내가 마이크를 켠 동안만 가끔 말한다.
  const speakable = participants.filter((p) => p.micOn).map((p) => p.id);
  const speakableKey = speakable.join(',');

  // 화면이 보이는 동안만 2~3초마다 말하는 사람을 바꾼다
  useFocusEffect(
    useCallback(() => {
      const ids = speakableKey ? speakableKey.split(',') : [];
      const timer = setInterval(() => {
        setSpeakerId((prev) => {
          const others = ids.filter((id) => id !== prev);
          return others.length === 0 ? null : others[Math.floor(Math.random() * others.length)];
        });
      }, SPEAKER_CHANGE_MS);
      return () => {
        clearInterval(timer);
        setSpeakerId(null);
      };
    }, [speakableKey]),
  );

  if (!friends) {
    return null;
  }

  return (
    <BottomActionLayout
      actions={
        <>
          <Button variant="primary"
            title={listenOnly ? '듣기 모드 (마이크 권한 꺼짐)' : micOn ? '마이크 끄기' : '마이크 켜기'}
            disabled={listenOnly}
            onPress={() => setMicOn((on) => !on)}
          />
          <Button title="나가기" onPress={() => router.dismissTo('/friends')} />
        </>
      }
    >
      {/* 안내 자리는 늘 한 줄을 잡아 둔다 */}
      <Text>{listenOnly ? '마이크 권한이 꺼져 있어 듣기 모드로 입장했어요.' : ' '}</Text>

      <View style={styles.grid}>
        {participants.map((p) => (
          <View key={p.id} style={styles.cell}>
            <View
              style={[styles.ring, p.id === speakerId && styles.speaking]}
              accessible
              accessibilityLabel={`${p.name}${p.id === speakerId ? ', 말하는 중' : ''}${p.micOn ? '' : ', 마이크 꺼짐'}`}
            >
              <View style={styles.avatar}>
                <CharacterBox speciesId={p.species_id} stage={p.stage} size={AVATAR_SIZE} />
              </View>
            </View>
            <View style={styles.nameRow}>
              <Text numberOfLines={1}>{p.name}</Text>
              {p.micOn ? null : <Text style={styles.off}>🔇</Text>}
            </View>
          </View>
        ))}
      </View>
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  // 3열
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 16,
  },
  cell: {
    width: `${100 / 3}%`,
    alignItems: 'center',
    gap: 6,
  },
  ring: {
    width: AVATAR_SIZE + RING * 2,
    height: AVATAR_SIZE + RING * 2,
    borderRadius: (AVATAR_SIZE + RING * 2) / 2,
    borderWidth: RING,
    borderColor: 'transparent',
  },
  // 말하는 링 색은 임시다. 디자인 작업 때 바꾼다.
  speaking: {
    borderColor: '#2e9e4f',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#f0e6d2',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 20,
  },
  off: {
    fontSize: 12,
  },
});
