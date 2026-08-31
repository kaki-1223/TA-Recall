import { describe, expect, it } from 'vitest'
import type { Question, ReviewRecord, ReviewStatus } from '../types/question'
import { getPriority, getTodayQueue, isDue } from '../utils/due'

const NOW = '2026-08-04T10:00:00.000Z'

function makeQuestion(id: string): Question {
  return {
    id,
    category: '图形学基础',
    title: `题目 ${id}`,
    difficulty: '基础',
    shortAnswer: '简答',
    keyPoints: ['关键词'],
    explanation: '解释',
    followUps: [],
    followUpQuestionIds: [],
    relatedProjects: [],
    archived: false,
    tags: [],
    sources: [],
  }
}

function makeRecord(questionId: string, status: ReviewStatus, lastReviewedAt: string): ReviewRecord {
  return { questionId, status, lastReviewedAt, reviewCount: 1 }
}

describe('getPriority', () => {
  it('从未复习为 4', () => {
    expect(getPriority(undefined, NOW)).toBe(4)
  })

  it('不会为 1、模糊为 2，且无论复习时间多久都在队列', () => {
    const old = '2026-01-01T00:00:00.000Z'
    expect(getPriority(makeRecord('q', 'unknown', old), NOW)).toBe(1)
    expect(getPriority(makeRecord('q', 'fuzzy', old), NOW)).toBe(2)
  })

  it('基本掌握 7 天到期：6 天前不在队列，7 天前到期', () => {
    const sixDaysAgo = '2026-07-29T10:00:00.000Z'
    const sevenDaysAgo = '2026-07-28T10:00:00.000Z'
    expect(getPriority(makeRecord('q', 'understood', sixDaysAgo), NOW)).toBeNull()
    expect(getPriority(makeRecord('q', 'understood', sevenDaysAgo), NOW)).toBe(3)
  })

  it('熟练 30 天到期：29 天前不在队列，30 天前到期', () => {
    const twentyNineDaysAgo = '2026-07-06T10:00:00.000Z'
    const thirtyDaysAgo = '2026-07-05T10:00:00.000Z'
    expect(getPriority(makeRecord('q', 'mastered', twentyNineDaysAgo), NOW)).toBeNull()
    expect(getPriority(makeRecord('q', 'mastered', thirtyDaysAgo), NOW)).toBe(3)
  })

  it('无效日期视为未到期', () => {
    expect(isDue(makeRecord('q', 'understood', 'not-a-date'), NOW)).toBe(false)
  })
})

describe('getTodayQueue', () => {
  it('按 不会 → 模糊 → 到期 → 未复习 排序', () => {
    const questions = [
      makeQuestion('q1'), // 未复习 → 4
      makeQuestion('q2'), // 不会 → 1
      makeQuestion('q3'), // 熟练 30 天前 → 到期 3
      makeQuestion('q4'), // 模糊 → 2
      makeQuestion('q5'), // 熟练 1 天前 → 不进队列
    ]
    const records = [
      makeRecord('q2', 'unknown', NOW),
      makeRecord('q3', 'mastered', '2026-07-05T10:00:00.000Z'),
      makeRecord('q4', 'fuzzy', NOW),
      makeRecord('q5', 'mastered', '2026-08-03T10:00:00.000Z'),
    ]
    expect(getTodayQueue(questions, records, NOW).map((q) => q.id)).toEqual(['q2', 'q4', 'q3', 'q1'])
  })

  it('全部近期复习未到期时返回空队列', () => {
    const records = [makeRecord('q1', 'mastered', '2026-08-03T10:00:00.000Z')]
    expect(getTodayQueue([makeQuestion('q1')], records, NOW)).toEqual([])
  })

  it('无记录时所有题都进入队列', () => {
    const questions = [makeQuestion('q1'), makeQuestion('q2')]
    expect(getTodayQueue(questions, [], NOW).map((q) => q.id)).toEqual(['q1', 'q2'])
  })

  it('空题库返回空队列', () => {
    expect(getTodayQueue([], [], NOW)).toEqual([])
  })
})
