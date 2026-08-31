import { useState } from 'react'
import ArchiveSection from './components/ArchiveSection'
import DataView from './components/DataView'
import FilterBar from './components/FilterBar'
import QuestionDetail from './components/QuestionDetail'
import QuestionForm from './components/QuestionForm'
import QuestionList from './components/QuestionList'
import ReviewView from './components/ReviewView'
import TodayView from './components/TodayView'
import WrongBookView from './components/WrongBookView'
import {
  archiveQuestion,
  convertLegacyFollowUp,
  createFollowUp,
  createQuestion,
  getActiveQuestions,
  loadAllNotes,
  loadAllReviewRecords,
  loadInitialQuestions,
  mergeQuestionBanks,
  persistQuestionBank,
  recordReview,
  removeLegacyFollowUp,
  removeNote,
  restoreQuestion,
  updateQuestion,
  upsertNote,
  type ValidatedEntry,
} from './data/questionStore'
import type { PersonalNote, Question, QuestionInput, ReviewStatus } from './types/question'
import { filterQuestions, getAllCategories, getAllTags, type FilterState } from './utils/filter'

type View = 'bank' | 'review' | 'today' | 'wrong' | 'data'
type FormState = { mode: 'create' } | { mode: 'edit'; questionId: string } | null

function App() {
  const [view, setView] = useState<View>('bank')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterState>({ category: null, tag: null, keyword: '' })
  const [records, setRecords] = useState(loadAllReviewRecords)
  const [questions, setQuestions] = useState<Question[]>(loadInitialQuestions)
  const [notes, setNotes] = useState<PersonalNote[]>(loadAllNotes)
  const [formState, setFormState] = useState<FormState>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const handleRate = (questionId: string, status: ReviewStatus) => {
    setRecords(recordReview(records, questionId, status, new Date().toISOString()))
  }

  /** 应用导入：合并 → 持久化 → 更新状态；持久化失败时保持原数据（原子性） */
  const handleImport = (entries: ValidatedEntry[]): boolean => {
    const merged = mergeQuestionBanks(questions, entries)
    const ok = persistQuestionBank(merged)
    if (ok) setQuestions(merged)
    return ok
  }

  /**
   * 保存表单：新增/更新父题，随后为每个待创建的追问建子题并关联。
   * 任一持久化失败则保持原数据（原子性），表单保留。
   */
  const handleSaveForm = (input: QuestionInput, pendingTitles: string[]) => {
    if (formState === null) return
    let bank = questions
    let parentId: string
    if (formState.mode === 'create') {
      const parent = createQuestion(input, bank)
      parentId = parent.id
      bank = [...bank, parent]
    } else {
      parentId = formState.questionId
      bank = updateQuestion(bank, parentId, input)
    }
    for (const title of pendingTitles) {
      const result = createFollowUp(bank, parentId, title)
      bank = result.bank
    }
    const ok = persistQuestionBank(bank)
    if (!ok) {
      setFormError('保存失败（本地存储不可用），数据未变更')
      return
    }
    setFormError(null)
    setQuestions(bank)
    setFormState(null)
    if (formState.mode === 'create') {
      setView('bank')
      setSelectedId(parentId)
    }
  }

  const handleArchive = (id: string) => {
    const next = archiveQuestion(questions, id)
    if (persistQuestionBank(next)) {
      setQuestions(next)
      setSelectedId(null)
    }
  }

  const handleRestore = (id: string) => {
    const next = restoreQuestion(questions, id)
    if (persistQuestionBank(next)) setQuestions(next)
  }

  /** 遗留文本追问转为正式题目：成功后跳转到新子题详情 */
  const handleConvertLegacy = (parentId: string, text: string) => {
    try {
      const { bank, child } = convertLegacyFollowUp(questions, parentId, text)
      if (persistQuestionBank(bank)) {
        setQuestions(bank)
        setSelectedId(child.id)
        setView('bank')
      }
    } catch (error) {
      console.warn('转追问题目失败：', error)
    }
  }

  const handleRemoveLegacy = (parentId: string, text: string) => {
    const next = removeLegacyFollowUp(questions, parentId, text)
    if (persistQuestionBank(next)) setQuestions(next)
  }

  const handleOpenQuestion = (id: string) => {
    setSelectedId(id)
    setView('bank')
  }

  const handleSaveNote = (questionId: string, content: string) => {
    if (content.trim() === '') {
      setNotes(removeNote(notes, questionId))
    } else {
      setNotes(upsertNote(notes, questionId, content, new Date().toISOString()))
    }
  }

  // 普通视图一律使用未归档题目（归档见数据管理页）；详情可来自题库或归档区
  const activeQuestions = getActiveQuestions(questions)
  const selected = questions.find((q) => q.id === selectedId) ?? null
  const filtered = filterQuestions(activeQuestions, filter)

  const navItems: { key: View; label: string }[] = [
    { key: 'bank', label: '题库' },
    { key: 'review', label: '复习' },
    { key: 'today', label: '今日复习' },
    { key: 'wrong', label: '错题本' },
    { key: 'data', label: '数据管理' },
  ]

  return (
    <div className="app">
      <header className="app-header">
        <h1>TA Recall</h1>
        <nav className="app-nav">
          {navItems.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={view === key ? 'nav-button active' : 'nav-button'}
              onClick={() => {
                setView(key)
                setFormState(null)
                setFormError(null)
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      <main className="app-main">
        {formState !== null ? (
          <QuestionForm
            mode={formState.mode}
            initial={formState.mode === 'edit' ? (questions.find((q) => q.id === formState.questionId) ?? null) : null}
            candidateBank={activeQuestions}
            saveError={formError}
            onSave={handleSaveForm}
            onCancel={() => {
              setFormState(null)
              setFormError(null)
            }}
          />
        ) : view === 'bank' ? (
          selected ? (
            <QuestionDetail
              key={selected.id}
              question={selected}
              followUpQuestions={questions.filter((q) => selected.followUpQuestionIds.includes(q.id))}
              note={notes.find((n) => n.questionId === selected.id) ?? null}
              onBack={() => setSelectedId(null)}
              onEdit={() => setFormState({ mode: 'edit', questionId: selected.id })}
              onArchive={() => handleArchive(selected.id)}
              onOpenFollowUp={handleOpenQuestion}
              onConvertLegacy={(text) => handleConvertLegacy(selected.id, text)}
              onRemoveLegacy={(text) => handleRemoveLegacy(selected.id, text)}
              onSaveNote={(content) => handleSaveNote(selected.id, content)}
            />
          ) : (
            <>
              <div className="bank-toolbar">
                <button type="button" className="data-button" onClick={() => setFormState({ mode: 'create' })}>
                  ＋ 新增题目
                </button>
              </div>
              <FilterBar
                categories={getAllCategories(activeQuestions)}
                tags={getAllTags(activeQuestions)}
                filter={filter}
                onChange={setFilter}
              />
              <p className="result-count">共 {filtered.length} 道题</p>
              <QuestionList questions={filtered} onSelect={setSelectedId} />
            </>
          )
        ) : view === 'review' ? (
          <ReviewView questions={activeQuestions} notes={notes} onRate={handleRate} />
        ) : view === 'today' ? (
          <TodayView
            questions={activeQuestions}
            records={records}
            notes={notes}
            now={new Date().toISOString()}
            onRate={handleRate}
          />
        ) : view === 'wrong' ? (
          <WrongBookView questions={activeQuestions} records={records} notes={notes} onRate={handleRate} />
        ) : (
          <>
            <DataView questions={questions} records={records} onImport={handleImport} />
            <ArchiveSection
              allQuestions={questions}
              notes={notes}
              onRestore={handleRestore}
              onEditQuestion={(id) => setFormState({ mode: 'edit', questionId: id })}
              onSaveNote={handleSaveNote}
              onConvertLegacy={handleConvertLegacy}
              onRemoveLegacy={handleRemoveLegacy}
              onOpenQuestion={handleOpenQuestion}
            />
          </>
        )}
      </main>
    </div>
  )
}

export default App
