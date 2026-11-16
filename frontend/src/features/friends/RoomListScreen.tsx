import type { SpeciesId } from '@quack/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useApiQuery } from '@/api';
import { useDemoVariant } from '@/api/mock/useDemoVariant';
import type { GrowthStage, TempRoom } from '@/api/tempContract';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { LoadingView } from '@/components/ui/LoadingView';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { Text } from '@/components/ui/Text';
import { myRoomIds } from '@/features/friends/matchMyRooms';
import { COLORS, FONT, hardShadow, SIZES } from '@/theme/assetTokens';

const AVATAR_SIZE = 32;

// F-02 통화방 목록. 같은 자료를 공부하는 친구들의 방이 자료마다 하나씩 있다.
// 내가 올린 자료의 방은 위에 "내 자료의 방"으로 모으고, 나머지는 "다른 방"에 둔다(들어갈 수 있다).
export function RoomListScreen() {
  const demo = useDemoVariant();
  const rooms = useApiQuery((a) => a.listRooms(), []);
  const folders = useApiQuery((a) => a.listFolders(), []);
  const materials = useApiQuery((a) => a.listMaterials(), []);

  if (demo === 'error' || rooms === null) {
    return (
      <BottomActionLayout
        actions={<Button variant="primary" title="다시 시도" onPress={() => router.setParams({ demo: undefined })} />}
      >
        <EmptyState error title="통화방을 불러오지 못했어요." message="잠시 뒤에 다시 시도해 주세요." />
      </BottomActionLayout>
    );
  }
  if (demo === 'loading' || !rooms || !folders || !materials) {
    return <LoadingView />;
  }

  const mineIds = myRoomIds(rooms, folders, materials);
  // 참가자가 많은 방이 위에 온다
  const byCrowd = (a: TempRoom, b: TempRoom) => b.participants.length - a.participants.length;
  const mine = rooms.filter((r) => mineIds.has(r.id)).sort(byCrowd);
  const others = rooms.filter((r) => !mineIds.has(r.id)).sort(byCrowd);

  // ?demo=permission 같은 값은 화면 주소마다 따로라서 방 주소에도 넘긴다
  const enter = (roomId: string) => router.push({ pathname: '/rooms', params: demo ? { roomId, demo } : { roomId } });

  return (
    <BottomActionLayout actions={null}>
      <ScreenTitle title="통화방" subtitle="같은 자료를 공부하는 친구들과 이야기해요." />

      <Text style={styles.section}>내 자료의 방</Text>
      {mine.length === 0 ? (
        <EmptyState title="내 자료와 같은 방이 아직 없어요." message="자료를 올리면 같은 자료의 방이 여기에 보여요." />
      ) : (
        mine.map((r) => <RoomCard key={r.id} room={r} onPress={() => enter(r.id)} />)
      )}

      <Text style={styles.section}>다른 방</Text>
      {others.map((r) => (
        <RoomCard key={r.id} room={r} onPress={() => enter(r.id)} />
      ))}
    </BottomActionLayout>
  );
}

function RoomCard({ room, onPress }: { room: TempRoom; onPress: () => void }) {
  const count = room.participants.length;
  const label = `${room.material_title}, ${room.subject_name}, ${count === 0 ? '아직 아무도 없어요' : `${count}명`}`;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {/* 눌리면 Button처럼 그림자를 빼고 그만큼 내려서 눌린 느낌을 준다 */}
      {({ pressed }) => (
        <Card style={[styles.room, pressed && { transform: [{ translateY: SIZES.card.shadow }], ...hardShadow(0) }]}>
          <Text style={styles.title}>{room.material_title}</Text>
          <Text style={styles.subject}>{room.subject_name}</Text>
          <View style={styles.people}>
            {count === 0 ? (
              <Text style={styles.subject}>아직 아무도 없어요.</Text>
            ) : (
              <>
                {room.participants.map((p) => (
                  <Avatar key={p.id} speciesId={p.species_id} stage={p.stage} />
                ))}
                <Text style={styles.count}>{count}명</Text>
                {room.participants.some((p) => p.mic_on) ? <Icon name="mic-on" /> : null}
              </>
            )}
          </View>
        </Card>
      )}
    </Pressable>
  );
}

function Avatar({ speciesId, stage }: { speciesId: SpeciesId; stage: GrowthStage }) {
  return (
    <View style={styles.avatar}>
      <CharacterBox speciesId={speciesId} stage={stage} size={AVATAR_SIZE} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    ...FONT.heading,
  },
  room: {
    gap: 4,
  },
  title: {
    ...FONT.body,
    fontWeight: '700',
  },
  subject: {
    ...FONT.caption,
    color: COLORS.textSub,
  },
  people: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: AVATAR_SIZE,
    marginTop: 4,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: COLORS.cream,
  },
  count: {
    ...FONT.caption,
    marginLeft: 4,
  },
});
