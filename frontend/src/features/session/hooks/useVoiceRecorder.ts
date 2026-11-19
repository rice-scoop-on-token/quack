import type { AudioRecorder } from 'expo-audio';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

// 시작 결과. started: 녹음 중, denied: 권한을 거부했지만 다시 물을 수 있음, blocked: 더 이상 물을 수 없음(폰 설정에서 허용),
// unavailable: 녹음 모듈을 쓸 수 없음, cancelled: 시작하는 동안 취소됨(아무것도 보여 주지 않는다)
export type VoiceStartResult = 'started' | 'denied' | 'blocked' | 'unavailable' | 'cancelled';

export type VoiceClip = { uri: string; durationMs: number };

// 마이크 녹음. expo-audio는 녹음을 시작하는 함수 안에서 불러온다(지연 로드).
// 모듈을 불러오지 못해도 앱이 멈추지 않고 unavailable로 넘어가 글로 설명하게 한다.
// 한계: 앱 설정 플러그인(app.json)은 쓰지 않는다. Expo Go에는 마이크 권한 문구가 이미 들어 있다. 개발 빌드로 옮기면 expo-audio 플러그인이 필요하다.
// 한계: 녹음 중 앱을 백그라운드로 보냈을 때의 처리는 하지 않는다.
export function useVoiceRecorder() {
  const recorder = useRef<AudioRecorder | null>(null);
  const startedAt = useRef(0);
  // 시작·취소를 구분하는 번호. 시작하는 동안 cancel이 불리면 번호가 달라져서 만든 녹음기를 바로 치운다.
  const epoch = useRef(0);

  async function releaseAudioMode() {
    if (Platform.OS === 'web') {
      return;
    }
    try {
      const { setAudioModeAsync } = await import('expo-audio');
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      // 오디오 모드를 되돌리지 못해도 다음 녹음 때 다시 설정한다
    }
  }

  function dispose(rec: AudioRecorder) {
    try {
      rec.release();
    } catch {
      // 이미 정리된 녹음기다
    }
  }

  async function start(): Promise<VoiceStartResult> {
    const mine = ++epoch.current;
    try {
      const audio = await import('expo-audio');
      const permission = await audio.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        return permission.canAskAgain ? 'denied' : 'blocked';
      }
      if (Platform.OS !== 'web') {
        // iOS는 녹음 전에 오디오 세션을 녹음 가능으로 바꿔야 한다
        await audio.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      }

      // useAudioRecorder 훅이 만드는 것과 같은 옵션이다(expo-audio 안의 createRecordingOptions와 같은 변환).
      // 훅은 파일 맨 위에서 모듈을 불러와야 해서 쓰지 않고 녹음기를 직접 만든다.
      const preset = audio.RecordingPresets.HIGH_QUALITY;
      const platform = Platform.OS === 'ios' ? preset.ios : Platform.OS === 'android' ? preset.android : preset.web;
      const rec = new audio.AudioModule.AudioRecorder({
        extension: preset.extension,
        sampleRate: preset.sampleRate,
        numberOfChannels: preset.numberOfChannels,
        bitRate: preset.bitRate,
        ...platform,
      });
      await rec.prepareToRecordAsync();
      if (epoch.current !== mine) {
        dispose(rec);
        return 'cancelled';
      }
      rec.record();
      startedAt.current = Date.now();
      recorder.current = rec;
      return 'started';
    } catch {
      return epoch.current === mine ? 'unavailable' : 'cancelled';
    }
  }

  // 녹음을 멈추고 파일 위치와 녹음 시간을 돌려준다. 녹음 중이 아니거나 파일을 못 얻으면 null이다.
  async function stop(): Promise<VoiceClip | null> {
    const rec = recorder.current;
    recorder.current = null;
    if (!rec) {
      return null;
    }
    const durationMs = Date.now() - startedAt.current;
    try {
      await rec.stop();
      const uri = rec.uri;
      return uri ? { uri, durationMs } : null;
    } catch {
      return null;
    } finally {
      dispose(rec);
      void releaseAudioMode();
    }
  }

  // 녹음을 버린다(멈추고 파일은 보내지 않는다). 시작하는 중이어도 취소한다.
  function cancel() {
    epoch.current += 1;
    const rec = recorder.current;
    recorder.current = null;
    if (rec) {
      rec.stop().catch(() => {}).finally(() => {
        dispose(rec);
        void releaseAudioMode();
      });
    }
  }

  // 화면이 없어지면 마이크가 켜진 채 남지 않게 녹음을 버린다
  useEffect(() => cancel, []);

  return { start, stop, cancel };
}
