import type { Category, Difficulty, Question, QuestionInput } from '../types/question'

export interface ImportIssue {
  /** 条目索引（从 0 开始），-1 表示整个文件级别的问题 */
  index: number
  /** 可识别时的条目 id */
  id?: string
  message: string
}

/** 通过校验的导入条目：题目已归一化，并保留"是否显式包含 archived"信息（见 §2.5 归档同步规则） */
export interface ValidatedEntry {
  question: Question
  hasExplicitArchived: boolean
}

export const CATEGORY_VALUES: readonly Category[] = [
  '图形学基础',
  'Shader 与渲染',
  'Unity',
  '性能优化',
  '数学与编程',
  '作品集追问',
  '综合场景题',
]

export const DIFFICULTY_VALUES: readonly Difficulty[] = ['基础', '中等', '困难']

/** 参与内容比较的字段（忽略额外字段与键顺序；不含 archived，归档状态走独立分析轴） */
const CONTENT_FIELDS: (keyof Question)[] = [
  'id',
  'category',
  'title',
  'difficulty',
  'shortAnswer',
  'keyPoints',
  'explanation',
  'followUps',
  'followUpQuestionIds',
  'relatedProjects',
  'tags',
  'sources',
]

/** 必需字段（followUps/followUpQuestionIds/archived 为可选，缺失有默认值） */
const REQUIRED_FIELDS: (keyof Question)[] = [
  'id',
  'category',
  'title',
  'difficulty',
  'shortAnswer',
  'keyPoints',
  'explanation',
  'relatedProjects',
  'tags',
  'sources',
]

const REQUIRED_ARRAY_FIELDS = ['keyPoints', 'relatedProjects', 'tags', 'sources'] as const

/** 可选数组字段：缺失默认 [] */
const OPTIONAL_ARRAY_FIELDS = ['followUps', 'followUpQuestionIds'] as const

function isStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

/** 表单校验：返回字段 → 错误信息（空对象表示通过） */
export function validateQuestionInput(input: QuestionInput): Record<string, string> {
  const errors: Record<string, string> = {}
  if (input.title.trim() === '') errors.title = '问题标题不能为空'
  if (!CATEGORY_VALUES.includes(input.category)) errors.category = '请选择有效分类'
  if (!DIFFICULTY_VALUES.includes(input.difficulty)) errors.difficulty = '请选择有效难度'
  if (input.shortAnswer.trim() === '') errors.shortAnswer = '30 秒简答不能为空'
  if (input.explanation.trim() === '') errors.explanation = '详细解释不能为空'
  return errors
}

/** 归一化题目：可选字段填充默认值（兼容旧版数据与旧导出文件） */
export function normalizeQuestion(question: Question): Question {
  const raw = question as Partial<Question>
  return {
    ...question,
    followUps: raw.followUps ?? [],
    followUpQuestionIds: raw.followUpQuestionIds ?? [],
    archived: raw.archived ?? false,
  }
}

/**
 * 全量校验导入内容（docs/PRODUCT.md §4.1 字段要求 + 文件内 id 唯一），
 * 一次性收集所有可识别错误；存在任意错误时 entries 为空。
 */
