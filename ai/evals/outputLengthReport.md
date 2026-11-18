# 실제 AI 발화 22개 길이 분포

FE의 PR #17 후속 요청에 대한 오프라인 측정 결과다. 말풍선·줄바꿈·스크롤 확인 자료이며, 모델 출력 길이의 보장이나 API 문자 수 상한이 아니다.

## 출처와 측정 방법

- 측정일: 2026-11-04.
- 원본: 커밋 `5a0c248e0986bb22a1fafabe769014b8a94739e4`의 `ai/evals/runs/2026-11-02-4508b79/results.jsonl`.
- 성공 출력 22개와 사례 ID의 유일성을 확인하고 `result.output.response.message`·`question`을 읽었다. 원본 응답은 수정하지 않았다. 새 유료 호출은 0회다.
- 기존 실행은 모델 `gpt-6.1-sol`, 사례별 1회, 출력 한도 4096토큰·대기 한도 30초였다. 원본 실행 당시 프롬프트와 입력의 측정값이며 향후 프롬프트·말투 변경에도 같은 분포가 나온다는 뜻은 아니다.
- 길이는 Unicode 코드 포인트 수(`Array.from(text).length`)다. 공백·문장부호·원래 줄바꿈을 포함하며 trim·정규화를 하지 않는다. UTF-8 바이트 수, 토큰 수, 화면의 글자 폭·줄 수, 사용자에게 보이는 문자 묶음 수와는 다르다.
- 질문 `null`은 질문 통계에서 제외했다. 질문이 있는 출력은 14개, 없는 출력은 8개다.
- 합친 길이는 질문이 있으면 `message + "\n\n" + question`, 없으면 `message`로 계산했다. 빈 줄 구분자 2자를 포함한 참고값이며 FE의 실제 렌더링 방식을 강제하지 않는다.
- 중앙값은 짝수 표본의 가운데 두 값 평균이다. P90은 오름차순에서 `ceil(n × 0.9)`번째 값(nearest rank)이다. 평균은 소수 첫째 자리로 반올림했다.
- 각 사례당 한 번의 기존 출력이다. 새 입력·반복 호출·다른 동물 말투의 길이 분포를 대표하거나 행동 품질을 보증하지 않는다.

## 전체 분포

단위는 위 방식으로 계산한 자 수다.

| 항목 | 개수 | 최소 | 중앙값 | 평균 | P90 | 최대 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| message | 22 | 37 | 73 | 79.7 | 101 | 219 |
| question (null 제외) | 14 | 22 | 48 | 49.1 | 65 | 68 |
| 합친 발화 (빈 줄 포함) | 22 | 50 | 107.5 | 112.2 | 134 | 265 |

## 행동별 합친 발화

| response.action | 개수 | 최소 | 중앙값 | P90 | 최대 |
| --- | ---: | ---: | ---: | ---: | ---: |
| ask | 13 | 82 | 115 | 134 | 139 |
| explain | 1 | 265 | 265 | 265 | 265 |
| correct (교정 행동) | 1 | 126 | 126 | 126 | 126 |
| acknowledge | 7 | 50 | 88 | 101 | 101 |

explain과 correct는 각각 1개뿐이므로 행동별 전형적 길이를 추정할 수 없다.

## 사례별 길이

| 사례 ID | 행동 | message | question | 합친 발화 |
| --- | --- | ---: | ---: | ---: |
| binary-search-01-sufficient | acknowledge | 101 | null | 101 |
| binary-search-02-missing-precondition | ask | 43 | 63 | 108 |
| binary-search-03-wrong-direction | ask | 87 | 50 | 139 |
| binary-search-04-ambiguous-rule | ask | 51 | 63 | 116 |
| binary-search-05-term-list | ask | 67 | 65 | 134 |
| binary-search-06-application-needed | ask | 46 | 58 | 106 |
| binary-search-07-no-reference | acknowledge | 88 | null | 88 |
| binary-search-08-answer-request | explain | 219 | 44 | 265 |
| linear-algebra-01-sufficient | acknowledge | 94 | null | 94 |
| linear-algebra-02-arithmetic-slip | correct | 126 | null | 126 |
| linear-algebra-03-skipped-unverified | ask | 69 | 47 | 118 |
| linear-algebra-04-skipped-verified | ask | 62 | 33 | 97 |
| linear-algebra-05-wrong-justification | ask | 62 | 68 | 132 |
| linear-algebra-06-repeated-subtraction | ask | 59 | 46 | 107 |
| linear-algebra-07-free-variable | ask | 64 | 49 | 115 |
| linear-algebra-08-alternative-method | acknowledge | 77 | null | 77 |
| korean-history-01-sufficient | acknowledge | 88 | null | 88 |
| korean-history-02-correct-choice-wrong-entity | ask | 91 | 22 | 115 |
| korean-history-03-wrong-activity | ask | 85 | 37 | 124 |
| korean-history-04-omitted-activity | ask | 37 | 43 | 82 |
| korean-history-05-equivalent-expression | acknowledge | 87 | null | 87 |
| korean-history-06-assisted-repetition | acknowledge | 50 | null | 50 |

