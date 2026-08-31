import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WrongBookView from '../components/WrongBookView'
import type { Question, ReviewRecord, ReviewStatus } from '../types/question'

function makeQuestion(id: string): Question {
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
  }
}

function makeRecord(questionId: string, status: ReviewStatus): ReviewRecord {
  return { questionId, status, lastReviewedAt: '2026-08-04T10:00:00.000Z', reviewCount: 1 }
}

// 未启用 vitest globals，testing-library 不会自动清理，需手动卸载 DOM
afterEach(cleanup)

describe('WrongBookView', () => {
  const questions = [makeQuestion('q1'), makeQuestion('q2'), makeQuestion('q3'), makeQuestion('q4')]

  it('只列出状态为不会/模糊的题目', () => {
    const records = [
      makeRecord('q1', 'unknown'),
      makeRecord('q2', 'fuzzy'),
      makeRecord('q3', 'mastered'),
    ]
    render(<WrongBookView questions={questions} records={records} notes={[]} onRate={vi.fn()} />)

    expect(screen.getByText('共 2 道错题（不会/模糊）')).toBeTruthy()
    expect(screen.getByText('题目 q1')).toBeTruthy()
    expect(screen.getByText('题目 q2')).toBeTruthy()
    expect(screen.queryByText('题目 q3')).toBeNull()
    expect(screen.queryByText('题目 q4')).toBeNull()
  })

  it('复习会话使用快照，改判后返回列表自动移出错题本', () => {
    const onRate = vi.fn()
    let records = [makeRecord('q1', 'unknown'), makeRecord('q2', 'fuzzy')]
    const { rerender } = render(
      <WrongBookView questions={questions} records={records} notes={[]} onRate={onRate} />,
    )

    fireEvent.click(screen.getByRole('button', { name: '开始复习错题' }))
    expect(screen.getByText('第 1 / 2 题')).toBeTruthy()
    expect(screen.getByText('题目 q1')).toBeTruthy()

    // q1 改判为基本掌握 → 模拟父组件更新 records
    fireEvent.click(screen.getByRole('button', { name: '显示答案' }))
    fireEvent.click(screen.getByRole('button', { name: '基本掌握' }))
    expect(onRate).toHaveBeenCalledWith('q1', 'understood')
    records = [makeRecord('q1', 'understood'), makeRecord('q2', 'fuzzy')]
    rerender(<WrongBookView questions={questions} records={records} notes={[]} onRate={onRate} />)

    // 会话快照不受影响，继续 q2
    expect(screen.getByText('第 2 / 2 题')).toBeTruthy()
    expect(screen.getByText('题目 q2')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '显示答案' }))
    fireEvent.click(screen.getByRole('button', { name: '熟练' }))
    records = [makeRecord('q1', 'understood'), makeRecord('q2', 'mastered')]
    rerender(<WrongBookView questions={questions} records={records} notes={[]} onRate={onRate} />)
    expect(screen.getByText('错题复习完成')).toBeTruthy()

    // 返回列表：两条错题都已改判，错题本为空
    fireEvent.click(screen.getByRole('button', { name: '返回错题本' }))
    expect(screen.getByText('错题本为空，继续保持！')).toBeTruthy()
  })

  it('错题本为空时显示提示', () => {
    render(<WrongBookView questions={questions} records={[]} notes={[]} onRate={vi.fn()} />)
    expect(screen.getByText('错题本为空，继续保持！')).toBeTruthy()
  })
})
