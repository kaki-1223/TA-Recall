import { describe, expect, it } from 'vitest'
import type { Question } from '../types/question'
import { filterQuestions, getAllCategories, getAllTags, type FilterState } from '../utils/filter'

function makeQuestion(id: string, patch: Partial<Question>): Question {
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
    ...patch,
  }
}

const questions: Question[] = [
  makeQuestion('q2', { category: 'Shader 与渲染', title: 'PBR 光照流程', tags: ['PBR', '光照'] }),
  makeQuestion('q1', { category: '图形学基础', title: '渲染管线', tags: ['管线', 'GPU'] }),
  makeQuestion('q3', { category: '图形学基础', title: '伽马校正', tags: ['色彩'] }),
]

const emptyFilter: FilterState = { category: null, tag: null, keyword: '' }

describe('filterQuestions', () => {
  it('无筛选时返回全部并按 id 排序', () => {
    expect(filterQuestions(questions, emptyFilter).map((q) => q.id)).toEqual(['q1', 'q2', 'q3'])
  })

  it('按分类筛选', () => {
    const result = filterQuestions(questions, { ...emptyFilter, category: '图形学基础' })
    expect(result.map((q) => q.id)).toEqual(['q1', 'q3'])
  })

  it('按标签筛选', () => {
    const result = filterQuestions(questions, { ...emptyFilter, tag: 'PBR' })
    expect(result.map((q) => q.id)).toEqual(['q2'])
  })

  it('按关键词搜索标题', () => {
    const result = filterQuestions(questions, { ...emptyFilter, keyword: '渲染' })
    expect(result.map((q) => q.id)).toEqual(['q1'])
  })

  it('关键词可匹配标签，且大小写不敏感', () => {
    const result = filterQuestions(questions, { ...emptyFilter, keyword: 'pbr' })
    expect(result.map((q) => q.id)).toEqual(['q2'])
  })

  it('关键词忽略首尾空格', () => {
    const result = filterQuestions(questions, { ...emptyFilter, keyword: '  伽马  ' })
    expect(result.map((q) => q.id)).toEqual(['q3'])
  })

  it('组合筛选（分类 + 关键词）', () => {
    const result = filterQuestions(questions, { ...emptyFilter, category: '图形学基础', keyword: '校正' })
    expect(result.map((q) => q.id)).toEqual(['q3'])
  })

  it('无匹配时返回空数组', () => {
    expect(filterQuestions(questions, { ...emptyFilter, keyword: '不存在的词' })).toEqual([])
  })
})

describe('getAllCategories / getAllTags', () => {
  it('返回去重后的分类（保持数据顺序）', () => {
    expect(getAllCategories(questions)).toEqual(['Shader 与渲染', '图形学基础'])
  })

  it('返回去重并排序后的标签', () => {
    expect(getAllTags(questions)).toEqual(['GPU', 'PBR', '光照', '管线', '色彩'])
  })
})