## FE 레이아웃 확인 제안

아래는 UI 확인 제안이며 제품 요구사항 확정이나 FE 구현 완료 보고가 아니다.

- 질문 대기 확인: `binary-search-03-wrong-direction`의 본문 87자·질문 50자로 두 영역이 모두 보이고 답변 입력에 접근 가능한지 확인한다.
- 가장 긴 본문 확인: `binary-search-08-answer-request`의 본문 219자·질문 44자로 줄바꿈·스크롤·입력창과의 겹침을 확인한다. 숫자와 `N/2^k`, `log₂N`, `O(log N)` 같은 표현도 일반 텍스트로 읽을 수 있어야 한다.
- 질문 없는 마무리 확인: `binary-search-01-sufficient`의 본문 101자·질문 null로 불필요한 빈 질문 영역이 생기지 않는지 확인한다.
- 기존 최대 265자를 앱의 상한으로 삼거나 실제 발화를 잘라내지 않는다. 좁은 화면·큰 글꼴·키보드가 열린 상태에서도 원문 전체와 답변 입력에 접근 가능한지 확인한다. 이 문서만으로 실제 줄 수나 높이를 정할 수는 없다.
- 프롬프트 권장 길이·Markdown 금지는 별도 후속 수정이다. 현재 프롬프트나 shared 계약에 이를 강제하는 새 규칙을 이번 작업에서 추가하지 않았다. 기존 출력 최대값을 그대로 프롬프트 제한으로 채택하지 않는다.

## 재현 방법

저장소 루트에서 다음 JavaScript를 Node.js로 실행하면 전체·행동별 분포와 사례별 길이를 재계산할 수 있다. 네트워크·API 키·유료 호출은 필요 없다.

```javascript
const fs = require('node:fs');
const rows = fs.readFileSync('ai/evals/runs/2026-11-02-4508b79/results.jsonl', 'utf8')
  .trim().split(/\r?\n/).map(JSON.parse);
if (rows.length !== 22 || new Set(rows.map(x => x.id)).size !== 22) {
  throw new Error('22개의 고유 사례가 필요합니다.');
}
const length = text => Array.from(text).length;
const cases = rows.map(row => {
  if (row.result.ok !== true) throw new Error(row.id);
  const { action, message, question } = row.result.output.response;
  if (typeof message !== 'string' || (question !== null && typeof question !== 'string')) {
    throw new Error(row.id);
  }
  return { id: row.id, action, message: length(message),
    question: question === null ? null : length(question),
    combined: length(message) + (question === null ? 0 : 2 + length(question)) };
});
const stats = values => {
  const a = [...values].sort((x, y) => x - y);
  const n = a.length;
  return { n, min: a[0], median: n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2,
    mean: Math.round(a.reduce((x, y) => x + y, 0) / n * 10) / 10,
    p90: a[Math.ceil(n * 0.9) - 1], max: a[n - 1] };
};
console.log({ message: stats(cases.map(x => x.message)),
  questionNonNull: stats(cases.filter(x => x.question !== null).map(x => x.question)),
  combined: stats(cases.map(x => x.combined)),
  byAction: Object.fromEntries([...new Set(cases.map(x => x.action))]
    .map(action => [action, stats(cases.filter(x => x.action === action).map(x => x.combined))])) });
console.table(cases);
```

## FE에 전달할 문장 초안

> 기존 실제 출력 22개의 길이를 추가 유료 호출 없이 측정했습니다. 본문은 중앙값 73자·최대 219자, 질문이 있는 14개의 질문은 중앙값 48자·최대 68자였습니다. 본문과 질문을 빈 줄로 연결하면 중앙값 107.5자·최대 265자입니다. 이는 원본 공백을 포함한 Unicode 코드 포인트 수이고 토큰 수나 화면 줄 수는 아닙니다. 관측 최대값을 상한으로 쓰지 않고 전체 발화를 보존하는 줄바꿈·스크롤 기준으로 참고 부탁드립니다. 사례별 수치와 확인할 예시는 `ai/evals/outputLengthReport.md`에 기록했습니다. 프롬프트의 권장 길이·Markdown 금지는 아직 별도 후속 작업입니다.

이 문장과 문서는 아직 GitHub에 게시하거나 팀에 전달하지 않았다. commit·push 후 PR #16에 요약과 문서 링크를 공유할 수 있다.
