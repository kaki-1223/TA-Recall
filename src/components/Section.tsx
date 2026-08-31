interface SectionProps {
  title: string
  items: string[]
}

/** 题目答案的分区展示：标题 + 条目列表 */
function Section({ title, items }: SectionProps) {
  return (
    <section>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

export default Section
