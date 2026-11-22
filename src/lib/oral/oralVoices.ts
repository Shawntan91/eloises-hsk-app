// 口语可切换的 Edge 中文声音（纯数据模块，不依赖任何 Node 库，
// 客户端组件和服务端路由都可以安全 import）
export interface OralVoiceOption {
  id: string;
  nameZh: string;
  nameKo: string;
  gender: "female" | "male";
}

/** 口语可切换的 Edge 中文声音（晓晓/云希为各场景的默认声音） */
export const ORAL_VOICES: OralVoiceOption[] = [
  { id: "zh-CN-XiaoxiaoNeural", nameZh: "晓晓", nameKo: "샤오샤오", gender: "female" },
  { id: "zh-CN-YunxiNeural", nameZh: "云希", nameKo: "윈시", gender: "male" },
  { id: "zh-CN-XiaoyiNeural", nameZh: "晓伊", nameKo: "샤오이", gender: "female" },
  { id: "zh-CN-YunjianNeural", nameZh: "云健", nameKo: "윈젠", gender: "male" },
  { id: "zh-CN-XiaomengNeural", nameZh: "晓梦", nameKo: "샤오멍", gender: "female" },
  { id: "zh-CN-YunyangNeural", nameZh: "云扬", nameKo: "윈양", gender: "male" },
];

/** 口语自选声音的本地存储键（eloise_ 前缀，会随云同步） */
export const ORAL_VOICE_STORAGE_KEY = "eloise_oral_voice";

export function getOralVoiceName(id: string, isZh: boolean): string {
  const found = ORAL_VOICES.find((v) => v.id === id);
  if (!found) return isZh ? "默认" : "기본";
  return isZh ? found.nameZh : found.nameKo;
}
