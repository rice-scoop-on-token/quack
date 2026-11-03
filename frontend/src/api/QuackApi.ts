import type {
  CharacterStats,
  CreateTurnRequest,
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

import type { SessionTurn, StudySession, TempAiQuestion, TempReportResponse } from '@/api/tempContract';

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
  // 쉬기 버튼은 앱만 알아서 공부 시간은 앱이 잰다. 요청 본문(study_seconds)은 shared 반영 전이다.
  finishSession(sessionId: string, input: { study_seconds: number }): Promise<FinishSessionResponse>;
  createQuiz(sessionId: string): Promise<QuizResponse>;
  submitQuiz(quizId: string, input: SubmitQuizRequest): Promise<SubmitQuizResponse>;
  // 여러 번 불러도 보상은 한 번만 지급되고 같은 리포트와 보상을 돌려준다
  createReport(sessionId: string): Promise<TempReportResponse>;
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
