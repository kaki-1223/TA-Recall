import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../App'

// 未启用 vitest globals，testing-library 不会自动清理；同时清空 localStorage 保证测试隔离
afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('App', () => {
  it('渲染应用标题与导航', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'TA Recall' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '题库' })).toBeTruthy()
  })

  it('通过表单新增题目后进入新题详情页', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '＋ 新增题目' }))
    fireEvent.change(screen.getByLabelText('问题标题'), { target: { value: '我的新题目' } })
    fireEvent.change(screen.getByLabelText('30 秒简答'), { target: { value: '我的简答' } })
    fireEvent.change(screen.getByLabelText('详细解释'), { target: { value: '我的解释' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(screen.getByRole('heading', { name: '我的新题目' })).toBeTruthy()
    expect(screen.getByText('我的简答')).toBeTruthy()
  })

  it('编辑题目后详情内容更新', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /渲染管线的流程/ }))
    fireEvent.click(screen.getByRole('button', { name: '编辑题目' }))
    const titleInput = screen.getByLabelText('问题标题') as HTMLInputElement
    expect(titleInput.value).toBe('简述现代 GPU 实时渲染管线的流程')
    fireEvent.change(titleInput, { target: { value: '简述 GPU 渲染管线流程（改）' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(screen.getByRole('heading', { name: '简述 GPU 渲染管线流程（改）' })).toBeTruthy()
  })
})
