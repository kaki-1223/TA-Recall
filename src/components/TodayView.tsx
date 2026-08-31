import { useState } from 'react'
import type { PersonalNote, Question, ReviewRecord, ReviewStatus } from '../types/question'
import { getTodayQueue } from '../utils/due'
import ReviewCard from './ReviewCard'

interface TodayViewProps {
  questions: Question[]
  records: ReviewRecord[]
  notes: PersonalNote[]
  /** 当前时间（ISO），由调用方传入，便于测试 */
  now: string
  onRate: (questionId: string, status: ReviewStatus) => void
}

/** 今日复习：按优先级队列逐题复习，显示今日/已完成/剩余数量 */
function TodayView({ questions, records, notes, now, onRate }: TodayViewProps) {
  const [queue, setQueue] = useState(() => getTodayQueue(questions, records, now))
  const [completed, setCompleted] = useState(0)

  const remaining = queue.length - completed

  if (queue.length === 0) {
    return <p className="empty-hint">今天没有需要复习的题目，全部掌握啦</p>
  }

  if (completed >= queue.length) {
    return (
      <div className="review-done">
        <h2>今日复习完成</h2>
        <p>
          共 {queue.length} 道题，已完成 {completed} 道
        </p>
        <button
          type="button"
          className="back-button"
          onClick={() => {
            setQueue(getTodayQueue(questions, records, now))
            setCompleted(0)
          }}
        >
          重新开始
        </button>
      </div>
    )
  }

  const current = queue[completed]
  const note = notes.find((n) => n.questionId === current.id) ?? null
  return (
    <div className="review-view">
      <p className="result-count">
        今日 {queue.length} 题 · 已完成 {completed} · 剩余 {remaining}
      </p>
      <ReviewCard
        key={current.id}
        question={current}
        note={note}
        onRate={(status) => {
          onRate(current.id, status)
          setCompleted((c) => c + 1)
        }}
      />
    </div>
  )
}

export default TodayView
