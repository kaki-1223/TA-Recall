import type { PersonalNote, Question, QuestionInput, ReviewRecord, ReviewStatus } from '../types/question'
import {
  analyzeImport,
  mergeQuestionBanks,
  normalizeQuestion,
  validateQuestionList,
} from '../utils/questionBank'
import { applyReview } from '../utils/review'
import {
  loadPersonalNotes,
  loadQuestionBank,
  loadReviewRecords,
  savePersonalNotes,
  saveQuestionBank,
  saveReviewRecords,
} from '../utils/storage'
import seedData from './questions.json'

/**
 * 统一数据层：页面组件只能从这里访问本地数据，
 * 不得直接调用 utils/storage 或 localStorage（见 docs/PRODUCT.md §2.5 / CLAUDE.md）。
 */

// 内置 JSON 仅作为种子数据（归一化补齐可选字段）
const seed = (seedData as Question[]).map(normalizeQuestion)

/** 首次启动：以内置 JSON 为种子初始化到本地存储；否则读取持久化题库并归一化 */
export function loadInitialQuestions(): Question[] {
  return loadQuestionBank(seed)
}

/** 持久化题库，返回是否成功；失败时调用方应保持原数据不变 */
export function persistQuestionBank(questions: Question[]): boolean {
  return saveQuestionBank(questions)
}

/** 普通视图（题库/复习/今日/错题本）可见的题目：排除归档 */
export function getActiveQuestions(questions: Question[]): Question[] {
  return questions.filter((q) => !q.archived)
}

/** 归档题目（数据管理页展示） */
export function getArchivedQuestions(questions: Question[]): Question[] {
  return questions.filter((q) => q.archived)
}

/** 生成题目 id（local- 前缀；与库内已有 id 冲突时重新生成） */
export function createQuestionId(existing: Question[]): string {
  const ids = new Set(existing.map((q) => q.id))
  let id: string
  do {
    id = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  } while (ids.has(id))
  return id
}

/** 新增题目：生成 id，返回新题目（不持久化，由调用方保存） */
export function createQuestion(input: QuestionInput, existing: Question[]): Question {
  return {
    ...input,
    id: createQuestionId(existing),
    followUps: [],
    archived: false,
  }
}

/** 更新题目内容：id、归档状态、遗留文本追问保持不变（复习记录不受影响） */
export function updateQuestion(bank: Question[], id: string, input: QuestionInput): Question[] {
  return bank.map((q) =>
    q.id === id ? { ...q, ...input, id: q.id, archived: q.archived, followUps: q.followUps } : q,
  )
}

/** 归档题目（不影响复习记录与个人笔记） */
export function archiveQuestion(bank: Question[], id: string): Question[] {
  return bank.map((q) => (q.id === id ? { ...q, archived: true } : q))
}

/** 恢复归档题目 */
export function restoreQuestion(bank: Question[], id: string): Question[] {
  return bank.map((q) => (q.id === id ? { ...q, archived: false } : q))
}

/** 创建追问子题并挂到父题下（标题=给定文本，分类继承父题），返回新题库与子题 */
export function createFollowUp(
  bank: Question[],
  parentId: string,
  title: string,
): { bank: Question[]; child: Question } {
  const parent = bank.find((q) => q.id === parentId)
  if (parent === undefined) {
    throw new Error(`创建追问题目失败：题目不存在（${parentId}）`)
  }
  const child = createQuestion(
    {
      category: parent.category,
      title,
      difficulty: '基础',
      shortAnswer: '',
      keyPoints: [],
      explanation: '',
      followUpQuestionIds: [],
      relatedProjects: [],
      tags: [],
      sources: [],
    },
    bank,
  )
  return { bank: linkFollowUp([...bank, child], parentId, child.id), child }
}

/**
 * 遗留文本追问转为正式题目：创建子题（标题预填文本、分类继承父题）→
 * 父题关联子题 → 移除原文，一次完成。父题不存在时抛错（调用方保证存在）。
 */
export function convertLegacyFollowUp(
  bank: Question[],
  parentId: string,
  text: string,
): { bank: Question[]; child: Question } {
  const parent = bank.find((q) => q.id === parentId)
  if (parent === undefined) {
    throw new Error(`转追问题目失败：题目不存在（${parentId}）`)
  }
  const { bank: withChild, child } = createFollowUp(bank, parentId, text)
  const bankWithTextRemoved = withChild.map((q) =>
    q.id === parentId ? { ...q, followUps: q.followUps.filter((item) => item !== text) } : q,
  )
  return { bank: bankWithTextRemoved, child }
}

/** 关联已有题目为追问（去重；自关联、目标不存在时不做任何修改） */
export function linkFollowUp(bank: Question[], parentId: string, childId: string): Question[] {
  if (parentId === childId) return bank
  const childExists = bank.some((q) => q.id === childId)
  if (!childExists) return bank
  return bank.map((q) => {
    if (q.id !== parentId) return q
    if (q.followUpQuestionIds.includes(childId)) return q
    return { ...q, followUpQuestionIds: [...q.followUpQuestionIds, childId] }
  })
}

/** 解除追问关联（只断开关联，不删除子题目） */
export function unlinkFollowUp(bank: Question[], parentId: string, childId: string): Question[] {
  return bank.map((q) =>
    q.id === parentId
      ? { ...q, followUpQuestionIds: q.followUpQuestionIds.filter((id) => id !== childId) }
      : q,
  )
}

/** 移除一条遗留文本追问（仅删除该条文本，不影响任何正式题目与关联） */
export function removeLegacyFollowUp(bank: Question[], parentId: string, text: string): Question[] {
  return bank.map((q) =>
    q.id === parentId ? { ...q, followUps: q.followUps.filter((item) => item !== text) } : q,
  )
}

/** 读取复习记录 */
export function loadAllReviewRecords(): ReviewRecord[] {
  return loadReviewRecords()
}

/** 记录一次复习并立即持久化，返回更新后的记录列表 */
export function recordReview(
  records: ReviewRecord[],
  questionId: string,
  status: ReviewStatus,
  now: string,
): ReviewRecord[] {
  const next = applyReview(records, questionId, status, now)
  saveReviewRecords(next)
  return next
}

/** 读取个人笔记 */
export function loadAllNotes(): PersonalNote[] {
  return loadPersonalNotes()
}

/** 保存一条笔记（同一题目只保留最新一条）并持久化，返回更新后的列表 */
export function upsertNote(
  notes: PersonalNote[],
  questionId: string,
  content: string,
  now: string,
): PersonalNote[] {
  const next = [...notes.filter((n) => n.questionId !== questionId), { questionId, content, updatedAt: now }]
  savePersonalNotes(next)
  return next
}

/** 删除个人笔记（保存空内容即清除）并持久化，返回更新后的列表 */
export function removeNote(notes: PersonalNote[], questionId: string): PersonalNote[] {
  const next = notes.filter((n) => n.questionId !== questionId)
  savePersonalNotes(next)
  return next
}

// 导入相关的分析/合并/校验统一从数据层导出，组件不直接引用 utils/questionBank
export { analyzeImport, mergeQuestionBanks, validateQuestionList }
export type { ImportAnalysis, ImportIssue, ValidatedEntry } from '../utils/questionBank'
