import { describe, expect, it } from 'vitest'
import type { ReviewRecord } from '../types/question'
import { applyReview } from '../utils/review'

const NOW = '2026-08-04T10:00:00.000Z'

describe('applyReview', () => {
  it('无记录时新建记录，reviewCount 为 1', () => {
    const result = applyReview([], 'q1', 'unknown', NOW)
    expect(result).toEqual([
      { questionId: 'q1', status: 'unknown', lastReviewedAt: NOW, reviewCount: 1 },
    ])
  })

  it('已有记录时更新状态与时间并累加次数', () => {
    const records: ReviewRecord[] = [
      { questionId: 'q1', status: 'unknown', lastReviewedAt: '2026-08-01T00:00:00.000Z', reviewCount: 3 },
    ]
    const result = applyReview(records, 'q1', 'mastered', NOW)
    expect(result).toEqual([
      { questionId: 'q1', status: 'mastered', lastReviewedAt: NOW, reviewCount: 4 },
    ])
  })

  it('不影响其他题目的记录', () => {
    const records: ReviewRecord[] = [
      { questionId: 'q2', status: 'fuzzy', lastReviewedAt: '2026-08-01T00:00:00.000Z', reviewCount: 1 },
    ]
    const result = applyReview(records, 'q1', 'understood', NOW)
    expect(result).toHaveLength(2)
    expect(result[1]).toEqual({
      questionId: 'q1',
      status: 'understood',
      lastReviewedAt: NOW,
      reviewCount: 1,
    })
    expect(result[0]).toEqual(records[0])
  })

  it('不修改原数组（不可变更新）', () => {
    const records: ReviewRecord[] = [
      { questionId: 'q1', status: 'unknown', lastReviewedAt: '2026-08-01T00:00:00.000Z', reviewCount: 1 },
    ]
    applyReview(records, 'q1', 'mastered', NOW)
    expect(records[0].status).toBe('unknown')
    expect(records).toHaveLength(1)
  })
})
