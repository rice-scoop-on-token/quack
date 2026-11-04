import type {
  CharacterStats,
  CreateTurnRequest,
  CreateTurnResponse,
  FinishSessionResponse,
  Folder,
  Material,
  ProcessMaterialResponse,
  Profile,
  QuizResponse,
  Session,
  SpeciesId,
  SubmitQuizRequest,
  SubmitQuizResponse,
  TranscribeResponse,
} from '@quack/shared';
import { createContext, useContext, useEffect, useState } from 'react';

import type {
  SessionTurn,
  StudySession,
  TempAiQuestion,
  TempDailyQuiz,
  TempDailyQuizResult,
  TempFriend,
  TempLockQuizSettings,
  TempPodcast,
  TempQuizAttempt,
  TempReportResponse,
} from '@/api/tempContract';

// 화면과 훅은 이 인터페이스로만 데이터를 가져온다(CLAUDE.md Frontend). 메서드는 서버 계약(shared)에 맞춘다.
export interface QuackApi {
  // 앱이 supabase-js로 직접 (RLS가 권한을 막는다)
  // 이름을 정하기 전에는 프로필이 없다
  getProfile(): Promise<Profile | null>;
  saveDisplayName(displayName: string): Promise<void>;
  completeOnboarding(): Promise<void>;
  listFolders(): Promise<Folder[]>;
  createFolder(input: { name: string; species_id: SpeciesId }): Promise<Folder>;
  // 그 과목의 자료, 세션, 경험치 내역도 DB가 함께 지운다
  deleteFolder(id: string): Promise<void>;
  listCharacterStats(): Promise<CharacterStats[]>;
  // 과목 서랍이 과목마다 자료 수를 보여 줘서 과목을 나누지 않고 모두 가져온다
  listMaterials(): Promise<Material[]>;
  // Storage에 파일을 올리고 materials 행을 만든다
  createMaterial(input: { folder_id: string; kind: Material['kind']; title: string }): Promise<Material>;
  startSession(input: { folder_id: string; goal: string }): Promise<Session>;
  // 설명 기록과 점검 퀴즈 결과가 함께 온다(StudySession은 임시 타입)
  listSessions(): Promise<StudySession[]>;
  getSession(id: string): Promise<StudySession | null>;

  // 서버(api 함수)
  processMaterial(id: string): Promise<ProcessMaterialResponse>;
  // 한계: 실제 녹음을 붙일 때 녹음 파일 인자를 더한다
  transcribe(): Promise<TranscribeResponse>;
  requestAiQuestion(sessionId: string): Promise<TempAiQuestion>;
  // 어느 개념에 대한 설명인지와 꼬리 질문 수는 서버가 지난 설명 기록으로 정해 응답에 넣는다
  sendTurn(sessionId: string, input: CreateTurnRequest): Promise<SessionTurn>;
  // 타이머 화면의 설명 제출. 응답은 shared 계약(POST /sessions/:id/turns)을 따른다.
  // 점검 화면의 다시 설명하기는 아직 위의 sendTurn(옛 임시 모양)을 쓴다. 시연 영상용으로 타이머 흐름만 먼저 옮겼다(이슈 #22).
  explain(sessionId: string, input: CreateTurnRequest): Promise<CreateTurnResponse>;
  // 쉬기 버튼은 앱만 알아서 공부 시간은 앱이 잰다. 요청 본문(study_seconds)은 shared 반영 전이다.
  finishSession(sessionId: string, input: { study_seconds: number }): Promise<FinishSessionResponse>;
  createQuiz(sessionId: string): Promise<QuizResponse>;
  submitQuiz(quizId: string, input: SubmitQuizRequest): Promise<SubmitQuizResponse>;
  // 여러 번 불러도 보상은 한 번만 지급되고 같은 리포트와 보상을 돌려준다
  createReport(sessionId: string): Promise<TempReportResponse>;

  // 조용히 공부하기로 잰 시간을 공부 기록으로 남기고 경험치를 조금 쌓는다(화면에는 경험치를 보여 주지 않는다)
  saveQuietStudy(input: { folder_id: string; study_seconds: number }): Promise<void>;
  // 지금 공부 중인 친구
  listFriends(): Promise<TempFriend[]>;

  // AI 팟캐스트. 자료 고르기는 listMaterials를 쓴다.
  createPodcast(input: { folder_id: string; material_ids: string[]; minutes: TempPodcast['minutes'] }): Promise<TempPodcast>;
  getPodcast(id: string): Promise<TempPodcast | null>;
  listPodcasts(): Promise<TempPodcast[]>;
  // 오늘의 퀴즈
  getDailyQuiz(): Promise<TempDailyQuiz>;
  // folder_id가 있으면 그 과목의 퀴즈 기록으로 남긴다(과목이 없으면 기록하지 않는다)
  submitDailyQuiz(
    id: string,
    answer: number,
    context: { folder_id: string | undefined; source: TempQuizAttempt['source'] },
  ): Promise<TempDailyQuizResult>;
  listQuizAttempts(): Promise<TempQuizAttempt[]>;
  // 한계: 잠금화면 설정은 데모 안에만 저장한다. 실제 잠금화면 알림은 만들지 않는다.
  getLockQuizSettings(): Promise<TempLockQuizSettings>;
  saveLockQuizSettings(settings: TempLockQuizSettings): Promise<void>;
}

// version은 데이터를 바꿀 때마다 올라간다. useApiQuery가 이 값을 보고 다시 불러온다.
export const ApiContext = createContext<{ api: QuackApi; version: number } | null>(null);

function useApiContext() {
  const value = useContext(ApiContext);
  if (!value) {
    throw new Error('ApiProvider 안에서만 쓸 수 있다.');
  }
  return value;
}

export function useQuackApi(): QuackApi {
  return useApiContext().api;
}

// 불러오는 중이면 undefined, 실패하면 null을 돌려준다.
// 데이터가 바뀌면 다시 불러오고, 그동안은 앞의 값을 그대로 보여 줘서 화면이 깜빡이지 않는다.
export function useApiQuery<T>(
  load: (api: QuackApi) => Promise<T>,
  deps: readonly unknown[],
): T | null | undefined {
  const { api, version } = useApiContext();
  const [data, setData] = useState<T | null>();

  useEffect(() => {
    let current = true;
    load(api).then(
      (value) => current && setData(() => value),
      () => current && setData(null),
    );
    return () => {
      current = false;
    };
    // load는 렌더마다 새로 만들어져서 넣지 않고, load가 쓰는 값은 deps로 받는다
  }, [api, version, ...deps]);

  return data;
}
