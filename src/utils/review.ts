import type { ReviewRecord, ReviewStatus } from '../types/question'

/**
 * 记录一次复习（纯函数）：无记录则新建，已有则更新状态并累加次数。
 * now 由调用方传入（ISO 时间戳），便于测试。
 */
export function applyReview(
  records: ReviewRecord[],
  questionId: string,
  status: ReviewStatus,
  now: string,
): ReviewRecord[] {
  const existing = records.find((r) => r.questionId === questionId)
  if (existing === undefined) {
    return [...records, { questionId, status, lastReviewedAt: now, reviewCount: 1 }]
  }
  return records.map((r) =>
    r.questionId === questionId
      ? { ...r, status, lastReviewedAt: now, reviewCount: r.reviewCount + 1 }
      : r,
  )
}
