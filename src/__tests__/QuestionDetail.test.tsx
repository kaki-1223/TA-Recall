import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import QuestionDetail from '../components/QuestionDetail'
import type { PersonalNote, Question } from '../types/question'

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

function makeNote(questionId: string, content: string): PersonalNote {
  return { questionId, content, updatedAt: '2026-08-04T00:00:00.000Z' }
}

const noop = () => undefined

function renderDetail(question: Question, overrides: Partial<Record<'followUpQuestions' | 'note', unknown>> = {}) {
  return render(
    <QuestionDetail
      question={question}
      followUpQuestions={(overrides.followUpQuestions as Question[]) ?? []}
      note={(overrides.note as PersonalNote | null) ?? null}
      onBack={vi.fn()}
      onEdit={vi.fn()}
      onArchive={vi.fn()}
      onOpenFollowUp={vi.fn()}
      onConvertLegacy={vi.fn()}
      onRemoveLegacy={vi.fn()}
      onSaveNote={vi.fn()}
    />,
  )
}

// 未启用 vitest globals，testing-library 不会自动清理，需手动卸载 DOM
afterEach(cleanup)

describe('QuestionDetail 个人笔记', () => {
  it('无笔记时显示添加入口，保存后调用 onSaveNote', () => {
    const onSaveNote = vi.fn()
    render(
      <QuestionDetail
        question={makeQuestion('q1')}
        followUpQuestions={[]}
        note={null}
        onBack={noop}
        onEdit={noop}
        onArchive={noop}
        onOpenFollowUp={noop}
        onConvertLegacy={noop}
        onRemoveLegacy={noop}
        onSaveNote={onSaveNote}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '添加笔记' }))
    fireEvent.change(screen.getByLabelText('个人笔记内容'), { target: { value: '  我的笔记  ' } })
    fireEvent.click(screen.getByRole('button', { name: '保存笔记' }))
    // 内容原样交给上层（由数据层负责去除空格与持久化）
    expect(onSaveNote).toHaveBeenCalledWith('  我的笔记  ')
    // 保存后退出编辑态（note prop 未变时回到空态展示）
    expect(screen.queryByRole('button', { name: '保存笔记' })).toBeNull()
  })

  it('有笔记时展示内容并可进入编辑', () => {
    renderDetail(makeQuestion('q1'), { note: makeNote('q1', '已有笔记内容') })
    expect(screen.getByText('已有笔记内容')).toBeTruthy()
    expect(screen.getByRole('button', { name: '编辑笔记' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '添加笔记' })).toBeNull()
  })
})

describe('QuestionDetail 常见追问', () => {
  it('展示已关联的追问题目，点击打开对应题目', () => {
    const onOpenFollowUp = vi.fn()
    render(
      <QuestionDetail
        question={makeQuestion('p', { followUpQuestionIds: ['c1'] })}
        followUpQuestions={[makeQuestion('c1', { title: '追问子题' })]}
        note={null}
        onBack={noop}
        onEdit={noop}
        onArchive={noop}
        onOpenFollowUp={onOpenFollowUp}
        onConvertLegacy={noop}
        onRemoveLegacy={noop}
        onSaveNote={noop}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '追问子题' }))
    expect(onOpenFollowUp).toHaveBeenCalledWith('c1')
  })

  it('遗留文本追问提供转为题目与移除（移除需二次确认）', () => {
    const onConvertLegacy = vi.fn()
    const onRemoveLegacy = vi.fn()
    render(
      <QuestionDetail
        question={makeQuestion('p', { followUps: ['旧追问一', '旧追问二'] })}
        followUpQuestions={[]}
        note={null}
        onBack={noop}
        onEdit={noop}
        onArchive={noop}
        onOpenFollowUp={noop}
        onConvertLegacy={onConvertLegacy}
        onRemoveLegacy={onRemoveLegacy}
        onSaveNote={noop}
      />,
    )
    // 转为题目
    fireEvent.click(screen.getAllByRole('button', { name: '转为题目' })[0])
    expect(onConvertLegacy).toHaveBeenCalledWith('旧追问一')

    // 移除：第一次点击进入确认态，未调用
    fireEvent.click(screen.getAllByRole('button', { name: '移除' })[0])
    expect(onRemoveLegacy).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '确认移除' })).toBeTruthy()
    // 取消恢复
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(onRemoveLegacy).not.toHaveBeenCalled()
    // 再次进入确认态并确认
    fireEvent.click(screen.getAllByRole('button', { name: '移除' })[0])
    fireEvent.click(screen.getByRole('button', { name: '确认移除' }))
    expect(onRemoveLegacy).toHaveBeenCalledWith('旧追问一')
  })

  it('无追问时显示提示；归档题目不显示归档按钮', () => {
    renderDetail(makeQuestion('q1'))
    expect(screen.getByText('暂无追问')).toBeTruthy()
    expect(screen.getByRole('button', { name: '归档题目' })).toBeTruthy()

    cleanup()
    renderDetail(makeQuestion('q1', { archived: true }))
    expect(screen.queryByRole('button', { name: '归档题目' })).toBeNull()
  })
})
