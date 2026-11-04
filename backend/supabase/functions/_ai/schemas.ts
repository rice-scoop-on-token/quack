import { z } from "zod";

const text = z.string().trim().min(1);

const responseSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("ask"), message: text, question: text }),
  z.strictObject({
    action: z.literal("correct"),
    message: text,
    question: z.null(),
  }),
  z.strictObject({
    action: z.literal("acknowledge"),
    message: text,
    question: z.null(),
  }),
  z.strictObject({
    action: z.literal("explain"),
    message: text,
    question: text,
  }),
]);

// 평가용 임시 구조이며 앱에 공개할 shared 계약과 분리한다.
const outputShapeSchema = z.strictObject({
  answer: z.strictObject({
    status: z.enum(["correct", "incorrect", "not_applicable", "unverified"]),
    reason: text,
  }),
  understanding: z.strictObject({
    status: z.enum(["sufficient", "insufficient", "ambiguous", "unverified"]),
    reason: text,
  }),
  independent_performance: z.strictObject({
    scope: text,
    status: z.enum(["confirmed", "unverified"]),
    assistance: z.array(text),
    reason: text,
  }),
  omissions: z.array(z.strictObject({ concept: text, reason: text })),
  errors: z.array(z.strictObject({
    kind: z.enum(["conceptual", "calculation", "undetermined"]),
    statement: text,
    reason: text,
  })),
  confirmed_concepts: z.array(
    z.strictObject({ concept: text, evidence: text }),
  ),
  response: responseSchema,
});

// JSON Schema는 형태를 나타내며, 필드 간 조합은 수신 후 추가 검증한다.
export const aiAnalysisOutputJsonSchema = z.toJSONSchema(outputShapeSchema);

export const aiAnalysisOutputSchema = outputShapeSchema.superRefine(
  (output, ctx) => {
    const { action } = output.response;
    const hasConceptualError = output.errors.some((error) =>
      error.kind === "conceptual"
    );

    if (output.understanding.status === "sufficient" && hasConceptualError) {
      ctx.addIssue({
        code: "custom",
        path: ["understanding", "status"],
        message: "확인된 개념 오류가 있는 설명을 충분으로 처리할 수 없습니다.",
      });
    }

    if (
      output.understanding.status === "sufficient" &&
      output.omissions.length > 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["understanding", "status"],
        message:
          "목표에 필요한 설명이 누락됐는데 전체 이해를 충분으로 처리할 수 없습니다.",
      });
    }

    if (action === "ask" && output.understanding.status === "sufficient") {
      ctx.addIssue({
        code: "custom",
        path: ["response", "action"],
        message: "충분한 설명 뒤에 확인 질문을 강제로 붙이지 않습니다.",
      });
    }

    if (
      output.understanding.status === "insufficient" &&
      output.omissions.length === 0 && output.errors.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["understanding", "status"],
        message:
          "부족 판정에는 실제 확인한 누락 또는 오류의 근거가 필요합니다.",
      });
    }

    if (
      action === "correct" && (
        output.understanding.status !== "sufficient" ||
        output.errors.length === 0 ||
        output.errors.some((error) => error.kind !== "calculation")
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["response", "action"],
        message:
          "짧은 계산 교정은 개념·접근이 충분하고 계산 오류만 확인된 경우에 사용합니다.",
      });
    }

    if (
      action === "acknowledge" && (
        output.understanding.status === "insufficient" ||
        output.understanding.status === "ambiguous" ||
        output.errors.length > 0 ||
        output.omissions.length > 0
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["response", "action"],
        message:
          "확인할 누락·오류나 모호한 표현을 짧은 인정만으로 종료할 수 없습니다.",
      });
    }

    if (
      action === "explain" && (
        output.understanding.status !== "unverified" ||
        output.omissions.length > 0 ||
        output.errors.length > 0 || output.confirmed_concepts.length > 0 ||
        output.independent_performance.status !== "unverified"
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["response", "action"],
        message:
          "해설 요청 응답 자체로 학습자의 이해·오류·독립 수행을 확정하지 않습니다.",
      });
    }
  },
);

export type AiAnalysisOutput = z.infer<typeof aiAnalysisOutputSchema>;

// 실패 결과를 호출자에게 돌려줘 잘못된 출력을 충분 판정으로 대체하지 않게 한다.
export function validateAiAnalysisOutput(value: unknown) {
  return aiAnalysisOutputSchema.safeParse(value);
}
