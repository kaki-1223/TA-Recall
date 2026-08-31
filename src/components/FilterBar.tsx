import type { FilterState } from '../utils/filter'

interface FilterBarProps {
  categories: string[]
  tags: string[]
  filter: FilterState
  onChange: (filter: FilterState) => void
}

function FilterBar({ categories, tags, filter, onChange }: FilterBarProps) {
  const update = (patch: Partial<FilterState>) => onChange({ ...filter, ...patch })

  return (
    <div className="filter-bar">
      <input
        type="search"
        placeholder="搜索题目、关键词…"
        value={filter.keyword}
        onChange={(e) => update({ keyword: e.target.value })}
      />
      <select
        value={filter.category ?? ''}
        onChange={(e) => update({ category: e.target.value || null })}
      >
        <option value="">全部分类</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select value={filter.tag ?? ''} onChange={(e) => update({ tag: e.target.value || null })}>
        <option value="">全部标签</option>
        {tags.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </div>
  )
}

export default FilterBar
