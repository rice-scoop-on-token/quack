import type { SpeciesId } from '@quack/shared';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useApiQuery } from '@/api';
import { useDemoVariant } from '@/api/mock/useDemoVariant';
import type { GrowthStage } from '@/api/tempContract';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { Button } from '@/components/ui/Button';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { LoadingView } from '@/components/ui/LoadingView';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { Text } from '@/components/ui/Text';
import { growthFromXp } from '@/features/character/growth';
import { useCharacterXp } from '@/features/character/useCharacterXp';
import { useSelectedFolder } from '@/features/folder/SelectedFolder';
import { findMyFolder } from '@/features/friends/matchMyRooms';
import { COLORS, FEEDBACK } from '@/theme/assetTokens';

const AVATAR_SIZE = 80;
// 말하는 링 자리. 링은 늘 이 두께로 잡아 두고 색만 바꿔서, 말하는 사람이 바뀌어도 크기와 이름 위치가 변하지 않는다.
const RING = 4;
const SPEAKER_CHANGE_MS = 2500;

type Participant = { id: string; name: string; species_id: SpeciesId; stage: GrowthStage | undefined; micOn: boolean };

// 방 목록으로 돌아간다. 주소로 바로 들어와 돌아갈 화면이 없으면 친구 탭으로 간다.
function leave() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/friends');
  }
}

// F-03 통화방. 같은 자료를 공부하는 친구들이 함께 있는 방 하나다.
// 한계: 실제 통화와 마이크를 쓰지 않는다. 말하는 사람은 시연용으로 2~3초마다 마이크가 켜진 사람 사이에서 바뀌고, 나갈 때 기록은 남기지 않는다.
export function RoomScreen({ roomId }: { roomId: string }) {
  const demo = useDemoVariant();
  const { folders, selected } = useSelectedFolder();
  const room = useApiQuery((a) => a.getRoom(roomId), [roomId]);
  const profile = useApiQuery((a) => a.getProfile(), []);
  // 내 캐릭터는 이 방 과목과 이름이 같은 내 폴더의 동물이다. 없으면 홈에서 고른 과목을 쓴다.
  const myFolder = (room && folders ? findMyFolder(room, folders) : undefined) ?? selected;
  const xp = useCharacterXp(myFolder?.id ?? '');
  // 입장할 때 마이크는 꺼져 있다. ?demo=permission이면 권한이 없어 듣기 모드로만 들어온다.
  const [micOn, setMicOn] = useState(false);
  const listenOnly = demo === 'permission';
  const [speakerId, setSpeakerId] = useState<string | null>(null);

  const participants: Participant[] = [
    {
      id: 'me',
      name: profile?.display_name ?? '나',
      species_id: myFolder?.species_id ?? 'rubber_duck',
      stage: xp === undefined ? undefined : growthFromXp(xp).stage,
      micOn,
    },
    ...(room?.participants ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      species_id: p.species_id,
      stage: p.stage,
      micOn: p.mic_on,
    })),
  ];
  // 마이크가 켜진 사람만 말한다. 켜진 사람이 없는 방에서는 말하는 사람이 없다.
  const speakableKey = participants.filter((p) => p.micOn).map((p) => p.id).join(',');

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

  if (demo === 'error' || room === null) {
    const notFound = demo !== 'error';
    return (
      <BottomActionLayout
        actions={
          <Button
            variant="primary"
            title={notFound ? '목록으로' : '다시 시도'}
            onPress={notFound ? leave : () => router.setParams({ demo: undefined })}
          />
        }
      >
        <EmptyState
          error
          title={notFound ? '통화방을 찾을 수 없어요.' : '통화방을 불러오지 못했어요.'}
          message={notFound ? undefined : '잠시 뒤에 다시 시도해 주세요.'}
        />
      </BottomActionLayout>
    );
  }
  if (demo === 'loading' || !room || folders === undefined) {
    return <LoadingView />;
  }

  return (
    <BottomActionLayout
      actions={
        <>
          <Button
            variant="primary"
            icon={micOn ? 'mic-on' : 'mic-off'}
            title={listenOnly ? '듣기 모드 (마이크 권한 꺼짐)' : micOn ? '마이크 끄기' : '마이크 켜기'}
            disabled={listenOnly}
            onPress={() => setMicOn((on) => !on)}
          />
          <Button title="나가기" onPress={leave} />
        </>
      }
    >
      <Stack.Screen options={{ title: room.material_title }} />
      <ScreenTitle title={room.material_title} subtitle={`${room.subject_name} · ${participants.length}명이 함께해요`} />

      {listenOnly ? <Text>마이크 권한이 꺼져 있어 듣기 모드로 입장했어요.</Text> : null}
      {room.participants.length === 0 ? (
        <EmptyState title="같은 자료를 공부하는 친구가 아직 없어요." message="친구가 들어오면 여기에 보여요." />
      ) : null}

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
              <Icon name={p.micOn ? 'mic-on' : 'mic-off'} tint={p.micOn ? COLORS.text : COLORS.textSub} />
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
  speaking: {
    borderColor: FEEDBACK.speaking,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: COLORS.cream,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 24,
  },
});