export function validateQuestionList(value: unknown): { entries: ValidatedEntry[]; issues: ImportIssue[] } {
  if (!Array.isArray(value)) {
    return { entries: [], issues: [{ index: -1, message: '导入内容不是数组' }] }
  }

  const issues: ImportIssue[] = []
  const entries: ValidatedEntry[] = []
  const seenIds = new Set<string>()

  value.forEach((item, index) => {
    const prefix = `第 ${index + 1} 条`
    if (typeof item !== 'object' || item === null) {
      issues.push({ index, message: `${prefix}：不是对象` })
      return
    }

    const q = item as Record<string, unknown>
    const problems: string[] = []

    for (const field of REQUIRED_FIELDS) {
      if (!(field in q)) problems.push(`缺少字段 ${field}`)
    }
    if (typeof q.id !== 'string' || q.id === '') problems.push('id 必须是非空字符串')
    if (!CATEGORY_VALUES.includes(q.category as Category)) problems.push('category 不是有效分类')
    if (typeof q.title !== 'string' || q.title === '') problems.push('title 必须是非空字符串')
    if (!DIFFICULTY_VALUES.includes(q.difficulty as Difficulty)) problems.push('difficulty 不是有效难度')
    if (typeof q.shortAnswer !== 'string' || q.shortAnswer === '') {
      problems.push('shortAnswer 必须是非空字符串')
    }
    if (typeof q.explanation !== 'string' || q.explanation === '') {
      problems.push('explanation 必须是非空字符串')
    }
    for (const field of REQUIRED_ARRAY_FIELDS) {
      if (!isStringArray(q[field])) problems.push(`${field} 必须是字符串数组`)
    }
    for (const field of OPTIONAL_ARRAY_FIELDS) {
      if (field in q && !isStringArray(q[field])) problems.push(`${field} 必须是字符串数组`)
    }
    if ('archived' in q && typeof q.archived !== 'boolean') {
      problems.push('archived 必须是布尔值')
    }

    if (problems.length > 0) {
      issues.push({
        index,
        id: typeof q.id === 'string' && q.id !== '' ? q.id : undefined,
        message: `${prefix}：${problems.join('；')}`,
      })
      return
    }

    const id = q.id as string
    if (seenIds.has(id)) {
      issues.push({ index, id, message: `${prefix}（id: ${id}）：重复 id` })
      return
    }
    seenIds.add(id)
    entries.push({
      question: normalizeQuestion(item as Question),
      hasExplicitArchived: 'archived' in q,
    })
  })

  // 存在任何无效条目时整体拒绝（原子性）：不返回任何题目
  if (issues.length > 0) return { entries: [], issues }
  return { entries, issues }
}

export interface ImportAnalysis {
  /** 内容轴：新 id */
  additions: Question[]
  /** 内容轴：相同 id 且内容不同 */
  updates: Question[]
  /** 内容轴：相同 id 且内容相同 */
  unchanged: Question[]
  /** 归档轴：现有未归档 → 导入条目显式 archived: true */
  toArchive: Question[]
  /** 归档轴：现有已归档 → 导入条目显式 archived: false */
  toRestore: Question[]
}

function sameContent(a: Question, b: Question): boolean {
  return JSON.stringify(a, CONTENT_FIELDS) === JSON.stringify(b, CONTENT_FIELDS)
}

/**
 * 对比现有题库：内容轴按 id 分类（新增/更新/无变化），
 * 归档轴单独统计（仅显式包含 archived 且与现状不同的条目）。
 */
export function analyzeImport(existing: Question[], incoming: ValidatedEntry[]): ImportAnalysis {
  const existingById = new Map(existing.map((q) => [q.id, q]))
  const additions: Question[] = []
  const updates: Question[] = []
  const unchanged: Question[] = []
  const toArchive: Question[] = []
  const toRestore: Question[] = []

  for (const { question, hasExplicitArchived } of incoming) {
    const old = existingById.get(question.id)
    if (old === undefined) {
      additions.push(question)
      continue
    }
    if (sameContent(old, question)) unchanged.push(question)
    else updates.push(question)

    if (hasExplicitArchived && question.archived !== old.archived) {
      if (question.archived) toArchive.push(question)
      else toRestore.push(question)
    }
  }
  return { additions, updates, unchanged, toArchive, toRestore }
}

/**
 * 合并题库：新 id 追加到末尾，相同 id 用导入内容替换（保持原位置）；
 * 仅当条目显式包含 archived 字段时同步归档状态，否则保留现有状态。
 */
export function mergeQuestionBanks(existing: Question[], incoming: ValidatedEntry[]): Question[] {
  const byId = new Map(existing.map((q) => [q.id, q]))
  for (const { question, hasExplicitArchived } of incoming) {
    const existingQuestion = byId.get(question.id)
    const archived =
      existingQuestion !== undefined && !hasExplicitArchived ? existingQuestion.archived : question.archived
    byId.set(question.id, { ...question, archived })
  }
  return [...byId.values()]
}
