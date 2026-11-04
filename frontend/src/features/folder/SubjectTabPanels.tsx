import type { Folder } from '@quack/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useApiQuery } from '@/api';
import { CharacterGrowth } from '@/features/character/CharacterGrowth';
import { growthFromXp, STAGE_LABEL } from '@/features/character/growth';
import { SCREEN_ACTIONS } from '@/features/character/screenActions';
import { useCharacterXp } from '@/features/character/useCharacterXp';
import { TeacherSummary } from '@/features/character/TeacherSummary';
import { understoodConcepts } from '@/features/review/report';

const STATUS_LABEL = {
  uploaded: '올리는 중',
  processing: '읽는 중',
  ready: '처리 완료 · 학습에 활용 가능',
  failed: '읽기 실패',
} as const;

const SOURCE_LABEL = { app: '앱', lock: '잠금화면' } as const;

const byNewest = <T,>(items: T[], time: (item: T) => string) =>
  [...items].sort((a, b) => time(b).localeCompare(time(a)));

type Props = { folder: Folder };

// 정보: 선생님 카드(이름, 성격), 성장 단계, 캐릭터와 경험치 막대
export function InfoPanel({ folder }: Props) {
  const xp = useCharacterXp(folder.id);
  return (
    <>
      <TeacherSummary folder={folder} />
      {/* 불러오는 중에도 한 줄을 잡아 둔다 */}
      <Text>{xp === undefined ? ' ' : `성장 단계 · ${STAGE_LABEL[growthFromXp(xp).stage]}`}</Text>
      <CharacterGrowth folder={folder} action={SCREEN_ACTIONS.subjectDetail} />
    </>
  );
}

// 자료
export function MaterialsPanel({ folder }: Props) {
  const materials = useApiQuery((a) => a.listMaterials(), []);
  if (!materials) {
    return null;
  }
  const mine = materials.filter((m) => m.folder_id === folder.id);
  return mine.length === 0 ? (
    <Text>등록된 자료가 없어요. 자료 없이도 설명하며 공부할 수 있어요.</Text>
  ) : (
    mine.map((m) => (
      <View key={m.id} style={styles.card}>
        <Text>{m.title}</Text>
        <Text>{STATUS_LABEL[m.status]}</Text>
      </View>
    ))
  );
}

// 학습: 지난 학습 리포트. 진행 중이거나 기록 없이 나간 세션(active)은 뺀다.
export function StudyPanel({ folder }: Props) {
  const sessions = useApiQuery((a) => a.listSessions(), []);
  if (!sessions) {
    return null;
  }
  const mine = byNewest(
    sessions.filter((s) => s.folder_id === folder.id && s.status !== 'active'),
    (s) => s.ended_at ?? '',
  );
  return mine.length === 0 ? (
    <Text>아직 학습 기록이 없어요.</Text>
  ) : (
    // 누르면 설명 내용과 퀴즈 다시 풀기
    mine.map((s) => (
      <Pressable
        key={s.id}
        style={styles.card}
        onPress={() =>
          router.push({ pathname: '/subjects/[id]/sessions/[sessionId]', params: { id: folder.id, sessionId: s.id } })
        }
        accessibilityRole="button"
      >
        <Text>{s.goal}</Text>
        <Text>
          {s.ended_at ? new Date(s.ended_at).toLocaleDateString() : ''} · {Math.floor(s.study_seconds / 60)}분 · 개념{' '}
          {understoodConcepts(s).length}개
        </Text>
      </Pressable>
    ))
  );
}

// 퀴즈: 공부와 별개인 앱 퀴즈(오늘의 퀴즈, 잠금화면 퀴즈) 기록
export function QuizPanel({ folder }: Props) {
  const attempts = useApiQuery((a) => a.listQuizAttempts(), []);
  if (!attempts) {
    return null;
  }
  const mine = byNewest(
    attempts.filter((q) => q.folder_id === folder.id),
    (q) => q.answered_at,
  );
  return mine.length === 0 ? (
    <Text>아직 푼 퀴즈가 없어요. 홈의 오늘의 퀴즈를 풀어 보세요.</Text>
  ) : (
    <>
      <Text>
        총 {mine.length}회 · 정답 {mine.filter((q) => q.correct).length}회
      </Text>
      {mine.map((q) => (
        <View key={q.id} style={styles.card}>
          <Text>{q.correct ? '정답' : '오답'}</Text>
          <Text>
            {SOURCE_LABEL[q.source]} 퀴즈 · {new Date(q.answered_at).toLocaleString()}
          </Text>
        </View>
      ))}
    </>
  );
}

// 팟캐스트: 만든 팟캐스트. 누르면 다시 듣는다.
export function PodcastPanel({ folder }: Props) {
  const podcasts = useApiQuery((a) => a.listPodcasts(), []);
  if (!podcasts) {
    return null;
  }
  const mine = podcasts.filter((p) => p.folder_id === folder.id).reverse();
  return mine.length === 0 ? (
    <Text>아직 만든 팟캐스트가 없어요. 홈의 AI 팟캐스트로 만들어 보세요.</Text>
  ) : (
    mine.map((p) => (
      <Pressable
        key={p.id}
        style={styles.card}
        onPress={() => router.push({ pathname: '/podcasts/[id]', params: { id: p.id } })}
        accessibilityRole="button"
      >
        <Text>{p.title}</Text>
        <Text>{p.minutes}분 · 자료 {p.material_ids.length}개</Text>
      </Pressable>
    ))
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 4,
    padding: 12,
    borderWidth: 1,
  },
});
