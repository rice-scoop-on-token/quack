import { useLocalSearchParams } from 'expo-router';

import { RoomListScreen } from '@/features/friends/RoomListScreen';
import { RoomScreen } from '@/features/friends/RoomScreen';

// F-02 통화방. 새 라우트를 만들지 않고 ?roomId= 가 있으면 방, 없으면 방 목록을 보여 준다.
// 화면 내용은 features/friends/ 에서 고친다.
export default function RoomsRoute() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  return roomId ? <RoomScreen roomId={roomId} /> : <RoomListScreen />;
}
