import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    // 아이콘은 에셋 작업 때 넣는다. 지정하지 않으면 기본 대체 아이콘이 보여서 비워 둔다.
    <Tabs screenOptions={{ tabBarIcon: () => null }}>
      <Tabs.Screen name="home" options={{ title: '홈' }} />
      <Tabs.Screen name="subjects" options={{ title: '과목' }} />
      <Tabs.Screen name="friends" options={{ title: '친구' }} />
      <Tabs.Screen name="records" options={{ title: '기록' }} />
    </Tabs>
  );
}
