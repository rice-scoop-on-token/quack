import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    // 아이콘은 에셋 작업 때 넣는다. 지정하지 않으면 기본 대체 아이콘이 보여서 비워 둔다.
    <Tabs screenOptions={{ tabBarIcon: () => null }}>
      <Tabs.Screen name="home" options={{ title: '홈' }} />
      <Tabs.Screen name="subjects" options={{ title: '과목' }} />
      <Tabs.Screen name="friends" options={{ title: '친구' }} />
      <Tabs.Screen name="records" options={{ title: '기록' }} />
      {/* 설정 아이콘만 임시 글자 아이콘을 둔다. 나머지 탭 아이콘은 에셋 작업 때 같이 넣는다. */}
      <Tabs.Screen name="settings" options={{ title: '설정', tabBarIcon: () => <Text>⚙</Text> }} />
    </Tabs>
  );
}
