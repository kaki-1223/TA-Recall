export type Category =
  | '图形学基础'
  | 'Shader 与渲染'
  | 'Unity'
  | '性能优化'
  | '数学与编程'
  | '作品集追问'
  | '综合场景题'

export type Difficulty = '基础' | '中等' | '困难'

/** 个人复习状态（与题目分离，见 docs/PRODUCT.md §4.2） */
export type ReviewStatus = 'unknown' | 'fuzzy' | 'understood' | 'mastered'

export interface Question {
  id: string
  category: Category
  title: string
  difficulty: Difficulty
  /** 30 秒简答 */
  shortAnswer: string
  /** 回答关键词 */
  keyPoints: string[]
  /** 详细解释 */
  explanation: string
  /** 遗留字段：旧版文本追问（仅向后兼容展示/转换，新数据恒为 []） */
  followUps: string[]
  /** 追问题目 id 列表（父 → 子单向关联，见 docs/PRODUCT.md §4.4） */
  followUpQuestionIds: string[]
  /** 相关项目 */
  relatedProjects: string[]
  tags: string[]
  /** 资料来源 */
  sources: string[]
  /** 归档标记，默认 false（见 docs/PRODUCT.md §2.6） */
  archived: boolean
}

/** 表单输入：不含 id/archived/followUps（id 由数据层生成，archived 默认 false，followUps 恒为 []） */
export type QuestionInput = Omit<Question, 'id' | 'archived' | 'followUps'>

export interface ReviewRecord {
  questionId: string
  status: ReviewStatus
  /** ISO 时间戳 */
  lastReviewedAt: string
  /** 累计复习次数 */
  reviewCount: number
}

/** 个人笔记（与题目、复习记录分离，见 docs/PRODUCT.md §4.3） */
export interface PersonalNote {
  questionId: string
  content: string
  /** ISO 时间戳 */
  updatedAt: string
}
