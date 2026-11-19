import { useContext, useMemo, type ReactNode } from 'react';

import { ApiContext, type QuackApi } from '@/api/QuackApi';
import { startRemoteSession } from '@/api/supabase/sessionStart';
import { transcribeRemote } from '@/api/supabase/transcribe';
import { sendRemoteTurn } from '@/api/supabase/turns';

// 발표용 임시 연결. mock 구현 위에서 공부 시작(requestSessionStart), 타이머 설명(explain), 음성 변환(transcribe)만 실제 서버로 보낸다.
// 나머지 메서드는 mock을 그대로 쓴다. mock과 supabase를 섞는 방식은 발표 뒤 팀이 다시 정한다.
export function RemoteTurnsProvider({ children }: { children: ReactNode }) {
  const parent = useContext(ApiContext);
  if (!parent) {
    throw new Error('MockApiProvider 안에서만 쓸 수 있다.');
  }

  const value = useMemo(() => {
    const mock = parent.api;
    // 이미 mock 세션에 남긴 서버 설명 id. 같은 응답이 두 번 기록되지 않게 한다.
    const recorded = new Set<string>();
    const api: QuackApi = {
      ...mock,
      // 원격 판정과 세션 생성 뒤, 화면이 읽을 mock 세션도 만든다
      requestSessionStart: (input) => startRemoteSession(mock, input),
      // 음성 → 글 변환. 녹음 파일이 없으면(mock 모드 흐름) 보낼 수 없으므로 예시 전사문 대신 오류로 알린다.
      transcribe: async (audio) => {
        if (!audio) {
          throw new Error('녹음 파일 없이는 음성을 글로 바꿀 수 없다.');
        }
        return transcribeRemote(audio);
      },
      // 공부 시작 때 이어 둔 원격 세션으로 보낸다. 성공한 설명만 mock 세션에도 남긴다(리포트·기록·성장·홈이 읽는다).
      explain: async (sessionId, input) => {
        const response = await sendRemoteTurn(sessionId, input);
        if (!recorded.has(response.turn.id)) {
          recorded.add(response.turn.id);
          try {
            await mock.recordTurn(sessionId, input, response);
          } catch {
            // 한계: 서버는 이미 설명을 처리해 사용량이 차감됐다. 여기서 실패로 보이면 다시 보내 이중 차감되므로, 기록 실패는 삼키고 리포트 숫자만 빠진다.
          }
        }
        return response;
      },
    };
    return { api, version: parent.version };
  }, [parent]);

  return <ApiContext value={value}>{children}</ApiContext>;
}
