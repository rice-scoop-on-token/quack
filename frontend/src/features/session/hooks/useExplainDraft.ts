import { useState } from 'react';

import { MOCK_TRANSCRIPT } from '@/api/mock/scenarios/analysis';

export type InputMode = 'chat' | 'voice';

// 설명 입력 상태(글·말 탭, 입력 내용, mock 녹음). 타이머의 설명 단계와 점검(S-04)의 다시 설명하기에서 같이 쓴다.
// 실제 녹음·STT는 개발 빌드 세팅 후 별도 커밋에서 붙인다. 지금은 녹음을 멈추면 임시 전사문을 채운다.
export function useExplainDraft() {
  const [mode, setMode] = useState<InputMode>('chat');
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');

  function toggleRecording() {
    if (recording) {
      // QuackApi 교체 지점: 녹음 파일을 POST /speech/transcribe 로 보내고 받은 전사문을 채운다.
      setText(MOCK_TRANSCRIPT);
    }
    setRecording(!recording);
  }

  return {
    mode,
    // 녹음 중에 탭을 바꾸면 녹음을 멈춘다(전사문은 채우지 않는다)
    setMode: (next: InputMode) => {
      setRecording(false);
      setMode(next);
    },
    text,
    setText: (value: string) => {
      setText(value);
      setError('');
    },
    recording,
    toggleRecording,
    // 돌아가기로 설명 입력을 나갈 때 쓴다(전사문은 채우지 않는다)
    stopRecording: () => setRecording(false),
    error,
    setError,
    // 녹음 중이거나 빈 입력이면 보낼 수 없다
    canSend: !recording && text.trim() !== '',
    clear: () => setText(''),
  };
}

export type ExplainDraft = ReturnType<typeof useExplainDraft>;
