let cachedPaperFile: File | null = null;
let cachedAnswerFile: File | null = null;

export function setUploadedFiles(paper: File | null, answer: File | null = null) {
  cachedPaperFile = paper;
  cachedAnswerFile = answer;
}

export function getUploadedFiles(): { paper: File | null; answer: File | null } {
  return {
    paper: cachedPaperFile,
    answer: cachedAnswerFile,
  };
}

export function setUploadedFile(file: File | null) {
  cachedPaperFile = file;
}

export function getUploadedFile(): File | null {
  return cachedPaperFile;
}
