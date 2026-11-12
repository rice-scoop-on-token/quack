import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { LoadingView } from '@/components/ui/LoadingView';
import { COLORS, FONT, PAPER, SIZES } from '@/theme/assetTokens';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenTitle } from '@/components/ui/ScreenTitle';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useApiQuery, useQuackApi } from '@/api';
import type { TempLockQuizSettings } from '@/api/tempContract';
import { BottomActionLayout } from '@/components/ui/BottomActionLayout';
import { useSelectedFolder } from '@/features/folder/SelectedFolder';
import { SubjectSelect } from '@/features/folder/SubjectSelect';

const PER_DAY: TempLockQuizSettings['per_day'][] = [1, 3, 5];

// 앱 설정. 지금은 잠금화면 퀴즈 설정(Q-02)만 있다.
// 한계: 실제 잠금화면 알림은 네이티브 기능이라 만들지 않는다. 설정값만 데모 안에 저장한다.
export function SettingsScreen() {
  const api = useQuackApi();
  const saved = useApiQuery((a) => a.getLockQuizSettings(), []);
  // 바꾼 값을 화면 안에 두고 그 위에 다음 변경을 쌓는다. 저장된 값이 다시 올 때까지 기다리면 연달아 바꾼 앞의 변경이 사라진다.
  const [local, setLocal] = useState<TempLockQuizSettings | null>(null);
  const { folders, selected } = useSelectedFolder();

  if (!saved || folders === undefined) {
    return <LoadingView />;
  }
  const settings = local ?? saved;
  const folder = folders.find((f) => f.id === settings.folder_id) ?? selected;
  const change = (patch: Partial<TempLockQuizSettings>) => {
    const next = { ...settings, ...patch };
    setLocal(next);
    api.saveLockQuizSettings(next);
  };

  return (
    <BottomActionLayout
      inTab
      gutter={SIZES.gutter}
      actions={
        <>
          <Button variant="primary" title="잠금화면 미리보기" onPress={() => router.push('/quizzes/lock-preview')} />
          <Button title="앱에서 오늘의 퀴즈" onPress={() => router.push('/quizzes/today')} />
        </>
      }
    >
      <ScreenTitle title="설정" subtitle="잠금화면 퀴즈를 내게 맞게 받아요." />

      <Text style={styles.section}>잠금화면 퀴즈</Text>
      <ToggleRow label="잠금화면 퀴즈 켜기" value={settings.enabled} onChange={(v) => change({ enabled: v })} />
      <ToggleRow label="밤에는 쉬기" value={settings.quiet_at_night} onChange={(v) => change({ quiet_at_night: v })} />

      <Text style={styles.section}>하루에 받을 횟수</Text>
      <View style={styles.row}>
        {PER_DAY.map((n) => (
          <Pressable
            key={n}
            style={[styles.option, n === settings.per_day && styles.selected]}
            onPress={() => change({ per_day: n })}
            accessibilityRole="radio"
            accessibilityState={{ checked: n === settings.per_day }}
          >
            <Text>{n}회</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>출제 과목</Text>
      {folder ? (
        <SubjectSelect folders={folders} value={folder} onChange={(f) => change({ folder_id: f.id })} />
      ) : (
        <EmptyState title="과목이 없어요." message="과목을 먼저 만들어 주세요." />
      )}
    </BottomActionLayout>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <Text>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: COLORS.disabledBg, true: COLORS.primary }}
        thumbColor={COLORS.card}
        ios_backgroundColor={COLORS.disabledBg}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    ...FONT.heading,
  },
  toggle: {
    ...PAPER.option,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    ...PAPER.option,
    flex: 1,
    alignItems: 'center',
  },
  selected: {
    backgroundColor: COLORS.primary,
  },
});
