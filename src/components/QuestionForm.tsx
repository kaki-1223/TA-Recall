import { useState } from 'react'
import type { Category, Difficulty, Question, QuestionInput } from '../types/question'
import { CATEGORY_VALUES, DIFFICULTY_VALUES, validateQuestionInput } from '../utils/questionBank'
import FollowUpSection from './FollowUpSection'

interface QuestionFormProps {
  mode: 'create' | 'edit'
  /** 编辑模式下的当前题目；新增模式为 null */
  initial: Question | null
  /** 普通视图的题目列表（用于追问关联的候选与展示） */
  candidateBank: Question[]
  /** 持久化失败时的错误信息（由上层传入） */
  saveError: string | null
  onSave: (input: QuestionInput, pendingFollowUpTitles: string[]) => void
  onCancel: () => void
}

function ListEditor({
  label,
  placeholder,
  items,
  onAdd,
  onRemove,
}: {
  label: string
  placeholder: string
  items: string[]
  onAdd: (value: string) => void
  onRemove: (value: string) => void
}) {
  const [text, setText] = useState('')

  const add = () => {
    const value = text.trim()
    if (value === '') return
    if (items.includes(value)) {
      // 去重：重复输入不重复添加
      setText('')
      return
    }
    onAdd(value)
    setText('')
  }

  return (
    <div className="form-field">
      <label htmlFor={label}>{label}</label>
      <div className="list-editor">
        {items.map((item, index) => (
          <span key={`${item}-${index}`} className="chip">
            {item}
            <button type="button" aria-label={`移除 ${label} ${item}`} onClick={() => onRemove(item)}>
              ×
            </button>
          </span>
        ))}
        <div className="list-editor-row">
          <input
            id={label}
            aria-label={label}
            value={text}
            placeholder={placeholder}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
          />
          <button type="button" className="data-button" aria-label={`添加${label}`} onClick={add}>
            添加
          </button>
        </div>
      </div>
    </div>
  )
}

/** 新增/编辑共用的题目表单；追问新建项在保存时随题目一并创建（见 App.handleSaveForm） */
function QuestionForm({ mode, initial, candidateBank, saveError, onSave, onCancel }: QuestionFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [category, setCategory] = useState<Category>(initial?.category ?? '图形学基础')
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? '基础')
  const [shortAnswer, setShortAnswer] = useState(initial?.shortAnswer ?? '')
  const [keyPoints, setKeyPoints] = useState<string[]>(initial?.keyPoints ?? [])
  const [explanation, setExplanation] = useState(initial?.explanation ?? '')
  const [relatedProjects, setRelatedProjects] = useState<string[]>(initial?.relatedProjects ?? [])
  const [sources, setSources] = useState<string[]>(initial?.sources ?? [])
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
  const [followUpIds, setFollowUpIds] = useState<string[]>(initial?.followUpQuestionIds ?? [])
  const [pendingTitles, setPendingTitles] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const linkedQuestions = candidateBank.filter((q) => followUpIds.includes(q.id))
  const candidateQuestions = candidateBank.filter((q) => !followUpIds.includes(q.id) && q.id !== initial?.id)

  const handleSave = () => {
    const input: QuestionInput = {
      title: title.trim(),
      category,
      difficulty,
      shortAnswer: shortAnswer.trim(),
      keyPoints,
      explanation: explanation.trim(),
      followUpQuestionIds: followUpIds,
      relatedProjects,
      tags,
      sources,
    }
    const validationErrors = validateQuestionInput(input)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    onSave(input, pendingTitles)
  }

  return (
    <div className="question-form">
      <h2>{mode === 'create' ? '新增题目' : '编辑题目'}</h2>

      <div className="form-field">
        <label htmlFor="form-title">问题标题</label>
        <input id="form-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        {errors.title && <p className="form-error">{errors.title}</p>}
      </div>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="form-category">分类</label>
          <select id="form-category" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORY_VALUES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errors.category && <p className="form-error">{errors.category}</p>}
        </div>
        <div className="form-field">
          <label htmlFor="form-difficulty">难度</label>
          <select id="form-difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
            {DIFFICULTY_VALUES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          {errors.difficulty && <p className="form-error">{errors.difficulty}</p>}
        </div>
      </div>

      <ListEditor
        label="标签"
        placeholder="输入标签后回车或点击添加"
        items={tags}
        onAdd={(v) => setTags([...tags, v])}
        onRemove={(v) => setTags(tags.filter((t) => t !== v))}
      />

      <div className="form-field">
        <label htmlFor="form-short-answer">30 秒简答</label>
        <textarea
          id="form-short-answer"
          rows={4}
          value={shortAnswer}
          onChange={(e) => setShortAnswer(e.target.value)}
        />
        {errors.shortAnswer && <p className="form-error">{errors.shortAnswer}</p>}
      </div>

      <ListEditor
        label="回答关键词"
        placeholder="输入关键词后回车或点击添加"
        items={keyPoints}
        onAdd={(v) => setKeyPoints([...keyPoints, v])}
        onRemove={(v) => setKeyPoints(keyPoints.filter((t) => t !== v))}
      />

      <div className="form-field">
        <label htmlFor="form-explanation">详细解释</label>
        <textarea id="form-explanation" rows={6} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
        {errors.explanation && <p className="form-error">{errors.explanation}</p>}
      </div>

      <ListEditor
        label="相关项目"
        placeholder="输入项目后回车或点击添加"
        items={relatedProjects}
        onAdd={(v) => setRelatedProjects([...relatedProjects, v])}
        onRemove={(v) => setRelatedProjects(relatedProjects.filter((t) => t !== v))}
      />

      <ListEditor
        label="资料来源"
        placeholder="输入来源后回车或点击添加"
        items={sources}
        onAdd={(v) => setSources([...sources, v])}
        onRemove={(v) => setSources(sources.filter((t) => t !== v))}
      />

      <FollowUpSection
        parentTitle={title}
        linkedQuestions={linkedQuestions}
        candidateQuestions={candidateQuestions}
        pendingTitles={pendingTitles}
        onLink={(id) => setFollowUpIds((ids) => (ids.includes(id) ? ids : [...ids, id]))}
        onUnlink={(id) => setFollowUpIds(followUpIds.filter((x) => x !== id))}
        onAddPending={(t) => setPendingTitles([...pendingTitles, t])}
        onRemovePending={(t) => setPendingTitles(pendingTitles.filter((x) => x !== t))}
      />

      {saveError && <p className="form-error">{saveError}</p>}

      <div className="form-actions">
        <button type="button" className="data-button" onClick={handleSave}>
          保存
        </button>
        <button type="button" className="data-button" onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  )
}

export default QuestionForm
