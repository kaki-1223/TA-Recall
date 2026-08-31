import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DataView from '../components/DataView'
import type { ValidatedEntry } from '../data/questionStore'
import type { Question } from '../types/question'

function makeQuestion(id: string, patch: Partial<Question> = {}): Question {
  return {
    id,
    category: '图形学基础',
    title: `题目 ${id}`,
    difficulty: '基础',
    shortAnswer: '简答',
    keyPoints: ['关键词'],
    explanation: '解释',
    followUps: [],
    followUpQuestionIds: [],
    relatedProjects: [],
    archived: false,
    tags: [],
    sources: [],
    ...patch,
  }
}

function pickFile(content: string) {
  const input = screen.getByLabelText('选择题库 JSON 文件')
  fireEvent.change(input, { target: { files: [new File([content], 'bank.json', { type: 'application/json' })] } })
}

// 未启用 vitest globals，testing-library 不会自动清理，需手动卸载 DOM
afterEach(cleanup)

describe('DataView 导入', () => {
  it('非法 JSON 显示解析错误，不调用导入', async () => {
    const onImport = vi.fn()
    render(<DataView questions={[]} records={[]} onImport={onImport} />)

    pickFile('{broken json')
    expect(await screen.findByText(/JSON 解析失败/)).toBeTruthy()
    expect(onImport).not.toHaveBeenCalled()
  })

  it('字段校验失败时列出所有错误，不调用导入', async () => {
    const onImport = vi.fn()
    render(<DataView questions={[]} records={[]} onImport={onImport} />)

    pickFile(JSON.stringify([{ id: 'q1', title: '缺字段' }, { id: '' }]))
    expect(await screen.findByText(/导入被拒绝：共 2 个无效条目/)).toBeTruthy()
    expect(await screen.findAllByText(/缺少字段 category/)).toHaveLength(2)
    expect(onImport).not.toHaveBeenCalled()
  })

  it('校验通过后显示新增/更新/无变化数量，确认后导入', async () => {
    const onImport = vi.fn().mockReturnValue(true)
    const existing = makeQuestion('q1', { title: '旧标题' })
    const incoming = [
      makeQuestion('q1', { title: '新标题' }),
      makeQuestion('q2'),
    ]
    render(<DataView questions={[existing]} records={[]} onImport={onImport} />)

    pickFile(JSON.stringify(incoming))
    expect(await screen.findByText(/校验通过：新增 1 条、更新 1 条、无变化 0 条/)).toBeTruthy()
    expect(await screen.findByText(/更新：新标题/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '确认导入' }))
    expect(onImport).toHaveBeenCalledTimes(1)
    const arg = onImport.mock.calls[0][0] as ValidatedEntry[]
    expect(arg.map((e) => e.question.id)).toEqual(['q1', 'q2'])
    expect(await screen.findByText(/导入完成：新增 1 条、更新 1 条、无变化 0 条/)).toBeTruthy()
  })

  it('显式 archived: true 的条目单独显示将归档数量', async () => {
    const onImport = vi.fn().mockReturnValue(true)
    const existing = makeQuestion('q1')
    const incoming = [makeQuestion('q1', { archived: true })]
    render(<DataView questions={[existing]} records={[]} onImport={onImport} />)

    pickFile(JSON.stringify(incoming))
    expect(
      await screen.findByText(/校验通过：新增 0 条、更新 0 条、无变化 1 条 · 将归档 1 条、将恢复 0 条/),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '确认导入' }))
    expect(onImport).toHaveBeenCalledTimes(1)
  })

  it('未包含 archived 字段的条目不产生归档变化', async () => {
    const onImport = vi.fn().mockReturnValue(true)
    const existing = makeQuestion('q1', { archived: true })
    const incoming = [
      {
        id: 'q1',
        category: '图形学基础',
        title: '题目 q1',
        difficulty: '基础',
        shortAnswer: '简答',
        keyPoints: ['关键词'],
        explanation: '解释',
        followUps: [],
        followUpQuestionIds: [],
        relatedProjects: [],
        tags: [],
        sources: [],
      },
    ]
    render(<DataView questions={[existing]} records={[]} onImport={onImport} />)

    pickFile(JSON.stringify(incoming))
    expect(
      await screen.findByText(/校验通过：新增 0 条、更新 0 条、无变化 1 条 · 将归档 0 条、将恢复 0 条/),
    ).toBeTruthy()
    expect(onImport).not.toHaveBeenCalled()
  })

  it('导入保存失败时提示且不产生部分写入', async () => {
    const onImport = vi.fn().mockReturnValue(false)
    render(<DataView questions={[makeQuestion('q1')]} records={[]} onImport={onImport} />)

    pickFile(JSON.stringify([makeQuestion('q2')]))
    expect(await screen.findByText(/校验通过/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '确认导入' }))
    expect(await screen.findByText(/保存题库失败，现有题库未发生任何变化/)).toBeTruthy()
  })
})
