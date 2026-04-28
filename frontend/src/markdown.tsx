import type { ReactNode } from 'react'

function renderInline(text: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/)
  return tokens.map((tok, i) => {
    if (tok.startsWith('**') && tok.endsWith('**'))
      return <strong key={i}>{tok.slice(2, -2)}</strong>
    if (tok.startsWith('*') && tok.endsWith('*'))
      return <em key={i}>{tok.slice(1, -1)}</em>
    if (tok.startsWith('`') && tok.endsWith('`'))
      return <code key={i} className="inline-code">{tok.slice(1, -1)}</code>
    return tok
  })
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trimStart().startsWith('```')) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++
      elements.push(<pre key={elements.length} className="code-block">{codeLines.join('\n')}</pre>)
      continue
    }

    if (line.trimStart().startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trimStart().startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      const dataRows = tableLines.filter(r => !/^\|[\s\-:|]+\|$/.test(r.trim()))
      if (dataRows.length > 0) {
        const parseRow = (row: string) => row.split('|').slice(1, -1).map(c => c.trim())
        const headerCells = parseRow(dataRows[0])
        const bodyRows = dataRows.slice(1)
        elements.push(
          <div key={elements.length} className="md-table-wrap">
            <table className="md-table">
              <thead>
                <tr>{headerCells.map((c, j) => <th key={j}>{renderInline(c)}</th>)}</tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr key={ri}>
                    {parseRow(row).map((c, j) => <td key={j}>{renderInline(c)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

    const headerMatch = line.match(/^(#{1,3})\s+(.+)/)
    if (headerMatch) {
      const level = headerMatch[1].length as 1 | 2 | 3
      const Tag = `h${level + 1}` as 'h2' | 'h3' | 'h4'
      elements.push(<Tag key={elements.length} className="md-heading">{renderInline(headerMatch[2])}</Tag>)
      i++
      continue
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''))
        i++
      }
      elements.push(
        <ul key={elements.length} className="md-list">
          {items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
        </ul>
      )
      continue
    }

    if (line.trim() === '') {
      elements.push(<div key={elements.length} className="md-spacer" />)
      i++
      continue
    }

    elements.push(<p key={elements.length} className="md-p">{renderInline(line)}</p>)
    i++
  }

  return <>{elements}</>
}
