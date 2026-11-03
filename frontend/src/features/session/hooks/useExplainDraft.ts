import { useState } from 'react';

import { useQuackApi } from '@/api';

export type InputMode = 'chat' | 'voice';

// 한계: 실제 녹음은 개발 빌드 세팅 후 별도 커밋에서 붙인다. 지금은 녹음을 멈추면 transcribe의 예시 전사문을 채운다.
export function useExplainDraft() {
  const api = useQuackApi();
  const [mode, setMode] = useState<InputMode>('chat');
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');

  function toggleRecording() {
    if (recording) {
      api.transcribe().then((r) => setText(r.text));
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
