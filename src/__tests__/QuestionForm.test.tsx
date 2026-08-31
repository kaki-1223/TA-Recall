import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import QuestionForm from '../components/QuestionForm'
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

// 未启用 vitest globals，testing-library 不会自动清理，需手动卸载 DOM
afterEach(cleanup)

describe('QuestionForm', () => {
  it('新增模式渲染全部字段与默认值', () => {
    render(
      <QuestionForm mode="create" initial={null} candidateBank={[]} saveError={null} onSave={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(screen.getByLabelText('问题标题')).toBeTruthy()
    expect(screen.getByLabelText('分类')).toBeTruthy()
    expect(screen.getByLabelText('难度')).toBeTruthy()
    expect(screen.getByLabelText('标签')).toBeTruthy()
    expect(screen.getByLabelText('30 秒简答')).toBeTruthy()
    expect(screen.getByLabelText('回答关键词')).toBeTruthy()
    expect(screen.getByLabelText('详细解释')).toBeTruthy()
    expect(screen.getByLabelText('相关项目')).toBeTruthy()
    expect(screen.getByLabelText('资料来源')).toBeTruthy()
    expect(screen.getByText('追问题目')).toBeTruthy()
    expect(screen.getByRole('button', { name: '保存' })).toBeTruthy()
    // 新建追问输入框默认预填
    expect((screen.getByLabelText('新建追问标题') as HTMLInputElement).value).toBe('追问：')
  })

  it('编辑模式回填题目内容', () => {
    const question = makeQuestion('q1', { title: '原标题', tags: ['标签A'] })
    render(
      <QuestionForm mode="edit" initial={question} candidateBank={[]} saveError={null} onSave={vi.fn()} onCancel={vi.fn()} />,
    )
    expect((screen.getByLabelText('问题标题') as HTMLInputElement).value).toBe('原标题')
    expect((screen.getByLabelText('30 秒简答') as HTMLTextAreaElement).value).toBe('简答')
    expect(screen.getByText('标签A')).toBeTruthy()
    expect((screen.getByLabelText('新建追问标题') as HTMLInputElement).value).toBe('追问：原标题')
  })

  it('必填字段为空时阻止保存并显示明确错误', () => {
    const onSave = vi.fn()
    render(
      <QuestionForm mode="create" initial={null} candidateBank={[]} saveError={null} onSave={onSave} onCancel={vi.fn()} />,
    )
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(screen.getByText('问题标题不能为空')).toBeTruthy()
    expect(screen.getByText('30 秒简答不能为空')).toBeTruthy()
    expect(screen.getByText('详细解释不能为空')).toBeTruthy()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('标签支持添加、去重与移除', () => {
    render(
      <QuestionForm mode="create" initial={null} candidateBank={[]} saveError={null} onSave={vi.fn()} onCancel={vi.fn()} />,
    )
    const input = screen.getByLabelText('标签')
    fireEvent.change(input, { target: { value: 'PBR' } })
    fireEvent.click(screen.getByRole('button', { name: '添加标签' }))
    fireEvent.change(input, { target: { value: 'PBR' } })
    fireEvent.click(screen.getByRole('button', { name: '添加标签' }))
    fireEvent.change(input, { target: { value: '移动端' } })
    fireEvent.click(screen.getByRole('button', { name: '添加标签' }))
    expect(screen.getAllByText('PBR')).toHaveLength(1)
    expect(screen.getAllByText('移动端')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: '移除 标签 PBR' }))
    expect(screen.queryByText('PBR')).toBeNull()
  })

  it('保存时传入去除首尾空格的输入与待创建追问标题', () => {
    const onSave = vi.fn()
    render(
      <QuestionForm mode="create" initial={null} candidateBank={[]} saveError={null} onSave={onSave} onCancel={vi.fn()} />,
    )
    fireEvent.change(screen.getByLabelText('问题标题'), { target: { value: '  我的新题  ' } })
    fireEvent.change(screen.getByLabelText('30 秒简答'), { target: { value: '简答内容' } })
    fireEvent.change(screen.getByLabelText('详细解释'), { target: { value: '解释内容' } })
    fireEvent.change(screen.getByLabelText('新建追问标题'), { target: { value: '追问：如何优化？' } })
    fireEvent.click(screen.getByRole('button', { name: '新建' }))
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(onSave).toHaveBeenCalledTimes(1)
    const [input, pending] = onSave.mock.calls[0]
    expect(input.title).toBe('我的新题')
    expect(input.shortAnswer).toBe('简答内容')
    expect(input.explanation).toBe('解释内容')
    expect(pending).toEqual(['追问：如何优化？'])
  })

  it('追问：关联已有题目、解除关联并随保存提交', () => {
    const candidates = [makeQuestion('c1'), makeQuestion('c2')]
    const onSave = vi.fn()
    render(
      <QuestionForm mode="create" initial={null} candidateBank={candidates} saveError={null} onSave={onSave} onCancel={vi.fn()} />,
    )
    fireEvent.change(screen.getByLabelText('问题标题'), { target: { value: '父题' } })
    fireEvent.change(screen.getByLabelText('30 秒简答'), { target: { value: '简答' } })
    fireEvent.change(screen.getByLabelText('详细解释'), { target: { value: '解释' } })

    fireEvent.change(screen.getByLabelText('关联已有题目'), { target: { value: 'c1' } })
    fireEvent.click(screen.getByRole('button', { name: '关联' }))
    fireEvent.change(screen.getByLabelText('关联已有题目'), { target: { value: 'c2' } })
    fireEvent.click(screen.getByRole('button', { name: '关联' }))
    expect(screen.getByText('题目 c1')).toBeTruthy()

    fireEvent.click(screen.getAllByRole('button', { name: '解除关联' })[0])
    // 解除后只剩 c2 仍处于关联状态（c1 会重新出现在候选下拉中）
    expect(screen.getAllByRole('button', { name: '解除关联' })).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    const [input] = onSave.mock.calls[0]
    expect(input.followUpQuestionIds).toEqual(['c2'])
  })

  it('保存失败错误信息展示', () => {
    render(
      <QuestionForm
        mode="create"
        initial={null}
        candidateBank={[]}
        saveError="保存失败（本地存储不可用），数据未变更"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText('保存失败（本地存储不可用），数据未变更')).toBeTruthy()
  })

  it('取消调用 onCancel', () => {
    const onCancel = vi.fn()
    render(
      <QuestionForm mode="create" initial={null} candidateBank={[]} saveError={null} onSave={vi.fn()} onCancel={onCancel} />,
    )
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
