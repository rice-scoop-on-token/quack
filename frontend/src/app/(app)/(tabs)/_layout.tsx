import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    // 아이콘은 에셋 작업 때 넣는다. 지정하지 않으면 기본 대체 아이콘이 보여서 비워 둔다.
    // 하단 탭 메뉴
    <Tabs screenOptions={{ tabBarIcon: () => null }}>
      {/* 홈 탭 */}
      <Tabs.Screen name="home" options={{ title: '홈' }} />
      {/* 과목 탭 */}
      <Tabs.Screen name="subjects" options={{ title: '과목' }} />
      {/* 친구 탭 */}
      <Tabs.Screen name="friends" options={{ title: '친구' }} />
      {/* 기록 탭 */}
      <Tabs.Screen name="records" options={{ title: '기록' }} />
    </Tabs>
  );
}
