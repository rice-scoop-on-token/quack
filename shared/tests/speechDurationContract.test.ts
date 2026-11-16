import {
  SPEECH_DURATION_FIELD,
  SPEECH_MAX_DURATION_MS,
  speechDurationFieldSchema,
} from '../src/index.ts';

Deno.test('전사 요청에서 녹음 시간 필드를 밀리초 정수로 읽는다', () => {
  const form = new FormData();
  form.set(SPEECH_DURATION_FIELD, '8820');
  if (speechDurationFieldSchema.parse(form.get('duration_ms')) !== 8_820) {
    throw new Error('폼의 duration_ms를 밀리초 정수로 변환해야 한다.');
  }
});

Deno.test('전사 요청의 상한은 60초이며 상한과 같은 값은 허용한다', () => {
  if (SPEECH_MAX_DURATION_MS !== 60_000 || speechDurationFieldSchema.parse('60000') !== 60_000) {
    throw new Error('60,000ms를 허용해야 한다.');
  }
});

Deno.test('전사 요청에서 누락·잘못된 형식·상한 초과를 거절한다', () => {
  for (const value of [null, '', ' ', '8820\n', '-1', '1.5', '6e4', '60001', 8820]) {
    if (speechDurationFieldSchema.safeParse(value).success) {
      throw new Error(`잘못된 duration_ms를 허용했다: ${JSON.stringify(value)}`);
    }
  }
});
