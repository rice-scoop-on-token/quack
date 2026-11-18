import { Tabs } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { TAB_ICONS, type TabIconName } from '@/features/navigation/tabIcons';
import { COLORS, FONT } from '@/theme/assetTokens';

// 홈이 가운데에 오도록 탭 순서를 정했으므로, 처음 열리는 탭은 홈으로 둔다
export const unstable_settings = {
  initialRouteName: 'home',
};

const TAB_BAR_HEIGHT = 64;
// 알약(48×28) 안에 들어가도록 아이콘을 24로 줄였다. 탭 바 높이는 그대로다.
const ICON_SIZE = 24;
const PILL = { width: 48, height: 28 };

const styles = StyleSheet.create({
  // 선택 여부와 상관없이 같은 크기를 차지해서 탭을 눌러도 아이콘이 움직이지 않는다
  pill: {
    ...PILL,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillOn: {
    backgroundColor: COLORS.primary,
  },
});

export default function TabsLayout() {
  // 높이를 직접 정하면 기기 하단 안전 영역을 자동으로 더해 주지 않아서 직접 더한다
  const insets = useSafeAreaInsets();
  // 제목은 각 화면 맨 위의 ScreenTitle이 그리므로 네이티브 헤더를 숨긴다. 헤더가 맡던 위쪽 안전 영역은 장면에 직접 둔다.
  const noHeader = { headerShown: false, sceneStyle: { backgroundColor: COLORS.screen, paddingTop: insets.top } };

  return (
    <Tabs
      screenOptions={({ route }) => ({
        sceneStyle: { backgroundColor: COLORS.screen },
        headerStyle: { backgroundColor: COLORS.screen },
        headerTintColor: COLORS.text,
        headerTitleStyle: { color: COLORS.text },
        headerShadowVisible: false,
        tabBarStyle: {
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
          backgroundColor: COLORS.card,
          borderTopWidth: 2,
          borderTopColor: COLORS.outline,
        },
        // 선택된 탭은 노란 알약 위에 놓는다. 알약 위에서는 노란 면이 묻히므로 선택 여부와 상관없이 inactive 그림만 쓴다.
        // active 그림 파일은 지우지 않았고 코드에서만 쓰지 않는다.
        tabBarIcon: ({ focused }) => (
          <View style={[styles.pill, focused && styles.pillOn]}>
            <Image source={TAB_ICONS[route.name as TabIconName].inactive} style={{ width: ICON_SIZE, height: ICON_SIZE }} />
          </View>
        ),
        tabBarLabel: ({ focused, children }) => (
          <Text
            style={{
              ...FONT.tabLabel,
              fontWeight: focused ? '700' : '500',
              color: focused ? COLORS.text : COLORS.mutedStrong,
            }}
          >
            {children}
          </Text>
        ),
      })}
    >
      <Tabs.Screen name="records" options={{ title: '기록', ...noHeader }} />
      <Tabs.Screen name="subjects" options={{ title: '과목', ...noHeader }} />
      {/* 홈은 위쪽 장면이 화면 맨 위까지 올라오므로 헤더를 숨기고 안전 영역도 장면이 맡는다 */}
      <Tabs.Screen name="home" options={{ title: '홈', headerShown: false }} />
      <Tabs.Screen name="friends" options={{ title: '친구', ...noHeader }} />
      <Tabs.Screen name="settings" options={{ title: '설정', ...noHeader }} />
    </Tabs>
  );
}
