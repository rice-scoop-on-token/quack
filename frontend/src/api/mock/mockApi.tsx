import {
  characterStatsSchema,
  folderSchema,
  ledgerEntrySchema,
  materialSchema,
  reportSchema,
  sessionSchema,
  type CharacterStats,
  type Folder,
  type Material,
  type QuizPublic,
  type Report,
  type Session,
  type XpLedgerEntry,
} from '@quack/shared';
import { useGlobalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { ApiContext, type QuackApi } from '@/api/QuackApi';
import { PERSONAS } from '@/api/mock/data/personas';
import { demoTodaySessions } from '@/api/mock/data/demoToday';
import { TEMP_USER_ID, tempId } from '@/api/mock/ids';
import { appendSessionReward, folderXp, rewardGrantFor } from '@/api/mock/ledger';
import { MOCK_TRANSCRIPT, mockAnalysis, mockConcept, toCreateTurnResponse } from '@/api/mock/scenarios/analysis';
import { createMockQuiz, gradeMockQuiz } from '@/api/mock/scenarios/quiz';
import { buildReport, rewardXp } from '@/api/mock/scenarios/report';
import { DAILY_QUIZ, DAILY_QUIZ_ANSWER, DAILY_QUIZ_RESULT, DEFAULT_LOCK_QUIZ } from '@/api/mock/data/dailyQuiz';
import { FRIENDS } from '@/api/mock/data/friends';
import { mockPodcastLines } from '@/api/mock/data/podcasts';
import {
  MIN_QUIET_STUDY_SECONDS,
  type SessionTurn,
  type StudySession,
  type TempLockQuizSettings,
  type TempPodcast,
  type TempQuizAttempt,
} from '@/api/tempContract';

// QuackApi의 mock 구현. 서버가 할 계산(분석, 세션 종료 상태, 퀴즈 채점, 리포트, 경험치 지급)도 여기서 서버 역할로 한다.
// 앱(iOS/Android)에서는 메모리에만 있어서 앱을 다시 켜면 처음 상태로 돌아간다.

type Db = {
  displayName: string;
  profileCreatedAt: string;
  onboardedAt: string | null;
  folders: Folder[];
  // DB의 character_stats view처럼 폴더마다 한 줄. total_xp는 처음 0이고, 조회할 때 xpLedger 합을 더한다.
  characterStats: CharacterStats[];
  materials: Material[];
  sessions: StudySession[];
  // 경험치 지급 내역. 값을 덮어쓰지 않고 쌓는다.
  xpLedger: XpLedgerEntry[];
  reports: Report[];
  podcasts: TempPodcast[];
  lockQuiz: TempLockQuizSettings;
  quizAttempts: TempQuizAttempt[];
};

function emptyDb(): Db {
  return {
    displayName: '',
    profileCreatedAt: new Date().toISOString(),
    onboardedAt: null,
    folders: [],
    characterStats: [],
    materials: [],
    sessions: [],
    xpLedger: [],
    reports: [],
    podcasts: [],
    lockQuiz: DEFAULT_LOCK_QUIZ,
    quizAttempts: [],
  };
}

// 분석은 LLM 호출, 자료 읽기는 서버 처리 시간을 흉내 낸다
const ANALYSIS_DELAY_MS = 1000;
const MATERIAL_DELAY_MS = 800;
const PODCAST_DELAY_MS = 1500;
// 조용히 공부하기는 선생님 설명이 없어서 경험치를 조금만 준다
const QUIET_SECONDS_PER_XP = 300;

// ?demo=child·adult: 모든 과목의 누적 경험치를 이 값으로 보여 준다(저장하지 않는다)
const DEMO_XP: Record<string, number> = { child: 150, adult: 300 };
// ?demo=grow·grow-adult: 지급 전 경험치를 아기·어린이 단계 끝으로 보고 성장 단계 변화를 보여 준다(저장하지 않는다)
const DEMO_XP_BEFORE: Record<string, number> = { grow: 90, 'grow-adult': 290 };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// FinishSessionResponse.session은 shared Session이라 임시로 더한 칸을 뺀다
function toSession({ id, user_id, folder_id, goal, status, started_at, ended_at }: StudySession): Session {
  return { id, user_id, folder_id, goal, status, started_at, ended_at };
}

// 타이머 설명이 몇 번째 개념인지와 그 개념에서 한 꼬리 질문 수를 지난 설명 기록으로 정한다.
// 꼬리 질문 답(follow_up)이 아닌 설명은 새 개념을 시작한다(이어서 공부, 넘어가기, 꼬리 질문 한도 뒤에 온다).
function conceptPosition(turns: SessionTurn[], trigger: SessionTurn['trigger']) {
  const timerTurns = turns.filter((t) => t.trigger !== 're_explain');
  const started = timerTurns.filter((t) => t.trigger !== 'follow_up').length;
  if (trigger !== 'follow_up') {
    return { index: started, followUpCount: 0 };
  }
  let trailing = 0;
  for (let i = timerTurns.length - 1; i >= 0 && timerTurns[i].trigger === 'follow_up'; i--) {
    trailing++;
  }
  // 이 답이 받은 꼬리 질문까지 센다
  return { index: started - 1, followUpCount: trailing + 1 };
}

// 한계: CreateTurnRequest에 "어느 개념을 다시 설명하는지" 칸이 없어서, 질문 문구가 같은 앞선 꼬리 질문으로 개념을 찾는다.
// 꼬리 질문 없이 넘어간 개념은 기본 질문("'개념'을 다시…")의 따옴표 안에서 찾는다. 실제 서버가 받을 방법은 BE·AI와 정해야 한다.
function reExplainConcept(turns: SessionTurn[], question: string | null): string {
  const asked = [...turns].reverse().find((t) => t.analysis.follow_up_question === question);
  return asked?.analysis.concept ?? question?.match(/^'(.+?)'/)?.[1] ?? mockConcept(0);
}

// ── 웹 저장 ──
// 주소에 ?demo=child 같은 값을 붙이고 Enter를 누르면 페이지를 새로 불러와 메모리 상태가 사라지기 때문이다.
// supabase 구현에서는 데이터가 서버에 있으므로 이 저장 코드는 필요 없다.
const PERSIST_ON = Platform.OS === 'web' && process.env.EXPO_PUBLIC_USE_MOCK === 'true';
// 커밋 3 전(tempStore) 저장값을 이어 쓰도록 같은 키를 쓴다
const STORAGE_KEY = 'quack.tempStore';

// StudySession은 shared에 스키마가 없어서 Session 스키마에 더한 칸의 모양만 검사한다.
function isStudySession(value: unknown): boolean {
  const v = value as Partial<StudySession>;
  return (
    sessionSchema.safeParse(value).success &&
    typeof v.study_seconds === 'number' &&
    Array.isArray(v.turns) &&
    (v.quiz === null || typeof v.quiz === 'object')
  );
}

// 없거나, 깨져 있거나, localStorage를 쓸 수 없으면 null(빈 상태로 시작)
// 주소에 ?demo=reset 이 있으면 저장된 값을 지우고 처음부터 시작한다.
function loadSaved(): Db | null {
  try {
    if (new URLSearchParams(window.location.search).get('demo') === 'reset') {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const data = JSON.parse(raw);
    // 예전 저장값에 없던 칸을 채운다. onboarded(boolean)는 커밋 3에서 onboardedAt(시각)으로 바뀌었다.
    data.profileCreatedAt ??= new Date().toISOString();
    data.onboardedAt ??= data.onboarded === true ? data.profileCreatedAt : null;
    data.sessions ??= [];
    data.xpLedger ??= [];
    data.reports ??= [];
    data.podcasts ??= [];
    data.lockQuiz ??= DEFAULT_LOCK_QUIZ;
    data.quizAttempts ??= [];
    if (Array.isArray(data.sessions)) {
      data.sessions = data.sessions.map((s: Partial<StudySession>) => ({ turns: [], quiz: null, ...s }));
    }
    const valid =
      typeof data.displayName === 'string' &&
      (data.onboardedAt === null || typeof data.onboardedAt === 'string') &&
      folderSchema.array().safeParse(data.folders).success &&
      characterStatsSchema.array().safeParse(data.characterStats).success &&
      materialSchema.array().safeParse(data.materials).success &&
      Array.isArray(data.sessions) &&
      data.sessions.every(isStudySession) &&
      ledgerEntrySchema.array().safeParse(data.xpLedger).success &&
      reportSchema.array().safeParse(data.reports).success;
    if (!valid) {
      return null;
    }
    const db: Db = {
      displayName: data.displayName,
      profileCreatedAt: data.profileCreatedAt,
      onboardedAt: data.onboardedAt,
      folders: data.folders,
      characterStats: data.characterStats,
      materials: data.materials,
      sessions: data.sessions,
      xpLedger: data.xpLedger,
      reports: data.reports,
      podcasts: Array.isArray(data.podcasts) ? data.podcasts : [],
      lockQuiz: { ...DEFAULT_LOCK_QUIZ, ...data.lockQuiz },
      quizAttempts: Array.isArray(data.quizAttempts) ? data.quizAttempts : [],
    };
    // 읽는 중에 새로고침하면 완료 처리(setTimeout)가 사라져 "읽는 중"에 멈추므로 완료로 바꾼다.
    db.materials = db.materials.map((m) => (m.status === 'processing' ? { ...m, status: 'ready' } : m));
    return db;
  } catch {
    return null;
  }
}

export function MockApiProvider({ children }: { children: ReactNode }) {
  // 데이터는 ref에 두고 바꿀 때마다 version을 올린다. 같은 요청이 한 번에 두 번 와도(개발 모드의 effect 두 번 실행 등)
  // 바로 앞의 변경을 보고 판단해서, 보상 같은 쓰기가 두 번 일어나지 않는다.
  const db = useRef<Db>(emptyDb());
  const [version, setVersion] = useState(0);
  // 저장된 값을 불러오기 전에는 화면을 그리지 않는다. 그리면 빈 상태로 판단해 /intro로 보내 버린다.
  const [loaded, setLoaded] = useState(!PERSIST_ON);
  // ?demo=fail 은 세션마다 타이머 설명과 점검 다시 설명하기의 첫 분석 요청만 실패시킨다
  const failedOnce = useRef(new Set<string>());
  // 채점할 때 정답을 찾으려고 만든 퀴즈를 둔다(서버에서는 quiz_questions 테이블)
  const quizzes = useRef(new Map<string, QuizPublic>());
  // 서버 응답을 바꾸는 ?demo= 값은 mock이 읽는다. 앱이 계산하는 값(hour, idle 등)은 화면이 읽는다.
  const { demo: demoParam } = useGlobalSearchParams<{ demo?: string }>();
  const demo = typeof demoParam === 'string' ? demoParam : null;

  useEffect(() => {
    if (!PERSIST_ON) {
      return;
    }
    db.current = loadSaved() ?? db.current;
    setLoaded(true);
  }, []);

  useEffect(() => {
    // 불러오기 전에 저장하면 빈 상태로 덮어쓰므로 불러온 뒤에만 저장한다
    if (!PERSIST_ON || !loaded) {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db.current));
    } catch {
      // 저장 공간이 없거나 막혀 있으면 메모리 상태만 쓴다.
    }
  }, [loaded, version]);

  // demo가 바뀌면 api도 새로 만들어서, 그 값을 쓰는 조회(useApiQuery)가 다시 불린다
  const api = useMemo<QuackApi>(() => {
    function write(change: (d: Db) => Partial<Db>) {
      db.current = { ...db.current, ...change(db.current) };
      setVersion((v) => v + 1);
    }

    function updateSession(id: string, change: (s: StudySession) => StudySession) {
      write((d) => ({ sessions: d.sessions.map((s) => (s.id === id ? change(s) : s)) }));
    }

    function findSession(id: string): StudySession {
      const session = db.current.sessions.find((s) => s.id === id);
      if (!session) {
        throw new Error('세션이 없다');
      }
      return session;
    }

    // explain이 sendTurn을 부르므로 이름을 붙여 둔다
    const methods: QuackApi = {
      async getProfile() {
        const d = db.current;
        if (!d.displayName) {
          return null;
        }
        return {
          id: TEMP_USER_ID,
          display_name: d.displayName,
          onboarding_completed_at: d.onboardedAt,
          created_at: d.profileCreatedAt,
        };
      },
      async saveDisplayName(displayName) {
        write(() => ({ displayName }));
      },
      async completeOnboarding() {
        write(() => ({ onboardedAt: new Date().toISOString() }));
      },
      async listFolders() {
        return db.current.folders;
      },
      async createFolder({ name, species_id }) {
        const folder: Folder = {
          id: tempId(),
          user_id: TEMP_USER_ID,
          name,
          species_id,
          created_at: new Date().toISOString(),
        };
        // DB의 character_stats는 폴더마다 경험치 0부터 시작하는 view라 폴더와 함께 만든다.
        write((d) => ({
          folders: [...d.folders, folder],
          characterStats: [
            ...d.characterStats,
            { folder_id: folder.id, user_id: TEMP_USER_ID, species_id, total_xp: 0 },
          ],
        }));
        return folder;
      },
      // DB의 on delete cascade와 같게 맞춘다
      async deleteFolder(id) {
        const sessionIds = new Set(db.current.sessions.filter((s) => s.folder_id === id).map((s) => s.id));
        write((d) => ({
          folders: d.folders.filter((f) => f.id !== id),
          characterStats: d.characterStats.filter((c) => c.folder_id !== id),
          materials: d.materials.filter((m) => m.folder_id !== id),
          sessions: d.sessions.filter((s) => s.folder_id !== id),
          xpLedger: d.xpLedger.filter((e) => e.folder_id !== id),
          reports: d.reports.filter((r) => !sessionIds.has(r.session_id)),
          podcasts: d.podcasts.filter((p) => p.folder_id !== id),
          quizAttempts: d.quizAttempts.filter((q) => q.folder_id !== id),
        }));
      },
      async listCharacterStats() {
        const { characterStats, xpLedger } = db.current;
        const demoXp = demo ? DEMO_XP[demo] : undefined;
        return characterStats.map((c) => ({
          ...c,
          total_xp: demoXp ?? c.total_xp + folderXp(xpLedger, c.folder_id),
        }));
      },
      async listMaterials() {
        return db.current.materials;
      },
      // 한계: 실제 파일 선택과 Storage 업로드가 없어서 파일 없는 샘플 자료 행만 만든다
      async createMaterial({ folder_id, kind, title }) {
        const material: Material = {
          id: tempId(),
          user_id: TEMP_USER_ID,
          folder_id,
          kind,
          title,
          storage_path: null,
          status: 'uploaded',
          key_concepts: [],
          error_message: null,
          created_at: new Date().toISOString(),
        };
        write((d) => ({ materials: [...d.materials, material] }));
        return material;
      },
      async startSession({ folder_id, goal }) {
        const session: StudySession = {
          id: tempId(),
          user_id: TEMP_USER_ID,
          folder_id,
          goal,
          status: 'active',
          started_at: new Date().toISOString(),
          ended_at: null,
          study_seconds: 0,
          turns: [],
          quiz: null,
        };
        write((d) => ({ sessions: [...d.sessions, session] }));
        return toSession(session);
      },
      async listSessions() {
        if (demo === 'today') {
          return demoTodaySessions(
            db.current.folders.map((f) => f.id),
            new Date(),
          );
        }
        return db.current.sessions;
      },
      async getSession(id) {
        return db.current.sessions.find((s) => s.id === id) ?? null;
      },

      async processMaterial(id) {
        const setStatus = (status: Material['status']) =>
          write((d) => ({ materials: d.materials.map((m) => (m.id === id ? { ...m, status } : m)) }));
        setStatus('processing');
        await wait(MATERIAL_DELAY_MS);
        setStatus('ready');
        const material = db.current.materials.find((m) => m.id === id);
        if (!material) {
          throw new Error('자료가 없다');
        }
        return { material };
      },
      async transcribe() {
        return { text: MOCK_TRANSCRIPT, duration_ms: 0 };
      },
      // 실제 질문 내용은 서버(AI)가 만든다. mock은 그 과목 선생님의 말투 예시 문구를 쓴다.
      async requestAiQuestion(sessionId) {
        const session = findSession(sessionId);
        const folder = db.current.folders.find((f) => f.id === session.folder_id);
        return { question: PERSONAS[folder?.species_id ?? 'rubber_duck'].lines.aiQuestion };
      },
      async sendTurn(sessionId, input) {
        await wait(ANALYSIS_DELAY_MS);
        const failKey = `${sessionId}:${input.trigger === 're_explain' ? 'review' : 'timer'}`;
        if (demo === 'fail' && !failedOnce.current.has(failKey)) {
          failedOnce.current.add(failKey);
          throw new Error('mock 분석 실패');
        }
        // 기다리는 동안 다른 설명이 저장됐을 수 있어서 기다린 뒤에 세션을 읽는다
        const session = findSession(sessionId);
        const position =
          input.trigger === 're_explain' ? null : conceptPosition(session.turns, input.trigger);
        const analysis = mockAnalysis({
          concept: position
            ? mockConcept(position.index)
            : reExplainConcept(session.turns, input.question_text),
          text: input.text,
          trigger: input.trigger,
          followUpCount: position?.followUpCount ?? 0,
          nextConcept: position ? mockConcept(position.index + 1) : null,
          demo,
        });
        const turn: SessionTurn = { seq: session.turns.length + 1, ...input, analysis };
        updateSession(sessionId, (s) => ({ ...s, turns: [...s.turns, turn] }));
        return turn;
      },
      // 판정 시나리오는 sendTurn과 같고, 돌려주는 모양만 shared 응답으로 바꾼다
      async explain(sessionId, input) {
        const turn = await methods.sendTurn(sessionId, input);
        return toCreateTurnResponse(turn, { id: tempId(), sessionId, createdAt: new Date().toISOString() });
      },
      async finishSession(sessionId, { study_seconds }) {
        updateSession(sessionId, (s) => ({
          ...s,
          status: 'finished',
          ended_at: new Date().toISOString(),
          study_seconds,
        }));
        const session = findSession(sessionId);
        const { covered_concepts, weak_concepts, turn_count } = buildReport(session);
        return {
          session: toSession(session),
          review: {
            covered_concepts,
            weak_concepts,
            turn_count,
            suggested_next: weak_concepts.length > 0 ? 're_explain' : 'quiz',
          },
        };
      },
      async createQuiz(sessionId) {
        const quiz = createMockQuiz(sessionId);
        quizzes.current.set(quiz.id, quiz);
        return { quiz };
      },
      // 보낸 답만 채점한다. 리포트를 만들기 전이면 이 결과를 세션의 퀴즈 결과로 남긴다.
      // 그래서 리포트를 받은 뒤의 퀴즈 다시 풀기(연습)는 리포트와 경험치를 바꾸지 않는다.
      async submitQuiz(quizId, { answers }) {
        const quiz = quizzes.current.get(quizId);
        if (!quiz) {
          throw new Error('퀴즈가 없다');
        }
        const graded = gradeMockQuiz(
          quiz,
          quiz.questions.map((q) => answers.find((a) => a.question_id === q.id)?.answer ?? -1),
        );
        const results = graded.filter((r) => answers.some((a) => a.question_id === r.question_id));
        const correct_count = results.filter((r) => r.correct).length;
        const session = findSession(quiz.session_id);
        if (session.status === 'finished') {
          updateSession(session.id, (s) => ({ ...s, quiz: { correct_count, total_count: results.length } }));
        }
        return {
          attempt: {
            id: tempId(),
            quiz_id: quizId,
            answers,
            correct_count,
            total_count: results.length,
            graded_at: new Date().toISOString(),
          },
          results,
        };
      },
      async createReport(sessionId) {
        const session = findSession(sessionId);
        let report = db.current.reports.find((r) => r.session_id === sessionId);
        // 이미 만든 리포트와 지급 내역이 있으면 아무것도 쓰지 않는다. 쓰면 version이 올라 이 조회가 다시 불리며 끝없이 돈다.
        if (!report) {
          const created: Report = {
            id: tempId(),
            session_id: sessionId,
            summary: '',
            ...buildReport(session),
            created_at: new Date().toISOString(),
          };
          report = created;
          write((d) => ({
            reports: [...d.reports, created],
            sessions: d.sessions.map((s) => (s.id === sessionId ? { ...s, status: 'reported' } : s)),
          }));
        }
        if (!rewardGrantFor(sessionId, db.current.xpLedger)) {
          const entry: XpLedgerEntry = {
            id: tempId(),
            user_id: TEMP_USER_ID,
            folder_id: session.folder_id,
            amount: rewardXp(report),
            reason: 'session_reward',
            session_id: sessionId,
            created_at: new Date().toISOString(),
          };
          write((d) => ({ xpLedger: appendSessionReward(d.xpLedger, entry) }));
        }
        const grant = rewardGrantFor(sessionId, db.current.xpLedger)!;
        const demoBefore = demo ? DEMO_XP_BEFORE[demo] : undefined;
        return {
          report,
          rewards:
            demoBefore === undefined
              ? grant
              : { ...grant, xp_before: demoBefore, xp_after: demoBefore + grant.xp },
        };
      },
      // 서버가 할 일을 흉내 낸다: 끝난 세션 하나로 남기고, 5분에 1 경험치를 쌓는다
      // 팀 결정 전 임시: 경험치 기준(docs/decisions/0003)과 다르다
      async saveQuietStudy({ folder_id, study_seconds }) {
        if (study_seconds < MIN_QUIET_STUDY_SECONDS) {
          return;
        }
        const endedAt = new Date();
        const session: StudySession = {
          id: tempId(),
          user_id: TEMP_USER_ID,
          folder_id,
          goal: '조용히 공부하기',
          status: 'finished',
          started_at: new Date(endedAt.getTime() - study_seconds * 1000).toISOString(),
          ended_at: endedAt.toISOString(),
          study_seconds,
          turns: [],
          quiz: null,
          quiet: true,
        };
        const amount = Math.floor(study_seconds / QUIET_SECONDS_PER_XP);
        write((d) => ({
          sessions: [...d.sessions, session],
          xpLedger:
            amount > 0
              ? appendSessionReward(d.xpLedger, {
                  id: tempId(),
                  user_id: TEMP_USER_ID,
                  folder_id,
                  amount,
                  reason: 'session_reward',
                  session_id: session.id,
                  created_at: endedAt.toISOString(),
                })
              : d.xpLedger,
        }));
      },
      async listFriends() {
        return FRIENDS;
      },
      async createPodcast({ folder_id, material_ids, minutes }) {
        await wait(PODCAST_DELAY_MS);
        const picked = db.current.materials.filter((m) => material_ids.includes(m.id));
        if (picked.length === 0) {
          throw new Error('자료가 없다');
        }
        const title = picked.length === 1 ? picked[0].title : `${picked[0].title} 외 ${picked.length - 1}개`;
        const podcast: TempPodcast = {
          id: tempId(),
          folder_id,
          material_ids,
          minutes,
          title,
          lines: mockPodcastLines(title),
        };
        write((d) => ({ podcasts: [...d.podcasts, podcast] }));
        return podcast;
      },
      async getPodcast(id) {
        return db.current.podcasts.find((p) => p.id === id) ?? null;
      },
      async listPodcasts() {
        return db.current.podcasts;
      },
      async getDailyQuiz() {
        return DAILY_QUIZ;
      },
      async submitDailyQuiz(_id, answer, { folder_id, source }) {
        const correct = answer === DAILY_QUIZ_ANSWER;
        if (folder_id) {
          const attempt: TempQuizAttempt = {
            id: tempId(),
            folder_id,
            source,
            correct,
            answered_at: new Date().toISOString(),
          };
          write((d) => ({ quizAttempts: [...d.quizAttempts, attempt] }));
        }
        return { correct, ...DAILY_QUIZ_RESULT };
      },
      async listQuizAttempts() {
        return db.current.quizAttempts;
      },
      async getLockQuizSettings() {
        return db.current.lockQuiz;
      },
      async saveLockQuizSettings(settings) {
        write(() => ({ lockQuiz: settings }));
      },
    };
    return methods;
  }, [demo]);

  const value = useMemo(() => ({ api, version }), [api, version]);

  return <ApiContext value={value}>{loaded ? children : null}</ApiContext>;
}
