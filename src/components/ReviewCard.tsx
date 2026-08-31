import { useState } from 'react'
import type { PersonalNote, Question, ReviewStatus } from '../types/question'
import Section from './Section'

interface ReviewCardProps {
  question: Question
  /** 该题的个人笔记（无笔记为 null；仅在显示答案后折叠展示） */
  note: PersonalNote | null
  onRate: (status: ReviewStatus) => void
}

const RATING_OPTIONS: { status: ReviewStatus; label: string }[] = [
  { status: 'unknown', label: '不会' },
  { status: 'fuzzy', label: '模糊' },
  { status: 'understood', label: '基本掌握' },
  { status: 'mastered', label: '熟练' },
]

/** 单题复习卡片：先题后答，答案默认折叠，评分按钮在展示答案后出现 */
function ReviewCard({ question, note, onRate }: ReviewCardProps) {
  const [revealed, setRevealed] = useState(false)

  return (
    <article className="review-card">
      <h2>{question.title}</h2>
      <p className="detail-meta">
        {question.category} · {question.difficulty}
      </p>

      {!revealed ? (
        <button type="button" className="reveal-button" onClick={() => setRevealed(true)}>
          显示答案
        </button>
      ) : (
        <>
          <section>
            <h3>30 秒简答</h3>
            <p>{question.shortAnswer}</p>
          </section>
          <Section title="回答关键词" items={question.keyPoints} />
          <Section title="常见追问" items={question.followUps} />
          <Section title="相关项目" items={question.relatedProjects} />
          <Section title="资料来源" items={question.sources} />
          <section>
            <h3>详细解释</h3>
            <p>{question.explanation}</p>
          </section>

          {note && (
            <details className="note-collapse">
              <summary>个人笔记</summary>
              <p className="note-content">{note.content}</p>
            </details>
          )}

          <div className="rating-bar">
            {RATING_OPTIONS.map(({ status, label }) => (
              <button
                key={status}
                type="button"
                className={`rating rating-${status}`}
                onClick={() => onRate(status)}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </article>
  )
}

export default ReviewCard
