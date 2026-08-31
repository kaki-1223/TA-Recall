import { useState } from 'react'
import type { PersonalNote, Question } from '../types/question'
import Section from './Section'

interface QuestionDetailProps {
  question: Question
  /** 已关联的追问题目（由上层按 followUpQuestionIds 解析） */
  followUpQuestions: Question[]
  note: PersonalNote | null
  onBack: () => void
  onEdit: () => void
  onArchive: () => void
  onOpenFollowUp: (questionId: string) => void
  onConvertLegacy: (text: string) => void
  onRemoveLegacy: (text: string) => void
  onSaveNote: (content: string) => void
}

/** 遗留文本追问的操作：转为题目 / 移除（移除需二次点击确认） */
function LegacyFollowUpActions({
  text,
  onConvert,
  onRemove,
}: {
  text: string
  onConvert: (text: string) => void
  onRemove: (text: string) => void
}) {
  const [confirming, setConfirming] = useState(false)
  if (confirming) {
    return (
      <span className="legacy-actions">
        <button
          type="button"
          className="data-button"
          onClick={() => {
            onRemove(text)
            setConfirming(false)
          }}
        >
          确认移除
        </button>
        <button type="button" className="data-button" onClick={() => setConfirming(false)}>
          取消
        </button>
      </span>
    )
  }
  return (
    <span className="legacy-actions">
      <button type="button" className="data-button" onClick={() => onConvert(text)}>
        转为题目
      </button>
      <button type="button" className="data-button" onClick={() => setConfirming(true)}>
        移除
      </button>
    </span>
  )
}

/** 个人笔记：无笔记时提供添加，有笔记时可编辑；空内容保存即清除 */
function NoteSection({ note, onSave }: { note: PersonalNote | null; onSave: (content: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(note?.content ?? '')

  return (
    <section>
      <h3>个人笔记</h3>
      {editing ? (
        <>
          <textarea
            className="note-textarea"
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            aria-label="个人笔记内容"
          />
          <div className="form-actions">
            <button
              type="button"
              className="data-button"
              onClick={() => {
                onSave(content)
                setEditing(false)
              }}
            >
              保存笔记
            </button>
            <button type="button" className="data-button" onClick={() => setEditing(false)}>
              取消
            </button>
          </div>
        </>
      ) : note ? (
        <>
          <p className="note-content">{note.content}</p>
          <button
            type="button"
            className="data-button"
            onClick={() => {
              setContent(note.content)
              setEditing(true)
            }}
          >
            编辑笔记
          </button>
        </>
      ) : (
        <>
          <p className="form-hint">暂无个人笔记</p>
          <button type="button" className="data-button" onClick={() => setEditing(true)}>
            添加笔记
          </button>
        </>
      )}
    </section>
  )
}

function QuestionDetail({
  question,
  followUpQuestions,
  note,
  onBack,
  onEdit,
  onArchive,
  onOpenFollowUp,
  onConvertLegacy,
  onRemoveLegacy,
  onSaveNote,
}: QuestionDetailProps) {
  return (
    <article className="question-detail">
      <div className="detail-actions">
        <button type="button" className="back-button" onClick={onBack}>
          ← 返回列表
        </button>
        <button type="button" className="data-button" onClick={onEdit}>
          编辑题目
        </button>
        {!question.archived && (
          <button type="button" className="data-button" onClick={onArchive}>
            归档题目
          </button>
        )}
      </div>
      <h2>{question.title}</h2>
      <p className="detail-meta">
        {question.category} · {question.difficulty} · {question.tags.join(' / ')}
      </p>

      <section>
        <h3>30 秒简答</h3>
        <p>{question.shortAnswer}</p>
      </section>

      <Section title="回答关键词" items={question.keyPoints} />
      <Section title="相关项目" items={question.relatedProjects} />
      <Section title="资料来源" items={question.sources} />

      <section>
        <h3>详细解释</h3>
        <p>{question.explanation}</p>
      </section>

      <section>
        <h3>常见追问</h3>
        {followUpQuestions.length > 0 && (
          <ul>
            {followUpQuestions.map((q) => (
              <li key={q.id}>
                <button type="button" className="link-button" onClick={() => onOpenFollowUp(q.id)}>
                  {q.title}
                </button>
              </li>
            ))}
          </ul>
        )}
        {question.followUps.length > 0 && (
          <ul>
            {question.followUps.map((text, index) => (
              <li key={`${text}-${index}`} className="legacy-followup">
                <span>{text}</span>
                <LegacyFollowUpActions text={text} onConvert={onConvertLegacy} onRemove={onRemoveLegacy} />
              </li>
            ))}
          </ul>
        )}
        {followUpQuestions.length === 0 && question.followUps.length === 0 && (
          <p className="form-hint">暂无追问</p>
        )}
      </section>

      <NoteSection key={question.id} note={note} onSave={onSaveNote} />
    </article>
  )
}

export default QuestionDetail
