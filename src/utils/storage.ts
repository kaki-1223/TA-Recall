import type { PersonalNote, Question, ReviewRecord, ReviewStatus } from '../types/question'
import { validateQuestionList } from './questionBank'

export const REVIEW_STORAGE_KEY = 'ta-recall.review-records'

export const QUESTION_STORAGE_KEY = 'ta-recall.question-bank'

export const NOTES_STORAGE_KEY = 'ta-recall.personal-notes'

/** 读取题库：localStorage 数据有效时使用，否则回退到内置种子题库 */
export function loadQuestionBank(seed: Question[]): Question[] {
  const raw = localStorage.getItem(QUESTION_STORAGE_KEY)
  if (raw === null) return seed
  try {
    const parsed: unknown = JSON.parse(raw)
    const { entries, issues } = validateQuestionList(parsed)
    if (issues.length === 0 && entries.length > 0) return entries.map((entry) => entry.question)
    return seed
  } catch {
    return seed
  }
}

/** 保存题库，返回是否成功；失败时调用方应保持原数据不变 */
export function saveQuestionBank(questions: Question[]): boolean {
  try {
    localStorage.setItem(QUESTION_STORAGE_KEY, JSON.stringify(questions))
    return true
  } catch (error) {
    console.warn('保存题库失败：', error)
    return false
  }
}

/** 校验 localStorage 中的单条复习记录，不符合形状的丢弃 */
export function isReviewRecord(value: unknown): value is ReviewRecord {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.questionId === 'string' &&
    record.questionId !== '' &&
    typeof record.status === 'string' &&
    (VALID_STATUSES as string[]).includes(record.status) &&
    typeof record.lastReviewedAt === 'string' &&
    record.lastReviewedAt !== '' &&
    !Number.isNaN(Date.parse(record.lastReviewedAt)) &&
    typeof record.reviewCount === 'number' &&
    Number.isInteger(record.reviewCount) &&
    record.reviewCount >= 0
  )
}

const VALID_STATUSES: ReviewStatus[] = ['unknown', 'fuzzy', 'understood', 'mastered']

/** 读取复习记录；JSON 损坏或形状不符时返回空数组，不抛错 */
export function loadReviewRecords(): ReviewRecord[] {
  const raw = localStorage.getItem(REVIEW_STORAGE_KEY)
  if (raw === null) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isReviewRecord)
  } catch {
    return []
  }
}

/** 保存复习记录；localStorage 写入失败（如配额）时仅告警，不中断流程 */
export function saveReviewRecords(records: ReviewRecord[]): void {
  try {
    localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(records))
  } catch (error) {
    console.warn('保存复习记录失败：', error)
  }
}

/** 校验 localStorage 中的单条个人笔记 */
export function isPersonalNote(value: unknown): value is PersonalNote {
  if (typeof value !== 'object' || value === null) return false
  const note = value as Record<string, unknown>
  return (
    typeof note.questionId === 'string' &&
    note.questionId !== '' &&
    typeof note.content === 'string' &&
    typeof note.updatedAt === 'string' &&
    !Number.isNaN(Date.parse(note.updatedAt))
  )
}

/** 读取个人笔记；损坏数据返回空数组 */
export function loadPersonalNotes(): PersonalNote[] {
  const raw = localStorage.getItem(NOTES_STORAGE_KEY)
  if (raw === null) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isPersonalNote)
  } catch {
    return []
  }
}

/** 保存个人笔记，返回是否成功 */
export function savePersonalNotes(notes: PersonalNote[]): boolean {
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes))
    return true
  } catch (error) {
    console.warn('保存个人笔记失败：', error)
    return false
  }
}
