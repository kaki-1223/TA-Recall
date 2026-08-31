import { describe, expect, it } from 'vitest'
import {
  archiveQuestion,
  convertLegacyFollowUp,
  createFollowUp,
  createQuestion,
  createQuestionId,
  getActiveQuestions,
  getArchivedQuestions,
  linkFollowUp,
  removeLegacyFollowUp,
  removeNote,
  restoreQuestion,
  unlinkFollowUp,
  updateQuestion,
  upsertNote,
} from '../data/questionStore'
import type { PersonalNote, Question, QuestionInput } from '../types/question'

function makeQuestion(id: string, patch: Partial<Question> = {}): Question {
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
    tags: [],
    sources: [],
    archived: false,
    ...patch,
  }
}

function makeInput(title: string, patch: Partial<QuestionInput> = {}): QuestionInput {
  return {
    category: 'Shader 与渲染',
    title,
    difficulty: '中等',
    shortAnswer: '简答内容',
    keyPoints: ['关键词'],
    explanation: '解释内容',
    followUpQuestionIds: [],
    relatedProjects: [],
    tags: ['标签'],
    sources: [],
    ...patch,
  }
}

describe('createQuestion / createQuestionId', () => {
  it('生成 local- 前缀 id，archived 默认 false，followUps 恒为空', () => {
    const q = createQuestion(makeInput('新题'), [])
    expect(q.id.startsWith('local-')).toBe(true)
    expect(q.archived).toBe(false)
    expect(q.followUps).toEqual([])
    expect(q.title).toBe('新题')
  })

  it('生成的 id 不与现有题目冲突', () => {
    const id = createQuestionId([makeQuestion('local-abc-123')])
    expect(id).not.toBe('local-abc-123')
  })
})

describe('updateQuestion', () => {
  it('更新内容但保持 id、归档状态与遗留文本追问不变', () => {
    const bank = [
      makeQuestion('q1', {
        archived: true,
        followUps: ['旧文本追问'],
        followUpQuestionIds: ['q2'],
      }),
    ]
    const result = updateQuestion(bank, 'q1', makeInput('新标题', { title: '新标题', followUpQuestionIds: ['q3'] }))
    expect(result[0].title).toBe('新标题')
    expect(result[0].id).toBe('q1')
    expect(result[0].archived).toBe(true)
    expect(result[0].followUps).toEqual(['旧文本追问'])
    expect(result[0].followUpQuestionIds).toEqual(['q3'])
  })
})

describe('archiveQuestion / restoreQuestion / 筛选', () => {
  it('归档与恢复只翻转标记', () => {
    const bank = [makeQuestion('q1')]
    expect(archiveQuestion(bank, 'q1')[0].archived).toBe(true)
    expect(restoreQuestion(archiveQuestion(bank, 'q1'), 'q1')[0].archived).toBe(false)
  })

  it('getActiveQuestions 排除归档，getArchivedQuestions 只含归档', () => {
    const bank = [makeQuestion('q1'), makeQuestion('q2', { archived: true })]
    expect(getActiveQuestions(bank).map((q) => q.id)).toEqual(['q1'])
    expect(getArchivedQuestions(bank).map((q) => q.id)).toEqual(['q2'])
  })
})

describe('createFollowUp', () => {
  it('创建子题（标题、分类继承父题）并建立关联', () => {
    const bank = [makeQuestion('p')]
    const { bank: next, child } = createFollowUp(bank, 'p', '新的追问')
    expect(next).toHaveLength(2)
    expect(child.title).toBe('新的追问')
    expect(child.category).toBe('图形学基础')
    expect(next.find((q) => q.id === 'p')?.followUpQuestionIds).toEqual([child.id])
  })

  it('父题不存在时抛错', () => {
    expect(() => createFollowUp([makeQuestion('q1')], 'missing', '追问')).toThrow()
  })
})

describe('convertLegacyFollowUp', () => {
  it('创建子题（标题=文本、分类继承）、父题关联并移除原文，一次完成', () => {
    const bank = [makeQuestion('parent', { followUps: ['追问一', '追问二'] })]
    const { bank: next, child } = convertLegacyFollowUp(bank, 'parent', '追问一')

    expect(next).toHaveLength(2)
    expect(child.title).toBe('追问一')
    expect(child.category).toBe('图形学基础')
    const parent = next.find((q) => q.id === 'parent')
    expect(parent?.followUps).toEqual(['追问二'])
    expect(parent?.followUpQuestionIds).toEqual([child.id])
  })

  it('父题不存在时抛错', () => {
    expect(() => convertLegacyFollowUp([makeQuestion('q1')], 'missing', '追问')).toThrow()
  })
})

describe('linkFollowUp / unlinkFollowUp', () => {
  it('关联已有题目，重复关联去重', () => {
    const bank = [makeQuestion('p'), makeQuestion('c')]
    const once = linkFollowUp(bank, 'p', 'c')
    const twice = linkFollowUp(once, 'p', 'c')
    expect(twice.find((q) => q.id === 'p')?.followUpQuestionIds).toEqual(['c'])
  })

  it('自关联与目标不存在时不做任何修改', () => {
    const bank = [makeQuestion('p'), makeQuestion('c')]
    expect(linkFollowUp(bank, 'p', 'p')).toEqual(bank)
    expect(linkFollowUp(bank, 'p', 'missing')).toEqual(bank)
  })

  it('解除关联只移除 id，不删除子题目', () => {
    const bank = [makeQuestion('p', { followUpQuestionIds: ['c'] }), makeQuestion('c')]
    const result = unlinkFollowUp(bank, 'p', 'c')
    expect(result.find((q) => q.id === 'p')?.followUpQuestionIds).toEqual([])
    expect(result.map((q) => q.id)).toEqual(['p', 'c'])
  })
})

describe('upsertNote', () => {
  it('新增笔记并持久化，同一题目只保留最新一条', () => {
    const notes: PersonalNote[] = []
    const first = upsertNote(notes, 'q1', '第一条', '2026-08-01T00:00:00.000Z')
    const second = upsertNote(first, 'q1', '第二条', '2026-08-04T00:00:00.000Z')
    expect(second).toHaveLength(1)
    expect(second[0].content).toBe('第二条')
    expect(second[0].updatedAt).toBe('2026-08-04T00:00:00.000Z')
  })

  it('不同题目的笔记互不影响', () => {
    const first = upsertNote([], 'q1', '笔记一', '2026-08-01T00:00:00.000Z')
    const result = upsertNote(first, 'q2', '笔记二', '2026-08-04T00:00:00.000Z')
    expect(result).toHaveLength(2)
  })
})

describe('removeNote', () => {
  it('删除指定题目的笔记，其他题目保留', () => {
    const notes: PersonalNote[] = [
      { questionId: 'q1', content: '笔记一', updatedAt: '2026-08-01T00:00:00.000Z' },
      { questionId: 'q2', content: '笔记二', updatedAt: '2026-08-01T00:00:00.000Z' },
    ]
    const next = removeNote(notes, 'q1')
    expect(next.map((n) => n.questionId)).toEqual(['q2'])
  })
})

describe('removeLegacyFollowUp', () => {
  it('移除指定文本，不影响其他文本与正式关联', () => {
    const bank = [makeQuestion('p', { followUps: ['追问一', '追问二'], followUpQuestionIds: ['c'] })]
    const next = removeLegacyFollowUp(bank, 'p', '追问一')
    expect(next[0].followUps).toEqual(['追问二'])
    expect(next[0].followUpQuestionIds).toEqual(['c'])
  })
})
