import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { useQuackApi } from '@/api';
import { TranscribeRequestError } from '@/api/supabase/transcribe';
import { useVoiceRecorder, type VoiceStartResult } from '@/features/session/hooks/useVoiceRecorder';

export type InputMode = 'chat' | 'voice';

// 서버 연결 모드에서만 실제 마이크와 STT를 쓴다. mock 모드는 마이크 없이 예시 전사문을 채운다(EXPO_PUBLIC_USE_MOCK=true).
const REAL_VOICE = process.env.EXPO_PUBLIC_USE_MOCK !== 'true';

// 서버 duration_ms 상한이 60000이라 59초에 자동으로 멈춘다
const AUTO_STOP_SECONDS = 59;

const START_FAILED: Record<Exclude<VoiceStartResult, 'started' | 'cancelled'>, string> = {
  denied: '마이크 권한이 필요해요. 허용한 뒤 다시 눌러 주세요. 글로 설명해도 돼요.',
  blocked: '휴대폰 설정에서 마이크를 허용해 주세요. 글로 설명해도 돼요.',
  unavailable: '이 기기에서는 녹음을 쓸 수 없어요. 글로 설명해 주세요.',
};
const UNREADABLE = '녹음을 읽지 못했어요. 다시 녹음해 주세요.';
const TRANSCRIBE_FAILED = '음성을 글로 바꾸지 못했어요. 다시 녹음하거나 글로 설명해 주세요.';
// 한계: 전사가 비어도 서버는 이미 음성을 처리해서 하루 사용량이 차감된다.
const EMPTY_TRANSCRIPT = '말씀이 잘 들리지 않았어요. 조금 더 크게 다시 말해 주세요.';

export function useExplainDraft() {
  const api = useQuackApi();
  const voice = useVoiceRecorder();
  const [mode, setMode] = useState<InputMode>('chat');
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  // 녹음을 멈춘 뒤 글로 바꾸는 중(서버 요청 중)
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState('');
  // 녹음·변환 실패 문구. 설명 보내기 실패(error)와 나눈다: error가 있으면 보내기 버튼이 "다시 보내기"가 되기 때문이다.
  const [voiceError, setVoiceError] = useState('');
  // 녹음 경과 시간(초). 녹음이 켜져 있는 동안만 1초마다 올라간다.
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // 요청마다 올리는 번호. 돌아가기·넘어가기·화면 이탈로 버려진 전송의 늦은 결과를 무시한다.
  // 한계: 버려도 서버는 이미 음성을 처리해서 사용량은 차감된다.
  const attempt = useRef(0);
  // 시작하는 중(권한 창 등)이거나 멈추는 중일 때 연타를 막는다(state는 다음 렌더에야 바뀐다)
  const starting = useRef(false);
  const finishing = useRef(false);

  // recording이 꺼지거나(멈춤·탭 전환·돌아가기·넘어가기) 화면이 없어지면 cleanup이 타이머를 끈다
  useEffect(() => {
    if (!recording) {
      return;
    }
    const id = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  // 화면이 없어지면 진행 중인 전송 결과를 버린다(녹음기는 useVoiceRecorder가 치운다)
  useEffect(
    () => () => {
      attempt.current += 1;
    },
    [],
  );

  // 녹음과 전송을 버린다(전사문은 채우지 않는다)
  function discard() {
    attempt.current += 1;
    voice.cancel();
    setRecording(false);
    setTranscribing(false);
  }

  async function beginRecording() {
    if (starting.current) {
      return;
    }
    starting.current = true;
    setVoiceError('');
    const result = await voice.start();
    starting.current = false;
    if (result === 'started') {
      setRecordingSeconds(0);
      setRecording(true);
    } else if (result !== 'cancelled') {
      setVoiceError(START_FAILED[result]);
    }
  }

  // 녹음을 멈추고 서버에서 글로 바꿔 입력란에 채운다
  async function finishRecording() {
    if (finishing.current) {
      return;
    }
    finishing.current = true;
    const mine = attempt.current;
    setRecording(false);
    setTranscribing(true);
    try {
      const clip = await voice.stop();
      if (attempt.current !== mine) {
        return;
      }
      if (!clip) {
        setVoiceError(UNREADABLE);
        return;
      }
      const result = await api.transcribe({
        uri: clip.uri,
        // 네이티브 파일 형식. 웹은 녹음 Blob의 type을 서버 연결 구현이 쓴다.
        mimeType: Platform.OS === 'web' ? undefined : 'audio/mp4',
        durationMs: clip.durationMs,
      });
      if (attempt.current !== mine) {
        return;
      }
      const heard = result.text.trim();
      if (!heard) {
        setVoiceError(EMPTY_TRANSCRIPT);
        return;
      }
      // 입력란에 쓴 글은 지우지 않고 공백을 두고 뒤에 붙인다
      setText((prev) => (prev.trim() ? `${prev.trimEnd()} ${heard}` : heard));
      setVoiceError('');
    } catch (e) {
      if (attempt.current === mine) {
        setVoiceError(e instanceof TranscribeRequestError ? e.message : TRANSCRIBE_FAILED);
      }
    } finally {
      finishing.current = false;
      if (attempt.current === mine) {
        setTranscribing(false);
      }
    }
  }

  // 59초가 되면 사람이 멈춘 것과 같은 경로로 멈추고 보낸다
  useEffect(() => {
    if (REAL_VOICE && recording && recordingSeconds >= AUTO_STOP_SECONDS) {
      void finishRecording();
    }
  });

  function toggleRecording() {
    if (!REAL_VOICE) {
      // mock: 마이크는 쓰지 않는다. 녹음을 멈추면 예시 전사문을 채운다.
      if (recording) {
        api.transcribe().then((r) => setText(r.text));
      } else {
        setRecordingSeconds(0);
      }
      setRecording(!recording);
      return;
    }
    if (transcribing) {
      return;
    }
    if (recording) {
      void finishRecording();
    } else {
      void beginRecording();
    }
  }

  return {
    mode,
    // 녹음 중에 탭을 바꾸면 녹음을 멈춘다(전사문은 채우지 않는다). 글로 바꾸는 중에 바꾸면 결과는 그대로 채운다.
    setMode: (next: InputMode) => {
      if (recording) {
        discard();
      }
      setMode(next);
    },
    text,
    setText: (value: string) => {
      setText(value);
      setError('');
      setVoiceError('');
    },
    recording,
    transcribing,
    recordingSeconds,
    toggleRecording,
    // 돌아가기·넘어가기로 설명 입력을 나갈 때 쓴다(녹음도 글로 바꾸는 중인 결과도 버린다)
    stopRecording: discard,
    error,
    setError,
    voiceError,
    // 녹음 중이거나 글로 바꾸는 중이거나 빈 입력이면 보낼 수 없다
    canSend: !recording && !transcribing && text.trim() !== '',
    clear: () => setText(''),
  };
}

export type ExplainDraft = ReturnType<typeof useExplainDraft>;
