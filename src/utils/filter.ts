import type { Question } from '../types/question'

export interface FilterState {
  /** null 表示全部分类 */
  category: string | null
  /** null 表示全部标签 */
  tag: string | null
  keyword: string
}

/** 从题库数据派生分类列表，避免与数据漂移 */
export function getAllCategories(questions: Question[]): string[] {
  return [...new Set(questions.map((q) => q.category))]
}

/** 从题库数据派生标签列表，按字典序排列 */
export function getAllTags(questions: Question[]): string[] {
  return [...new Set(questions.flatMap((q) => q.tags))].sort()
}

/** 关键词匹配范围：标题、简答、详细解释、标签 */
function matchesKeyword(question: Question, keyword: string): boolean {
  const haystack = [question.title, question.shortAnswer, question.explanation, ...question.tags]
    .join(' ')
    .toLowerCase()
  return haystack.includes(keyword)
}

/** 应用分类/标签/关键词筛选，结果按 id 排序 */
export function filterQuestions(questions: Question[], filter: FilterState): Question[] {
  const keyword = filter.keyword.trim().toLowerCase()
  return questions
    .filter((q) => filter.category === null || q.category === filter.category)
    .filter((q) => filter.tag === null || q.tags.includes(filter.tag))
    .filter((q) => keyword === '' || matchesKeyword(q, keyword))
    .sort((a, b) => a.id.localeCompare(b.id))
}
