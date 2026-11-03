// 앞 단어의 받침 여부로 조사를 고른다. 한글로 끝나지 않으면(예: TCP) 받침을 알 수 없어 두 형태를 함께 쓴다.
export function josa(word: string, withBatchim: string, withoutBatchim: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (!(code >= 0 && code <= 11171)) {
    return `${withBatchim}(${withoutBatchim})`;
  }
  return code % 28 === 0 ? withoutBatchim : withBatchim;
}
