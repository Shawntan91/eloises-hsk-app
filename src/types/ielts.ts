export type IeltsTheme = "standard" | "yellow" | "blue" | "dark";
export type IeltsFontSize = "normal" | "large" | "xlarge";

export interface IeltsHighlight {
  id: string;
  passageId: string;
  text: string;
  color: "yellow" | "blue";
  note?: string;
  createdAt: number;
}

export interface IeltsPassageGroup {
  passageId: string;
  passageTitle: string;
  passageContent: string;
  questionIndices: number[];
  questionNumbers: number[];
}
