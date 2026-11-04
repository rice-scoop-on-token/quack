import { useContext, useMemo, type ReactNode } from 'react';

import { ApiContext, type QuackApi } from '@/api/QuackApi';
import { sendRemoteTurn, TurnRequestError } from '@/api/supabase/turns';

// 시연 영상용 임시 연결(이슈 #22). mock 구현 위에서 타이머 설명(explain)만 실제 서버로 보낸다.
// 나머지 메서드는 mock을 그대로 쓴다. mock과 supabase를 섞는 방식은 제출 뒤 팀이 다시 정한다.
export function RemoteTurnsProvider({ children }: { children: ReactNode }) {
  const parent = useContext(ApiContext);
  if (!parent) {
    throw new Error('MockApiProvider 안에서만 쓸 수 있다.');
  }

  const value = useMemo(() => {
    const mock = parent.api;
    const api: QuackApi = {
      ...mock,
      async explain(sessionId, input) {
        // 원격 그림자 세션을 만들 재료(목표, 폴더 이름, 동물)는 mock 세션과 폴더에서 읽는다
        const session = await mock.getSession(sessionId);
        const folder = session ? (await mock.listFolders()).find((f) => f.id === session.folder_id) : undefined;
        if (!session || !folder) {
          throw new TurnRequestError('NOT_FOUND', '공부 세션을 찾지 못했어요. 처음부터 다시 시작해 주세요.');
        }
        return sendRemoteTurn(
          { mockSessionId: sessionId, goal: session.goal, folderName: folder.name, speciesId: folder.species_id },
          input,
        );
      },
    };
    return { api, version: parent.version };
  }, [parent]);

  return <ApiContext value={value}>{children}</ApiContext>;
}
