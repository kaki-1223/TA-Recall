import { useState } from 'react'
import type { Question } from '../types/question'

interface FollowUpSectionProps {
  /** 当前题目标题（用于新建追问的预填） */
  parentTitle: string
  /** 已关联的追问题目 */
  linkedQuestions: Question[]
  /** 可关联的候选题目 */
  candidateQuestions: Question[]
  /** 等待保存时创建的追问标题（保存后才会真正创建并关联） */
  pendingTitles: string[]
  onLink: (childId: string) => void
  onUnlink: (childId: string) => void
  onAddPending: (title: string) => void
  onRemovePending: (title: string) => void
}

/**
 * 追问管理区（表单内编辑模式）：展示已关联追问、关联已有题目、新建追问。
 * 新建的追问暂存为 pendingTitles，随题目保存时一次性创建并关联（取消不产生残留）。
 */
function FollowUpSection({
  parentTitle,
  linkedQuestions,
  candidateQuestions,
  pendingTitles,
  onLink,
  onUnlink,
  onAddPending,
  onRemovePending,
}: FollowUpSectionProps) {
  const [candidateId, setCandidateId] = useState('')
  const [newTitle, setNewTitle] = useState(`追问：${parentTitle}`)

  const handleAddPending = () => {
    const title = newTitle.trim()
    if (title === '') return
    onAddPending(title)
    setNewTitle(`追问：${parentTitle}`)
  }

  return (
    <section className="form-field">
      <label>追问题目</label>

      {linkedQuestions.length > 0 && (
        <ul className="followup-linked">
          {linkedQuestions.map((q) => (
            <li key={q.id} className="chip-row">
              <span className="chip">{q.title}</span>
              <button type="button" className="chip-remove" onClick={() => onUnlink(q.id)}>
                解除关联
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="form-row">
        <select value={candidateId} onChange={(e) => setCandidateId(e.target.value)} aria-label="关联已有题目">
          <option value="">关联已有题目…</option>
          {candidateQuestions.map((q) => (
            <option key={q.id} value={q.id}>
              {q.title}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="data-button"
          onClick={() => {
            if (candidateId !== '') {
              onLink(candidateId)
              setCandidateId('')
            }
          }}
        >
          关联
        </button>
      </div>

      <div className="form-row">
        <input
          aria-label="新建追问标题"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAddPending()
            }
          }}
        />
        <button type="button" className="data-button" onClick={handleAddPending}>
          新建
        </button>
      </div>
      <p className="form-hint">新建的追问将在保存题目后创建为正式题目并自动关联。</p>

      {pendingTitles.length > 0 && (
        <ul className="followup-pending">
          {pendingTitles.map((title, index) => (
            <li key={`${title}-${index}`} className="chip-row">
              <span className="chip">待创建：{title}</span>
              <button type="button" className="chip-remove" onClick={() => onRemovePending(title)}>
                移除
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default FollowUpSection
