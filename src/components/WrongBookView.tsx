import { useState } from 'react'
import type { PersonalNote, Question, ReviewRecord, ReviewStatus } from '../types/question'
import ReviewCard from './ReviewCard'

interface WrongBookViewProps {
  questions: Question[]
  records: ReviewRecord[]
  notes: PersonalNote[]
  onRate: (questionId: string, status: ReviewStatus) => void
}

/**
 * 错题本：最新状态为不会/模糊的题目（快照语义，改判后自动移出）。
 * 复习会话开始时对错题列表做快照，评分不会中途改变会话内容。
 */
function WrongBookView({ questions, records, notes, onRate }: WrongBookViewProps) {
  const wrongQuestions = questions.filter((q) => {
    const record = records.find((r) => r.questionId === q.id)
    return record?.status === 'unknown' || record?.status === 'fuzzy'
  })
  const [session, setSession] = useState<Question[] | null>(null)
  const [index, setIndex] = useState(0)

  if (session === null) {
    if (wrongQuestions.length === 0) {
      return <p className="empty-hint">错题本为空，继续保持！</p>
    }
    return (
      <div className="wrong-book">
        <p className="result-count">共 {wrongQuestions.length} 道错题（不会/模糊）</p>
        <button
          type="button"
          className="reveal-button"
          onClick={() => {
            setSession(wrongQuestions)
            setIndex(0)
          }}
        >
          开始复习错题
        </button>
        <ul className="question-list">
          {wrongQuestions.map((q) => (
            <li key={q.id}>
              <div className="question-item question-item-static">
                <span className="question-title">{q.title}</span>
                <span className="question-meta">
                  {q.category} · {q.difficulty}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (index >= session.length) {
    return (
      <div className="review-done">
        <h2>错题复习完成</h2>
        <p>共复习 {session.length} 道错题</p>
        <button type="button" className="back-button" onClick={() => setSession(null)}>
          返回错题本
        </button>
      </div>
    )
  }

  const current = session[index]
  const note = notes.find((n) => n.questionId === current.id) ?? null
  return (
    <div className="review-view">
      <p className="result-count">
        第 {index + 1} / {session.length} 题
      </p>
      <ReviewCard
        key={current.id}
        question={current}
        note={note}
        onRate={(status) => {
          onRate(current.id, status)
          setIndex((i) => i + 1)
        }}
      />
    </div>
  )
}

export default WrongBookView
