import { describe, expect, it } from 'vitest'
import type { Question } from '../types/question'
import {
  analyzeImport,
  mergeQuestionBanks,
  normalizeQuestion,
  validateQuestionList,
  type ValidatedEntry,
} from '../utils/questionBank'

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

function makeRaw(id: string, patch: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...makeQuestion(id), ...patch }
}

function entry(question: Question, hasExplicitArchived = false): ValidatedEntry {
  return { question, hasExplicitArchived }
}

describe('validateQuestionList', () => {
  it('合法列表全部通过，可选字段填充默认值', () => {
    const result = validateQuestionList([makeRaw('q1'), makeRaw('q2')])
    expect(result.issues).toEqual([])
    expect(result.entries).toHaveLength(2)
    expect(result.entries[0].question.followUpQuestionIds).toEqual([])
    expect(result.entries[0].question.archived).toBe(false)
    // makeRaw 显式携带 archived 字段，故标记为 true（缺省场景见下一条用例）
    expect(result.entries[0].hasExplicitArchived).toBe(true)
  })

  it('显式 archived 字段被保留并标记', () => {
    const result = validateQuestionList([makeRaw('q1', { archived: true })])
    expect(result.entries[0].question.archived).toBe(true)
    expect(result.entries[0].hasExplicitArchived).toBe(true)
  })

  it('缺失可选字段（followUps/followUpQuestionIds/archived）不报错', () => {
    const withoutOptional: Record<string, unknown> = {
      id: 'q1',
      category: '图形学基础',
      title: '题目 q1',
      difficulty: '基础',
      shortAnswer: '简答',
      keyPoints: ['关键词'],
      explanation: '解释',
      relatedProjects: [],
      tags: [],
      sources: [],
    }
    const result = validateQuestionList([withoutOptional])
    expect(result.issues).toEqual([])
    const q = result.entries[0].question
    expect(q.followUps).toEqual([])
    expect(q.followUpQuestionIds).toEqual([])
    expect(q.archived).toBe(false)
  })

  it('非数组返回文件级错误', () => {
    const result = validateQuestionList({ id: 'q1' })
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0].index).toBe(-1)
    expect(result.entries).toEqual([])
  })

  it('非对象条目报错', () => {
    const result = validateQuestionList([null, 'text'])
    expect(result.issues).toHaveLength(2)
  })

  it('缺少必需字段时列出字段名，可选字段不误报', () => {
    const result = validateQuestionList([{ id: 'q1', title: 'T' }])
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0].message).toContain('缺少字段 category')
    expect(result.issues[0].message).toContain('缺少字段 explanation')
    expect(result.issues[0].message).not.toContain('缺少字段 followUps')
  })

  it('类型错误报错：无效分类/难度、空标题、数组字段非字符串数组', () => {
    const bad = makeRaw('q1', {
      category: '不存在的分类',
      difficulty: '专家',
      title: '',
      tags: ['ok', 42],
    })
    const message = validateQuestionList([bad]).issues[0].message
    expect(message).toContain('category 不是有效分类')
    expect(message).toContain('difficulty 不是有效难度')
    expect(message).toContain('title 必须是非空字符串')
    expect(message).toContain('tags 必须是字符串数组')
  })

  it('archived 非布尔值报错', () => {
    const result = validateQuestionList([makeRaw('q1', { archived: 'yes' })])
    expect(result.issues[0].message).toContain('archived 必须是布尔值')
  })

  it('followUpQuestionIds 非字符串数组报错', () => {
    const result = validateQuestionList([makeRaw('q1', { followUpQuestionIds: [1] })])
    expect(result.issues[0].message).toContain('followUpQuestionIds 必须是字符串数组')
  })

  it('id 为空报错', () => {
    const result = validateQuestionList([makeRaw('q1', { id: '' })])
    expect(result.issues[0].message).toContain('id 必须是非空字符串')
  })

  it('文件内重复 id 视为校验失败', () => {
    const result = validateQuestionList([makeRaw('q1'), makeRaw('q1')])
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0].message).toContain('重复 id')
    expect(result.entries).toEqual([])
  })

  it('一次性收集所有条目的错误', () => {
    const result = validateQuestionList([makeRaw('q1'), { id: 'bad' }, makeRaw('q3', { title: '' })])
    expect(result.issues).toHaveLength(2)
    expect(result.issues[0].id).toBe('bad')
  })
})

describe('normalizeQuestion', () => {
  it('缺失可选字段时填充默认值', () => {
    const raw = makeQuestion('q1') as Partial<Question>
    delete raw.followUpQuestionIds
    delete raw.archived
    const q = normalizeQuestion(raw as Question)
    expect(q.followUpQuestionIds).toEqual([])
    expect(q.archived).toBe(false)
  })
})

