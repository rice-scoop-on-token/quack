import type { SpeciesId } from '@quack/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { useApiQuery } from '@/api';
import { useDemoVariant } from '@/api/mock/useDemoVariant';
import type { GrowthStage, TempRoom } from '@/api/tempContract';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingView } from '@/components/ui/LoadingView';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { Text } from '@/components/ui/Text';
import { myRoomIds } from '@/features/friends/matchMyRooms';
import { ICONS } from '@/features/navigation/icons';
import { COLORS } from '@/theme/assetTokens';

const AVATAR_SIZE = 32;
// 한계: 참가자가 많은 방은 앞 사람 몇 명만 그리고 나머지는 "N명 참여 중"의 숫자로만 알린다.
const MAX_AVATARS = 4;
// 아무도 없는 방 카드 바탕. 토큰에 없는 색이라 여기에만 둔다.
const EMPTY_ROOM_BG = '#F4EEDC';

type Filter = 'mine' | 'all';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'mine', label: '내 자료의 방' },
];

// F-02 통화방 목록. 같은 자료를 공부하는 친구들의 방이 자료마다 하나씩 있다.
// 칩으로 "내 자료의 방"만 보거나 "전체"를 본다. 내 자료의 방이 하나도 없으면 전체로 시작한다.
export function RoomListScreen() {
  const demo = useDemoVariant();
  const rooms = useApiQuery((a) => a.listRooms(), []);
  const folders = useApiQuery((a) => a.listFolders(), []);
  const materials = useApiQuery((a) => a.listMaterials(), []);
  // 사용자가 칩을 누르기 전(null)에는 데이터에서 기본 칩을 정한다. 데이터가 늦게 와도 기본값이 맞게 하려고 상태로 두지 않는다.
  const [picked, setPicked] = useState<Filter | null>(null);

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
  const filter = picked ?? (mine.length > 0 ? 'mine' : 'all');
  const shown = filter === 'mine' ? mine : [...mine, ...others];

  // ?demo=permission 같은 값은 화면 주소마다 따로라서 방 주소에도 넘긴다
  const enter = (roomId: string) => router.push({ pathname: '/rooms', params: demo ? { roomId, demo } : { roomId } });

  return (
    <BottomActionLayout actions={null}>
      <ScreenTitle title="통화방" subtitle="같은 자료를 공부하는 친구들과 이야기해요." />

      <View style={styles.chips}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setPicked(f.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f.key }}
            style={[styles.chip, filter === f.key && styles.chipOn]}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextOn]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.help}>같은 과목, 같은 자료를 공부하는 친구가 있는 방이에요.</Text>

      {shown.length === 0 ? (
        <EmptyState title="내 자료와 같은 방이 아직 없어요." message="자료를 올리면 같은 자료의 방이 여기에 보여요." />
      ) : (
        shown.map((r) => <RoomCard key={r.id} room={r} isMine={mineIds.has(r.id)} onEnter={() => enter(r.id)} />)
      )}
    </BottomActionLayout>
  );
}

// 카드는 View이고, 안은 "왼쪽 본문(눌러서 입장) + 오른쪽 아래 입장 버튼"이다.
// 버튼이 눌리는 영역(Pressable) 안에 들어가지 않게 둘을 형제로 둔다.
// 한계: 스크린 리더에는 본문 버튼과 "입장" 버튼이 둘 다 읽힌다. Button이 접근성 라벨을 따로 받지 않아서 "입장"만 읽힌다.
function RoomCard({ room, isMine, onEnter }: { room: TempRoom; isMine: boolean; onEnter: () => void }) {
  const count = room.participants.length;
  const micOn = room.participants.filter((p) => p.mic_on).length;
  const micText = micOn === 0 ? '모두 마이크 끔' : `${micOn}명 마이크 켬`;
  const empty = count === 0;
  const label = [
    room.material_title,
    room.subject_name,
    isMine ? '내 자료' : null,
    empty ? '아직 아무도 없어요' : `${count}명 참여 중, ${micText}`,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Card style={[styles.room, empty && styles.roomEmpty]}>
      <Pressable
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
        onPress={onEnter}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View style={styles.tags}>
          <View style={[styles.tag, { backgroundColor: COLORS.cream }]}>
            <Text style={styles.tagText}>{room.subject_name}</Text>
          </View>
          {isMine ? (
            <View style={[styles.tag, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.tagText}>내 자료</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.title}>{room.material_title}</Text>

        {empty ? (
          <Text style={styles.sub}>아직 아무도 없어요</Text>
        ) : (
          <View style={styles.people}>
            <View style={styles.avatars}>
              {room.participants.slice(0, MAX_AVATARS).map((p, i) => (
                <Avatar key={p.id} speciesId={p.species_id} stage={p.stage} overlap={i > 0} />
              ))}
            </View>
            <View style={styles.peopleText}>
              <Text style={styles.count}>{count}명 참여 중</Text>
              <View style={styles.mic}>
                <Image
                  source={ICONS[micOn === 0 ? 'mic-off' : 'mic-on'].source}
                  style={styles.micIcon}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <Text style={styles.sub}>{micText}</Text>
              </View>
            </View>
          </View>
        )}
      </Pressable>

      <Button variant="small" title={empty ? '먼저 입장' : '입장'} onPress={onEnter} style={styles.enter} />
    </Card>
  );
}

function Avatar({ speciesId, stage, overlap }: { speciesId: SpeciesId; stage: GrowthStage; overlap: boolean }) {
  return (
    <View style={[styles.avatar, overlap && styles.avatarOverlap]}>
      <CharacterBox speciesId={speciesId} stage={stage} size={AVATAR_SIZE - 4} />
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: COLORS.outline,
    borderRadius: 18,
    backgroundColor: COLORS.card,
  },
  chipOn: {
    backgroundColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextOn: {
    fontWeight: '700',
  },
  help: {
    fontSize: 13,
    color: COLORS.mutedStrong,
  },
  room: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  // 아무도 없는 방은 한 단계 낮춰 보인다(회색 테두리, 연한 바탕, 그림자 없음). 아래 자리는 그대로 둬서 목록이 밀리지 않는다.
  roomEmpty: {
    borderColor: COLORS.textSub,
    backgroundColor: EMPTY_ROOM_BG,
    boxShadow: 'none',
  },
  body: {
    flex: 1,
    gap: 6,
  },
  pressed: {
    opacity: 0.6,
  },
  tags: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  sub: {
    fontSize: 12,
    color: COLORS.mutedStrong,
  },
  people: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatars: {
    flexDirection: 'row',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: COLORS.outline,
    overflow: 'hidden',
    backgroundColor: COLORS.cream,
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  peopleText: {
    flex: 1,
    gap: 2,
  },
  count: {
    fontSize: 13,
    fontWeight: '700',
  },
  mic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  micIcon: {
    width: 14,
    height: 14,
    tintColor: COLORS.mutedStrong,
  },
  enter: {
    alignSelf: 'flex-end',
  },
});
