import { useRef, useState } from 'react'
import {
  analyzeImport,
  validateQuestionList,
  type ImportAnalysis,
  type ImportIssue,
  type ValidatedEntry,
} from '../data/questionStore'
import type { Question, ReviewRecord } from '../types/question'
import { downloadJson } from '../utils/download'

interface DataViewProps {
  /** 全部题目（含归档，用于合并与导出） */
  questions: Question[]
  records: ReviewRecord[]
  /** 应用导入（合并 + 持久化），返回是否成功 */
  onImport: (entries: ValidatedEntry[]) => boolean
}

type ImportStatus =
  | { kind: 'idle' }
  | { kind: 'error'; message: string }
  | { kind: 'invalid'; issues: ImportIssue[] }
  | { kind: 'preview'; analysis: ImportAnalysis; entries: ValidatedEntry[] }
  | { kind: 'success'; message: string }

function DataView({ questions, records, onImport }: DataViewProps) {
  const [status, setStatus] = useState<ImportStatus>({ kind: 'idle' })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (file: File | undefined) => {
    if (file === undefined) return
    // 先清空 input 值，保证再次选择同一文件也能触发 change
    if (fileInputRef.current) fileInputRef.current.value = ''
    setStatus({ kind: 'idle' })

    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      setStatus({ kind: 'error', message: `JSON 解析失败：${file.name} 不是合法的 JSON，现有题库未发生任何变化` })
      return
    }

    const { entries, issues } = validateQuestionList(parsed)
    if (issues.length > 0) {
      setStatus({ kind: 'invalid', issues })
      return
    }

    setStatus({ kind: 'preview', analysis: analyzeImport(questions, entries), entries })
  }

  const handleConfirm = () => {
    if (status.kind !== 'preview') return
    if (onImport(status.entries)) {
      const a = status.analysis
      setStatus({
        kind: 'success',
        message: `导入完成：新增 ${a.additions.length} 条、更新 ${a.updates.length} 条、无变化 ${a.unchanged.length} 条 · 将归档 ${a.toArchive.length} 条、将恢复 ${a.toRestore.length} 条`,
      })
    } else {
      setStatus({ kind: 'error', message: '保存题库失败，现有题库未发生任何变化' })
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="data-view">
      <section>
        <h2>导入题库</h2>
        <p className="data-hint">
          从 JSON 文件按 id 合并导入：新 id 新增，相同 id 更新内容，未出现的题目保留。先全量校验，再预览确认，确认前不会改动任何数据。
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          aria-label="选择题库 JSON 文件"
          onChange={(e) => void handleFileChange(e.target.files?.[0])}
        />

        {status.kind === 'error' && <p className="data-error">{status.message}</p>}

        {status.kind === 'invalid' && (
          <div className="data-error">
            <p>
              导入被拒绝：共 {status.issues.length} 个无效条目，现有题库未发生任何变化。请修正后重试：
            </p>
            <ul>
              {status.issues.map((issue) => (
                <li key={issue.index}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}

        {status.kind === 'preview' && (
          <div className="data-preview">
            <p>
              校验通过：新增 {status.analysis.additions.length} 条、更新 {status.analysis.updates.length} 条、无变化{' '}
              {status.analysis.unchanged.length} 条 · 将归档 {status.analysis.toArchive.length} 条、将恢复{' '}
              {status.analysis.toRestore.length} 条
            </p>
            {status.analysis.additions.length > 0 && (
              <ul>
                {status.analysis.additions.map((q) => (
                  <li key={q.id}>
                    新增：{q.title}（{q.id}）
                  </li>
                ))}
              </ul>
            )}
            {status.analysis.updates.length > 0 && (
              <ul>
                {status.analysis.updates.map((q) => (
                  <li key={q.id}>
                    更新：{q.title}（{q.id}）
                  </li>
                ))}
              </ul>
            )}
            <div className="data-actions">
              <button type="button" className="data-button" onClick={handleConfirm}>
                确认导入
              </button>
              <button type="button" className="data-button" onClick={() => setStatus({ kind: 'idle' })}>
                取消
              </button>
            </div>
          </div>
        )}

        {status.kind === 'success' && <p className="data-success">{status.message}</p>}
      </section>

      <section>
        <h2>导出</h2>
        <p className="data-hint">题库与复习记录导出为 JSON 文件，可用于备份或迁移。</p>
        <div className="data-actions">
          <button type="button" className="data-button" onClick={() => downloadJson(`题库-${today}.json`, questions)}>
            导出题库
          </button>
          <button type="button" className="data-button" onClick={() => downloadJson(`复习记录-${today}.json`, records)}>
            导出复习记录
          </button>
        </div>
      </section>
    </div>
  )
}

export default DataView
