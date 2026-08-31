import { useState } from 'react'
import type { PersonalNote, Question, ReviewStatus } from '../types/question'
import ReviewCard from './ReviewCard'

interface ReviewViewProps {
  questions: Question[]
  notes: PersonalNote[]
  onRate: (questionId: string, status: ReviewStatus) => void
}

/** 逐题复习会话：按题库顺序过一遍，完成后可重新开始 */
function ReviewView({ questions, notes, onRate }: ReviewViewProps) {
  const [index, setIndex] = useState(0)

  if (questions.length === 0) {
    return <p className="empty-hint">题库为空，请先导入题目</p>
  }

  if (index >= questions.length) {
    return (
      <div className="review-done">
        <h2>本轮复习完成</h2>
        <p>共复习 {questions.length} 道题</p>
        <button type="button" className="back-button" onClick={() => setIndex(0)}>
          重新开始
        </button>
      </div>
    )
  }

  const question = questions[index]
  const note = notes.find((n) => n.questionId === question.id) ?? null

  return (
    <div className="review-view">
      <p className="result-count">
        第 {index + 1} / {questions.length} 题
      </p>
      <ReviewCard
        key={question.id}
        question={question}
        note={note}
        onRate={(status) => {
          onRate(question.id, status)
          setIndex((i) => i + 1)
        }}
      />
    </div>
  )
}

export default ReviewView
