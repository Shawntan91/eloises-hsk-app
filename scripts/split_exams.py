import json
import os

def split_exams():
    input_path = "src/data/hskExams.json"
    output_dir = "src/data/exams"
    manifest_path = "src/data/examManifest.json"
    service_path = "src/services/examService.ts"

    os.makedirs(output_dir, exist_ok=True)

    with open(input_path, "r", encoding="utf-8") as f:
        exams = json.load(f)

    manifest_list = []
    exam_ids = []

    for exam in exams:
        exam_id = exam["id"]
        exam_ids.append(exam_id)

        # Compute sections summary
        questions = exam.get("questions", [])
        sections_summary = {}
        for cat in ["听力", "阅读", "书写"]:
            cat_qs = [q for q in questions if q.get("partCategory") == cat]
            if cat_qs:
                nums = [q.get("number", 0) for q in cat_qs]
                min_n = min(nums)
                max_n = max(nums)
                sections_summary[cat] = {
                    "count": len(cat_qs),
                    "start": min_n,
                    "end": max_n,
                    "isContiguous": (max_n - min_n + 1 == len(cat_qs))
                }

        manifest_item = {
            "id": exam["id"],
            "level": exam.get("level", 4),
            "title": exam.get("title", ""),
            "titleKo": exam.get("titleKo", ""),
            "subTitle": exam.get("subTitle", ""),
            "subTitleKo": exam.get("subTitleKo", ""),
            "tag": exam.get("tag", ""),
            "tagKo": exam.get("tagKo", ""),
            "durationMinutes": exam.get("durationMinutes", 105),
            "duration": exam.get("duration", 105 * 60),
            "questionCount": exam.get("questionCount", len(questions)),
            "hasOfficialAnswers": exam.get("hasOfficialAnswers", True),
            "audioUrl": exam.get("audioUrl"),
            "audioFileName": exam.get("audioFileName"),
            "sections": sections_summary,
        }
        manifest_list.append(manifest_item)

        # Write individual exam file
        exam_file_path = os.path.join(output_dir, f"{exam_id}.json")
        with open(exam_file_path, "w", encoding="utf-8") as f_out:
            json.dump(exam, f_out, ensure_ascii=False, indent=2)

    # Write manifest
    with open(manifest_path, "w", encoding="utf-8") as f_mf:
        json.dump(manifest_list, f_mf, ensure_ascii=False, indent=2)

    # Write TypeScript service
    loader_lines = []
    for eid in exam_ids:
        loader_lines.append(f'  "{eid}": () => import("@/data/exams/{eid}.json"),')

    service_content = f"""import manifestData from "@/data/examManifest.json";
import {{ Exam }} from "@/types/exam";

export interface ExamManifestItem {{
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
    {{
      count: number;
      start: number;
      end: number;
      isContiguous: boolean;
    }}
  >;
}}

export const examManifest: ExamManifestItem[] = manifestData as ExamManifestItem[];

export function getExamManifest(): ExamManifestItem[] {{
  return examManifest;
}}

export function getExamManifestById(id: string): ExamManifestItem | undefined {{
  return examManifest.find((e) => e.id === id);
}}

const examLoaders: Record<string, () => Promise<any>> = {{
{chr(10).join(loader_lines)}
}};

export async function loadExamById(id: string): Promise<Exam | null> {{
  const loader = examLoaders[id];
  if (!loader) {{
    console.warn(`[examService] No dynamic loader registered for exam id: ${{id}}`);
    return null;
  }}
  try {{
    const module = await loader();
    const data = module.default || module;
    return data as Exam;
  }} catch (err) {{
    console.error(`[examService] Failed to load exam module for ${{id}}:`, err);
    return null;
  }}
}}
"""

    with open(service_path, "w", encoding="utf-8") as f_srv:
        f_srv.write(service_content)

    print(f"Split {len(exams)} exams successfully!")
    print(f"Manifest written to {manifest_path} ({os.path.getsize(manifest_path)} bytes)")
    print(f"Service written to {service_path}")

if __name__ == "__main__":
    split_exams()
