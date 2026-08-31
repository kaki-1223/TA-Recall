import type { Question } from '../types/question'

interface QuestionListProps {
  questions: Question[]
  onSelect: (id: string) => void
}

function QuestionList({ questions, onSelect }: QuestionListProps) {
  if (questions.length === 0) {
    return <p className="empty-hint">没有符合条件的题目</p>
  }

  return (
    <ul className="question-list">
      {questions.map((q) => (
        <li key={q.id}>
          <button type="button" className="question-item" onClick={() => onSelect(q.id)}>
            <span className="question-title">{q.title}</span>
            <span className="question-meta">
              {q.category} · {q.difficulty} · {q.tags.join(' / ')}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export default QuestionList
