import { useState } from 'react'
import type { PersonalNote, Question } from '../types/question'
import { filterQuestions } from '../utils/filter'
import QuestionDetail from './QuestionDetail'

interface ArchiveSectionProps {
  allQuestions: Question[]
  notes: PersonalNote[]
  onRestore: (id: string) => void
  onEditQuestion: (id: string) => void
  onSaveNote: (questionId: string, content: string) => void
  onConvertLegacy: (parentId: string, text: string) => void
  onRemoveLegacy: (parentId: string, text: string) => void
  onOpenQuestion: (id: string) => void
}

/** 归档管理（数据管理页内）：搜索、查看详情、恢复归档题目 */
function ArchiveSection({
  allQuestions,
  notes,
  onRestore,
  onEditQuestion,
  onSaveNote,
  onConvertLegacy,
  onRemoveLegacy,
  onOpenQuestion,
}: ArchiveSectionProps) {
  const archived = allQuestions.filter((q) => q.archived)
  const [keyword, setKeyword] = useState('')
  const [selected, setSelected] = useState<Question | null>(null)

  if (selected !== null) {
    const followUpQuestions = allQuestions.filter((q) => selected.followUpQuestionIds.includes(q.id))
    const note = notes.find((n) => n.questionId === selected.id) ?? null
    return (
      <div className="archive-section">
        <QuestionDetail
          key={selected.id}
          question={selected}
          followUpQuestions={followUpQuestions}
          note={note}
          onBack={() => setSelected(null)}
          onEdit={() => onEditQuestion(selected.id)}
          onArchive={() => undefined}
          onOpenFollowUp={onOpenQuestion}
          onConvertLegacy={(text) => onConvertLegacy(selected.id, text)}
          onRemoveLegacy={(text) => onRemoveLegacy(selected.id, text)}
          onSaveNote={(content) => onSaveNote(selected.id, content)}
        />
      </div>
    )
  }

  const filtered = filterQuestions(archived, { category: null, tag: null, keyword })

  return (
    <section className="archive-section">
      <h2>已归档题目</h2>
      <p className="data-hint">归档题目不出现在题库、复习、今日复习与错题本中，恢复后重新可见；归档不影响复习记录与个人笔记。</p>
      <input
        type="search"
        className="archive-search"
        aria-label="搜索归档题目"
        placeholder="搜索归档题目…"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
      />
      {filtered.length === 0 ? (
        <p className="empty-hint">没有已归档的题目</p>
      ) : (
        <ul className="question-list">
          {filtered.map((q) => (
            <li key={q.id}>
              <div className="question-item question-item-static">
                <span className="question-title">{q.title}</span>
                <span className="question-meta">
                  {q.category} · {q.difficulty}
                </span>
                <span className="archive-actions">
                  <button type="button" className="data-button" onClick={() => setSelected(q)}>
                    查看
                  </button>
                  <button type="button" className="data-button" onClick={() => onRestore(q.id)}>
                    恢复
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default ArchiveSection