describe('analyzeImport', () => {
  it('内容轴按 id 分类为新增/更新/无变化', () => {
    const existing = [makeQuestion('q1', { title: '旧标题' }), makeQuestion('q2')]
    const incoming = [entry(makeQuestion('q1', { title: '新标题' })), entry(makeQuestion('q2')), entry(makeQuestion('q3'))]
    const result = analyzeImport(existing, incoming)
    expect(result.additions.map((q) => q.id)).toEqual(['q3'])
    expect(result.updates.map((q) => q.id)).toEqual(['q1'])
    expect(result.unchanged.map((q) => q.id)).toEqual(['q2'])
    expect(result.toArchive).toEqual([])
    expect(result.toRestore).toEqual([])
  })

  it('内容比较与字段键顺序无关', () => {
    const a = makeQuestion('q1', { title: '相同' })
    const b: Question = {
      sources: [],
      tags: [],
      relatedProjects: [],
      followUpQuestionIds: [],
      followUps: [],
      explanation: '解释',
      keyPoints: ['关键词'],
      shortAnswer: '简答',
      difficulty: '基础',
      title: '相同',
      category: '图形学基础',
      id: 'q1',
      archived: false,
    }
    const result = analyzeImport([a], [entry(b)])
    expect(result.unchanged.map((q) => q.id)).toEqual(['q1'])
    expect(result.updates).toEqual([])
  })

  it('内容比较忽略额外字段', () => {
    const a = makeQuestion('q1')
    const b = { ...makeQuestion('q1'), extraField: 'extra' }
    const result = analyzeImport([a], [entry(b)])
    expect(result.unchanged.map((q) => q.id)).toEqual(['q1'])
  })

  it('归档轴：显式 archived: true 计入将归档，内容相同仍为无变化', () => {
    const existing = [makeQuestion('q1')]
    const incoming = [entry(makeQuestion('q1', { archived: true }), true)]
    const result = analyzeImport(existing, incoming)
    expect(result.unchanged.map((q) => q.id)).toEqual(['q1'])
    expect(result.toArchive.map((q) => q.id)).toEqual(['q1'])
    expect(result.toRestore).toEqual([])
  })

  it('归档轴：显式 archived: false 计入将恢复', () => {
    const existing = [makeQuestion('q1', { archived: true })]
    const incoming = [entry(makeQuestion('q1', { archived: false }), true)]
    const result = analyzeImport(existing, incoming)
    expect(result.toRestore.map((q) => q.id)).toEqual(['q1'])
    expect(result.toArchive).toEqual([])
  })

  it('归档轴：未显式包含 archived 的条目不产生归档变化', () => {
    const existing = [makeQuestion('q1', { archived: true })]
    const incoming = [entry(makeQuestion('q1', { archived: false }), false)]
    const result = analyzeImport(existing, incoming)
    expect(result.toArchive).toEqual([])
    expect(result.toRestore).toEqual([])
  })

  it('新 id 带 archived: true 只计入新增，不计入将归档', () => {
    const incoming = [entry(makeQuestion('q9', { archived: true }), true)]
    const result = analyzeImport([], incoming)
    expect(result.additions.map((q) => q.id)).toEqual(['q9'])
    expect(result.toArchive).toEqual([])
  })

  it('内容不同 + 显式归档变化时同时计入更新与归档轴', () => {
    const existing = [makeQuestion('q1', { title: '旧' })]
    const incoming = [entry(makeQuestion('q1', { title: '新', archived: true }), true)]
    const result = analyzeImport(existing, incoming)
    expect(result.updates.map((q) => q.id)).toEqual(['q1'])
    expect(result.toArchive.map((q) => q.id)).toEqual(['q1'])
  })
})

describe('mergeQuestionBanks', () => {
  it('新 id 追加到末尾，相同 id 替换且保持原位置', () => {
    const existing = [makeQuestion('q1', { title: '旧' }), makeQuestion('q2')]
    const incoming = [entry(makeQuestion('q3')), entry(makeQuestion('q1', { title: '新' }))]
    const merged = mergeQuestionBanks(existing, incoming)
    expect(merged.map((q) => q.id)).toEqual(['q1', 'q2', 'q3'])
    expect(merged[0].title).toBe('新')
  })

  it('未显式 archived 的条目保留现有归档状态', () => {
    const existing = [makeQuestion('q1', { archived: true })]
    const incoming = [entry(makeQuestion('q1', { archived: false }), false)]
    const merged = mergeQuestionBanks(existing, incoming)
    expect(merged[0].archived).toBe(true)
  })

  it('显式 archived 字段同步归档状态', () => {
    const existing = [makeQuestion('q1')]
    const incoming = [entry(makeQuestion('q1', { archived: true }), true)]
    expect(mergeQuestionBanks(existing, incoming)[0].archived).toBe(true)
  })

  it('新 id 的 archived 作为初始状态', () => {
    const incoming = [entry(makeQuestion('q9', { archived: true }), true)]
    expect(mergeQuestionBanks([], incoming)[0].archived).toBe(true)
  })
})
