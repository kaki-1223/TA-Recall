import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TodayView from '../components/TodayView'
import type { Question, ReviewRecord, ReviewStatus } from '../types/question'

const NOW = '2026-08-04T10:00:00.000Z'

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

function makeRecord(questionId: string, status: ReviewStatus, lastReviewedAt: string): ReviewRecord {
  return { questionId, status, lastReviewedAt, reviewCount: 1 }
}

// 未启用 vitest globals，testing-library 不会自动清理，需手动卸载 DOM
afterEach(cleanup)

describe('TodayView', () => {
  it('显示今日/已完成/剩余数量，评分后推进并按队列顺序复习', () => {
    const onRate = vi.fn()
    render(
      <TodayView
        questions={[makeQuestion('q1'), makeQuestion('q2')]}
        records={[makeRecord('q1', 'unknown', NOW)]}
        notes={[]}
        now={NOW}
        onRate={onRate}
      />,
    )
    // 队列：q1（不会 → 1）、q2（未复习 → 4）
    expect(screen.getByText('今日 2 题 · 已完成 0 · 剩余 2')).toBeTruthy()
    expect(screen.getByText('题目 q1')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '显示答案' }))
    fireEvent.click(screen.getByRole('button', { name: '模糊' }))
    expect(onRate).toHaveBeenCalledWith('q1', 'fuzzy')
    expect(screen.getByText('今日 2 题 · 已完成 1 · 剩余 1')).toBeTruthy()
    expect(screen.getByText('题目 q2')).toBeTruthy()
  })

  it('全部完成后显示完成页，可重新开始', () => {
    render(<TodayView questions={[makeQuestion('q1')]} records={[]} notes={[]} now={NOW} onRate={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '显示答案' }))
    fireEvent.click(screen.getByRole('button', { name: '熟练' }))
    expect(screen.getByText('今日复习完成')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '重新开始' }))
    expect(screen.getByText('今日 1 题 · 已完成 0 · 剩余 1')).toBeTruthy()
  })

  it('队列为空时显示提示', () => {
    render(
      <TodayView
        questions={[makeQuestion('q1')]}
        records={[makeRecord('q1', 'mastered', '2026-08-03T10:00:00.000Z')]}
        notes={[]}
        now={NOW}
        onRate={vi.fn()}
      />,
    )
    expect(screen.getByText(/没有需要复习/)).toBeTruthy()
  })
})
