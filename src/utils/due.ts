import type { Question, ReviewRecord, ReviewStatus } from '../types/question'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * 复习间隔（天）。null 表示该状态始终在今日队列。
 * 决策（用户确认）：固定间隔 + 状态优先——不会/模糊常驻，基本掌握 7 天、熟练 30 天到期。
 */
const INTERVAL_DAYS: Record<ReviewStatus, number | null> = {
  unknown: null,
  fuzzy: null,
  understood: 7,
  mastered: 30,
}

/**
 * 队列优先级：1 不会 → 2 模糊 → 3 到期 → 4 从未复习；null 表示今天不需要复习。
 */
export function getPriority(record: ReviewRecord | undefined, now: string): number | null {
  if (record === undefined) return 4
  if (INTERVAL_DAYS[record.status] === null) {
    return record.status === 'unknown' ? 1 : 2
  }
  return isDue(record, now) ? 3 : null
}

/** 是否到期：上次复习时间 + 间隔 <= now；日期无效视为未到期 */
export function isDue(record: ReviewRecord, now: string): boolean {
  const intervalDays = INTERVAL_DAYS[record.status]
  if (intervalDays === null) return true
  const last = Date.parse(record.lastReviewedAt)
  if (Number.isNaN(last)) return false
  return Date.parse(now) - last >= intervalDays * DAY_MS
}

/** 今日复习队列：按优先级排序（同优先级保持题库顺序） */
export function getTodayQueue(
  questions: Question[],
  records: ReviewRecord[],
  now: string,
): Question[] {
  const recordByQuestionId = new Map(records.map((r) => [r.questionId, r]))
  return questions
    .map((question) => ({ question, priority: getPriority(recordByQuestionId.get(question.id), now) }))
    .filter(
      (entry): entry is { question: Question; priority: number } => entry.priority !== null,
    )
    .sort((a, b) => a.priority - b.priority)
    .map((entry) => entry.question)
}
