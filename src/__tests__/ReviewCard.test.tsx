import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ReviewCard from '../components/ReviewCard'
import type { PersonalNote, Question } from '../types/question'

const question: Question = {
  id: 'q1',
  category: '图形学基础',
  title: '什么是伽马校正？',
  difficulty: '基础',
  shortAnswer: '显示器输出非线性，需在线性空间计算后校正再输出。',
  keyPoints: ['线性空间', 'sRGB'],
  explanation: '详细解释内容。',
  followUps: ['追问一'],
  followUpQuestionIds: [],
  relatedProjects: ['相关项目一'],
  archived: false,
  tags: ['色彩'],
  sources: ['来源一'],
}

// 未启用 vitest globals，testing-library 不会自动清理，需手动卸载 DOM
afterEach(cleanup)

describe('ReviewCard', () => {
  it('初始只显示题目，不显示答案与评分按钮', () => {
    render(<ReviewCard question={question} note={null} onRate={vi.fn()} />)
    expect(screen.getByText('什么是伽马校正？')).toBeTruthy()
    expect(screen.queryByText('30 秒简答')).toBeNull()
    expect(screen.queryByRole('button', { name: '不会' })).toBeNull()
  })

  it('点击显示答案后展示答案分区与四个评分按钮', () => {
    render(<ReviewCard question={question} note={null} onRate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '显示答案' }))
    expect(screen.getByText('30 秒简答')).toBeTruthy()
    expect(screen.getByText(question.shortAnswer)).toBeTruthy()
    expect(screen.getByText('详细解释')).toBeTruthy()
    expect(screen.getByRole('button', { name: '不会' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '模糊' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '基本掌握' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '熟练' })).toBeTruthy()
  })

  it('点击评分按钮时把对应状态传给 onRate', () => {
    const onRate = vi.fn()
    render(<ReviewCard question={question} note={null} onRate={onRate} />)
    fireEvent.click(screen.getByRole('button', { name: '显示答案' }))
    fireEvent.click(screen.getByRole('button', { name: '模糊' }))
    expect(onRate).toHaveBeenCalledWith('fuzzy')
  })

  it('个人笔记仅在显示答案后出现且默认折叠', () => {
    const note: PersonalNote = { questionId: 'q1', content: '我的复习笔记', updatedAt: '2026-08-04T00:00:00.000Z' }
    render(<ReviewCard question={question} note={note} onRate={vi.fn()} />)
    // 显示答案前不出现（避免答题前泄露笔记）
    expect(screen.queryByText('我的复习笔记')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '显示答案' }))
    const details = screen.getByText('个人笔记').closest('details')
    expect(details).toBeTruthy()
    // 默认折叠（details 无 open 属性），内容在 DOM 中但不可见
    expect(details?.getAttribute('open')).toBeNull()
    expect(screen.getByText('我的复习笔记')).toBeTruthy()
  })
})
