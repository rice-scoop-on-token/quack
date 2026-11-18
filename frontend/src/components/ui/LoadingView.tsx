import { StyleSheet, View } from 'react-native';

import { CampfireFlame } from '@/components/ui/CampfireFlame';
import { Text } from '@/components/ui/Text';
import { COLORS } from '@/theme/assetTokens';

// 화면 전체를 기다릴 때 빈 화면 대신 보여 준다. 화면 가운데에 모닥불을 둔다.
export function LoadingView() {
  return (
    <View style={styles.box} accessibilityRole="progressbar" accessibilityLabel="불러오는 중">
      <CampfireFlame size={64} />
      <Text style={styles.text}>불러오는 중…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.screen,
  },
  text: {
    color: COLORS.textSub,
  },
});
