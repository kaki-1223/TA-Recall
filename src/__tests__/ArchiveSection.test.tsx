import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ArchiveSection from '../components/ArchiveSection'
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
    tags: [],
    sources: [],
    archived: false,
    ...patch,
  }
}

function renderSection(allQuestions: Question[], onRestore = vi.fn()) {
  return render(
    <ArchiveSection
      allQuestions={allQuestions}
      notes={[]}
      onRestore={onRestore}
      onEditQuestion={vi.fn()}
      onSaveNote={vi.fn()}
      onConvertLegacy={vi.fn()}
      onRemoveLegacy={vi.fn()}
      onOpenQuestion={vi.fn()}
    />,
  )
}

// 未启用 vitest globals，testing-library 不会自动清理，需手动卸载 DOM
afterEach(cleanup)

describe('ArchiveSection', () => {
  it('只列出归档题目，恢复按钮回调对应 id', () => {
    const onRestore = vi.fn()
    renderSection([makeQuestion('q1'), makeQuestion('q2', { archived: true })], onRestore)
    expect(screen.getByText('题目 q2')).toBeTruthy()
    expect(screen.queryByText('题目 q1')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '恢复' }))
    expect(onRestore).toHaveBeenCalledWith('q2')
  })

  it('支持关键词搜索', () => {
    renderSection([
      makeQuestion('q1', { archived: true, title: '渲染优化' }),
      makeQuestion('q2', { archived: true, title: '水面效果' }),
    ])
    fireEvent.change(screen.getByLabelText('搜索归档题目'), { target: { value: '渲染' } })
    expect(screen.getByText('渲染优化')).toBeTruthy()
    expect(screen.queryByText('水面效果')).toBeNull()
  })

  it('查看归档题目打开详情，可返回列表', () => {
    renderSection([makeQuestion('q1', { archived: true, title: '归档题' })])
    fireEvent.click(screen.getByRole('button', { name: '查看' }))
    expect(screen.getByText('30 秒简答')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '← 返回列表' }))
    expect(screen.getByText('已归档题目')).toBeTruthy()
  })

  it('无归档题目时显示提示', () => {
    renderSection([makeQuestion('q1')])
    expect(screen.getByText('没有已归档的题目')).toBeTruthy()
  })
})
