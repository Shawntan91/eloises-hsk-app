import manifestData from "@/data/examManifest.json";
import { Exam } from "@/types/exam";

export interface ExamManifestItem {
  id: string;
  level: number;
  title: string;
  titleKo?: string;
  subTitle?: string;
  subTitleKo?: string;
  tag?: string;
  tagKo?: string;
  durationMinutes: number;
  duration?: number;
  questionCount: number;
  hasOfficialAnswers?: boolean;
  audioUrl?: string;
  audioFileName?: string;
  sections?: Record<
    string,
    {
      count: number;
      start: number;
      end: number;
      isContiguous: boolean;
    }
  >;
}

export const examManifest: ExamManifestItem[] = manifestData as ExamManifestItem[];

export function getExamManifest(): ExamManifestItem[] {
  return examManifest;
}

export function getExamManifestById(id: string): ExamManifestItem | undefined {
  return examManifest.find((e) => e.id === id);
}

const examLoaders: Record<string, () => Promise<any>> = {
  "hsk4-h41221": () => import("@/data/exams/hsk4-h41221.json"),
  "hsk4-h41327": () => import("@/data/exams/hsk4-h41327.json"),
  "hsk4-h41328": () => import("@/data/exams/hsk4-h41328.json"),
  "hsk4-h41329": () => import("@/data/exams/hsk4-h41329.json"),
  "hsk4-h41330": () => import("@/data/exams/hsk4-h41330.json"),
  "hsk4-h41331": () => import("@/data/exams/hsk4-h41331.json"),
  "hsk4-h41333": () => import("@/data/exams/hsk4-h41333.json"),
  "hsk4-h41553b": () => import("@/data/exams/hsk4-h41553b.json"),
  "hsk4-h41553c": () => import("@/data/exams/hsk4-h41553c.json"),
  "hsk4-h41111": () => import("@/data/exams/hsk4-h41111.json"),
  "hsk4-h41332": () => import("@/data/exams/hsk4-h41332.json"),
  "hsk4-h41553d": () => import("@/data/exams/hsk4-h41553d.json"),
  "hsk4-sample": () => import("@/data/exams/hsk4-sample.json"),
  "hsk5-h51553": () => import("@/data/exams/hsk5-h51553.json"),
  "hsk5-h51218": () => import("@/data/exams/hsk5-h51218.json"),
  "hsk5-h51219": () => import("@/data/exams/hsk5-h51219.json"),
  "hsk5-h51220": () => import("@/data/exams/hsk5-h51220.json"),
  "hsk5-h51221": () => import("@/data/exams/hsk5-h51221.json"),
  "hsk5-h51327": () => import("@/data/exams/hsk5-h51327.json"),
  "hsk5-h51328": () => import("@/data/exams/hsk5-h51328.json"),
  "hsk5-h51329": () => import("@/data/exams/hsk5-h51329.json"),
  "hsk5-h51330": () => import("@/data/exams/hsk5-h51330.json"),
  "hsk5-h51553b": () => import("@/data/exams/hsk5-h51553b.json"),
  "hsk5-h51553c": () => import("@/data/exams/hsk5-h51553c.json"),
  "hsk5-h51553d": () => import("@/data/exams/hsk5-h51553d.json"),
  // Legacy ID aliases for backward compatibility
  "hsk4-01": () => import("@/data/exams/hsk4-h41111.json"),
  "hsk4-02": () => import("@/data/exams/hsk4-h41332.json"),
  "hsk4-03": () => import("@/data/exams/hsk4-h41553d.json"),
  "hsk4-04": () => import("@/data/exams/hsk4-sample.json"),
  "hsk5-01": () => import("@/data/exams/hsk5-h51553.json"),
};

export async function loadExamById(id: string): Promise<Exam | null> {
  const loader = examLoaders[id];
  if (!loader) {
    console.warn(`[examService] No dynamic loader registered for exam id: ${id}`);
    return null;
  }
  try {
    const module = await loader();
    const data = module.default || module;
    return data as Exam;
  } catch (err) {
    console.error(`[examService] Failed to load exam module for ${id}:`, err);
    return null;
  }
}
