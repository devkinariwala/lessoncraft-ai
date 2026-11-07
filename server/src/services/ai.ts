
import { GoogleGenAI } from "@google/genai";
import type { Lesson, QCReport, Source } from "../types.js";

const client = () => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing. Create a key in Google AI Studio, add it to server/.env, and restart the server.",
    );
  }

  return new GoogleGenAI({ apiKey });
};

const model = () => process.env.GEMINI_MODEL || "gemini-2.5-flash";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const status = (error as { status?: number }).status;

  return [500, 502, 503, 504].includes(status ?? 0);
}

function extractJSON<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(
      "Gemini returned an invalid JSON response. Please retry generation.",
    );
  }
}

async function generateJSON(
  prompt: string,
  systemInstruction: string,
  temperature: number,
): Promise<string> {
  const MAX_ATTEMPTS = 4;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await client().models.generateContent({
        model: model(),
        contents: prompt,
        config: {
          systemInstruction,
          temperature,
          responseMimeType: "application/json",
        },
      });

      const text = response.text;

      if (!text) {
        throw new Error(
          "Gemini returned an empty response. Please retry.",
        );
      }

      return text;
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt === MAX_ATTEMPTS) {
        break;
      }

      const delay = 2000 * Math.pow(2, attempt - 1);

      console.warn(
        `Gemini temporary error. Retrying attempt ${attempt + 1}/${MAX_ATTEMPTS} in ${delay / 1000}s...`,
      );

      await sleep(delay);
    }
  }

  if (isRetryableError(lastError)) {
    throw new Error(
      "Gemini is temporarily unavailable after multiple attempts. Please try again in a few minutes.",
    );
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Gemini generation failed. Please retry.");
}

export async function generateLesson(
  title: string,
  objective: string,
  sources: Source[],
): Promise<Lesson> {
  const prompt = `Create a rigorous, engaging lesson for a 45-minute session. Return ONLY valid JSON matching this schema: {"title":string,"objective":string,"estimatedMinutes":45,"audience":string,"prerequisites":string[],"outcomes":string[],"sections":[{"title":string,"duration":number,"content":string,"examples":string[],"activity":string}],"knowledgeCheck":[{"question":string,"options":string[],"answer":string,"explanation":string}],"takeaways":string[]}. Use 5-7 sections whose durations sum to exactly 45. Include clear explanations, accurate examples and practical applications. Include 4-6 knowledge-check questions with answer and explanation. Be precise; qualify uncertainty; do not invent facts or citations. Cite sources inline as [S1], [S2] where relevant. The references are provided separately. Title: ${title}. Learning objective: ${objective}. Research material: ${JSON.stringify(sources)}.`;

  const raw = await generateJSON(
    prompt,
    "You are an expert instructional designer and careful subject-matter researcher. Never fabricate evidence.",
    0.25,
  );

  const lesson = extractJSON<Omit<Lesson, "sources">>(raw);

  const total =
    lesson.sections?.reduce(
      (n, section) => n + Number(section.duration || 0),
      0,
    ) || 0;

  if (!lesson.sections?.length || total !== 45) {
    throw new Error(
      `Generated lesson duration must total 45 minutes (received ${total}). Retry generation.`,
    );
  }

  return { ...lesson, estimatedMinutes: 45, sources };
}

export async function runResearchQC(lesson: Lesson): Promise<QCReport> {
  const prompt = `Audit this lesson independently for factual accuracy and research quality. Do not assume the lesson is correct. Inspect technical claims, unsupported assertions, source relevance/credibility, gaps, contradictions, and misleading simplifications. Sources may be links only; do not claim you opened/read a source unless its supplied metadata supports that. Return JSON: {"status":"PASS"|"NEEDS_REVIEW"|"FAIL","score":0-100,"summary":string,"issues":[{"severity":"Critical"|"High"|"Medium"|"Low","location":string,"issue":string,"recommendation":string}]}. Be conservative and flag claims that need verification. Lesson: ${JSON.stringify(lesson)}`;

  return callQC("research", prompt);
}

export async function runInstructionalQC(
  lesson: Lesson,
): Promise<QCReport> {
  const prompt = `Audit this lesson independently for instructional quality. Evaluate alignment with the stated learning objective, sequencing, clarity, scaffolding, examples, practical application, assessment quality, accessibility of explanations, and whether the time budget is realistic and totals 45 minutes. Return JSON: {"status":"PASS"|"NEEDS_REVIEW"|"FAIL","score":0-100,"summary":string,"issues":[{"severity":"Critical"|"High"|"Medium"|"Low","location":string,"issue":string,"recommendation":string}]}. Be specific and actionable. Lesson: ${JSON.stringify(lesson)}`;

  return callQC("instructional", prompt);
}

async function callQC(
  layer: "research" | "instructional",
  prompt: string,
): Promise<QCReport> {
  const raw = await generateJSON(
    prompt,
    "You are an independent quality auditor. Evaluate the submitted content critically and return structured audit findings.",
    0.1,
  );

  const result = extractJSON<Omit<QCReport, "layer" | "checkedAt">>(raw);

  return {
    ...result,
    layer,
    checkedAt: new Date().toISOString(),
    issues: result.issues || [],
  };
}
