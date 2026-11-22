/**
 * 与客户端 cloudSync.ts 中的白名单一致。服务端再校验一次，crafted 请求也无法走私被禁的键。
 *
 * 同步：所有 hskapp: 前缀的键（考试、成绩、错题、单词进度、学习统计等），
 * 以及 eloise_ 前缀的键（掌握/收藏单词、学习进度、错题、活动日志、跟读记录、壁纸设置等）。
 * 不同步：
 *  - eloise_hsk_ai_config：含 API 密钥，永不同步。
 *  - hskapp:backup_snapshot：整库快照，又大又重复。
 *  - legacy 的 hsk_exam_* / hsk_result_* / hsk_highlights_* 旧键：应用自己会迁移到 hskapp: 键。
 *  - hsk_sync_*：同步引擎自身的本地元数据（不进库）。
 */
export function isSyncableKey(key: string): boolean {
  if (typeof key !== 'string' || key.length === 0 || key.length > 128) return false;
  if (key.startsWith('hsk_sync_')) return false;
  if (key === 'eloise_hsk_ai_config') return false;
  if (key === 'hskapp:backup_snapshot') return false;
  if (key.startsWith('hskapp:')) return true;
  if (key.startsWith('eloise_')) return true;
  return false;
}
