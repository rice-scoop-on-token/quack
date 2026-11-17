import type { SpeciesId } from '@quack/shared';
import { StyleSheet, View } from 'react-native';

import type { GrowthStage } from '@/api/tempContract';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { Button } from '@/components/ui/Button';
import { CharacterBox } from '@/components/ui/CharacterBox';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { STAGE_LABEL } from '@/features/character/growth';
import { growthGauge } from '@/features/character/growthGauge';
import { SCREEN_ACTIONS } from '@/features/character/screenActions';
import { COLORS } from '@/theme/assetTokens';

type Props = {
  speciesId: SpeciesId;
  from: GrowthStage;
  to: GrowthStage;
  // 지급 후 누적 경험치(리포트의 rewards.xp_after)
  xpAfter: number;
  onConfirm: () => void;
};

// 성장 결과. 성장 축하 화면은 가운데 정렬을 유지한다.
export function GrowthResult({ speciesId, from, to, xpAfter, onConfirm }: Props) {
  const gauge = growthGauge(xpAfter);

  return (
    <BottomActionLayout centered actions={<Button variant="primary" title="확인" onPress={onConfirm} />}>
      <Text style={styles.center} accessibilityRole="header">
        캐릭터가 성장했어요!
      </Text>

      <View style={styles.character}>
        <CharacterBox speciesId={speciesId} stage={to} size={180} action={SCREEN_ACTIONS.growth} />
      </View>

      <View style={styles.stage} accessible accessibilityLabel={`${STAGE_LABEL[from]}에서 ${STAGE_LABEL[to]}`}>
        <Text>{STAGE_LABEL[from]}</Text>
        <Icon name="arrow-right" />
        <Text>{STAGE_LABEL[to]}</Text>
      </View>

      {gauge ? (
        <View style={styles.gauge}>
          <Text style={styles.center}>
            {gauge.xpToNext === null ? '다 자랐어요! 앞으로도 함께 공부해요.' : `다음 단계까지 ${gauge.xpToNext} XP`}
          </Text>
          <View
            style={styles.bar}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(gauge.progress * 100) }}
          >
            <View style={[styles.fill, { width: `${gauge.progress * 100}%` }]} />
          </View>
        </View>
      ) : null}
    </BottomActionLayout>
  );
}

const styles = StyleSheet.create({
  character: {
    alignItems: 'center',
  },
  center: {
    textAlign: 'center',
  },
  stage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  gauge: {
    gap: 8,
  },
  bar: {
    alignSelf: 'stretch',
    height: 12,
    borderWidth: 2,
    borderColor: COLORS.outline,
    backgroundColor: COLORS.cream,
  },
  fill: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
});
