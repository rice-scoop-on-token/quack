import { useEffect, useState } from 'react';

import { useQuackApi } from '@/api';

export type InputMode = 'chat' | 'voice';

// 한계: 실제 녹음은 개발 빌드 세팅 후 별도 커밋에서 붙인다. 지금은 녹음을 멈추면 transcribe의 예시 전사문을 채운다.
export function useExplainDraft() {
  const api = useQuackApi();
  const [mode, setMode] = useState<InputMode>('chat');
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  // 녹음 경과 시간(초). 녹음이 켜져 있는 동안만 1초마다 올라간다.
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // recording이 꺼지거나(멈춤·탭 전환·돌아가기·넘어가기) 화면이 없어지면 cleanup이 타이머를 끈다
  useEffect(() => {
    if (!recording) {
      return;
    }
    const id = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  function toggleRecording() {
    if (recording) {
      api.transcribe().then((r) => setText(r.text));
    } else {
      setRecordingSeconds(0);
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
    recordingSeconds,
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
