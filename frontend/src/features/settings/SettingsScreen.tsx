import { router } from 'expo-router';
import { Button, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

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
  const settings = useApiQuery((a) => a.getLockQuizSettings(), []);
  const { folders, selected } = useSelectedFolder();

  if (!settings || folders === undefined) {
    return null;
  }
  const folder = folders.find((f) => f.id === settings.folder_id) ?? selected;
  const change = (patch: Partial<TempLockQuizSettings>) => api.saveLockQuizSettings({ ...settings, ...patch });

  return (
    <BottomActionLayout
      inTab
      actions={
        <>
          <Button title="잠금화면 미리보기" onPress={() => router.push('/quizzes/lock-preview')} />
          <Button title="앱에서 오늘의 퀴즈" onPress={() => router.push('/quizzes/today')} />
        </>
      }
    >
      <Text>잠금화면 퀴즈</Text>
      <ToggleRow label="잠금화면 퀴즈 켜기" value={settings.enabled} onChange={(v) => change({ enabled: v })} />
      <ToggleRow label="밤에는 쉬기" value={settings.quiet_at_night} onChange={(v) => change({ quiet_at_night: v })} />

      <Text>하루에 받을 횟수</Text>
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

      <Text>출제 과목</Text>
      {folder ? (
        <SubjectSelect folders={folders} value={folder} onChange={(f) => change({ folder_id: f.id })} />
      ) : (
        <Text>과목이 없어요. 과목을 먼저 만들어 주세요.</Text>
      )}
    </BottomActionLayout>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <Text>{label}</Text>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
  },
  selected: {
    borderWidth: 3,
  },
});
