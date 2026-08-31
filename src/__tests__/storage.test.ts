import { beforeEach, describe, expect, it } from 'vitest'
import type { PersonalNote, Question, ReviewRecord } from '../types/question'
import {
  loadPersonalNotes,
  loadQuestionBank,
  loadReviewRecords,
  NOTES_STORAGE_KEY,
  QUESTION_STORAGE_KEY,
  REVIEW_STORAGE_KEY,
  savePersonalNotes,
  saveQuestionBank,
  saveReviewRecords,
} from '../utils/storage'

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

const seedQuestions: Question[] = [makeQuestion('q1')]

beforeEach(() => {
  localStorage.clear()
})

describe('storage', () => {
  it('无数据时返回空数组', () => {
    expect(loadReviewRecords()).toEqual([])
  })

  it('保存后可完整读回', () => {
    const records: ReviewRecord[] = [
      { questionId: 'q1', status: 'unknown', lastReviewedAt: '2026-08-04T00:00:00.000Z', reviewCount: 1 },
      { questionId: 'q2', status: 'mastered', lastReviewedAt: '2026-08-03T00:00:00.000Z', reviewCount: 5 },
    ]
    saveReviewRecords(records)
    expect(loadReviewRecords()).toEqual(records)
  })

  it('损坏的 JSON 返回空数组且不抛错', () => {
    localStorage.setItem(REVIEW_STORAGE_KEY, '{oops')
    expect(loadReviewRecords()).toEqual([])
  })

  it('非数组 JSON 返回空数组', () => {
    localStorage.setItem(REVIEW_STORAGE_KEY, '{"questionId":"q1"}')
    expect(loadReviewRecords()).toEqual([])
  })

  it('过滤形状不符的条目，保留有效条目', () => {
    localStorage.setItem(
      REVIEW_STORAGE_KEY,
      JSON.stringify([
        { questionId: 'q1', status: 'unknown', lastReviewedAt: '2026-08-04T00:00:00.000Z', reviewCount: 1 },
        { questionId: 'q2', status: 'expert', lastReviewedAt: '2026-08-04T00:00:00.000Z', reviewCount: 1 },
        { questionId: 'q3', status: 'fuzzy', lastReviewedAt: '2026-08-04T00:00:00.000Z', reviewCount: -1 },
        { questionId: 'q4', status: 'fuzzy', lastReviewedAt: 'not-a-date', reviewCount: 1 },
        { questionId: '', status: 'fuzzy', lastReviewedAt: '2026-08-04T00:00:00.000Z', reviewCount: 1 },
        null,
        'not-an-object',
      ]),
    )
    expect(loadReviewRecords().map((r) => r.questionId)).toEqual(['q1'])
  })
})

describe('题库存储', () => {
  it('无持久化数据时使用种子题库', () => {
    expect(loadQuestionBank(seedQuestions)).toEqual(seedQuestions)
  })

  it('保存后可完整读回', () => {
    const bank = [makeQuestion('q1'), makeQuestion('q2')]
    expect(saveQuestionBank(bank)).toBe(true)
    expect(loadQuestionBank(seedQuestions)).toEqual(bank)
  })

  it('损坏 JSON 回退到种子题库', () => {
    localStorage.setItem(QUESTION_STORAGE_KEY, '{broken')
    expect(loadQuestionBank(seedQuestions)).toEqual(seedQuestions)
  })

  it('校验失败的题库数据回退到种子题库', () => {
    localStorage.setItem(QUESTION_STORAGE_KEY, JSON.stringify([{ id: 'q1' }]))
    expect(loadQuestionBank(seedQuestions)).toEqual(seedQuestions)
  })
})

describe('个人笔记存储', () => {
  it('无数据时返回空数组', () => {
    expect(loadPersonalNotes()).toEqual([])
  })

  it('保存后可完整读回', () => {
    const notes: PersonalNote[] = [
      { questionId: 'q1', content: '笔记内容', updatedAt: '2026-08-04T10:00:00.000Z' },
    ]
    expect(savePersonalNotes(notes)).toBe(true)
    expect(loadPersonalNotes()).toEqual(notes)
  })

  it('损坏 JSON 返回空数组', () => {
    localStorage.setItem(NOTES_STORAGE_KEY, '{broken')
    expect(loadPersonalNotes()).toEqual([])
  })

  it('过滤无效条目（内容非字符串、时间无效）', () => {
    localStorage.setItem(
      NOTES_STORAGE_KEY,
      JSON.stringify([
        { questionId: 'q1', content: '有效', updatedAt: '2026-08-04T10:00:00.000Z' },
        { questionId: 'q2', content: 42, updatedAt: '2026-08-04T10:00:00.000Z' },
        { questionId: 'q3', content: '时间无效', updatedAt: '不是时间' },
        null,
      ]),
    )
    expect(loadPersonalNotes().map((n) => n.questionId)).toEqual(['q1'])
  })
})
