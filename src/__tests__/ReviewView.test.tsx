import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ReviewView from '../components/ReviewView'
import type { Question } from '../types/question'

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

function rateCurrent(label: string) {
  fireEvent.click(screen.getByRole('button', { name: '显示答案' }))
  fireEvent.click(screen.getByRole('button', { name: label }))
}

// 未启用 vitest globals，testing-library 不会自动清理，需手动卸载 DOM
afterEach(cleanup)

describe('ReviewView', () => {
  it('按顺序逐题复习，评分后进入下一题', () => {
    const onRate = vi.fn()
    render(<ReviewView questions={[makeQuestion('q1'), makeQuestion('q2')]} notes={[]} onRate={onRate} />)

    expect(screen.getByText('第 1 / 2 题')).toBeTruthy()
    expect(screen.getByText('题目 q1')).toBeTruthy()

    rateCurrent('不会')
    expect(onRate).toHaveBeenCalledWith('q1', 'unknown')
    expect(screen.getByText('第 2 / 2 题')).toBeTruthy()
    expect(screen.getByText('题目 q2')).toBeTruthy()

    rateCurrent('熟练')
    expect(onRate).toHaveBeenCalledWith('q2', 'mastered')
  })

  it('最后一题评分后显示完成界面，可重新开始', () => {
    const onRate = vi.fn()
    render(<ReviewView questions={[makeQuestion('q1')]} notes={[]} onRate={onRate} />)

    rateCurrent('基本掌握')
    expect(screen.getByText('本轮复习完成')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '重新开始' }))
    expect(screen.getByText('第 1 / 1 题')).toBeTruthy()
  })

  it('题库为空时显示提示', () => {
    render(<ReviewView questions={[]} notes={[]} onRate={vi.fn()} />)
    expect(screen.getByText(/题库为空/)).toBeTruthy()
  })
})
