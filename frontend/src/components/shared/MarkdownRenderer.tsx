import React, { useState } from 'react'
import { Copy, Check, Terminal, FileCode, CheckCircle2, AlertTriangle } from 'lucide-react'

interface MarkdownRendererProps {
  content: string
  className?: string
}

type Block =
  | { type: 'code'; language: string; content: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'heading'; level: number; text: string }
  | { type: 'list-item'; text: string; prefix?: string }
  | { type: 'paragraph'; text: string }

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  // Parse markdown content into structured blocks
  const parseBlocks = (raw: string): Block[] => {
    const lines = raw.split('\n')
    const blocks: Block[] = []
    let i = 0

    while (i < lines.length) {
      const line = lines[i]

      // Code block
      if (line.trim().startsWith('```')) {
        const lang = line.trim().slice(3).trim() || 'code'
        const codeLines: string[] = []
        i++
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i])
          i++
        }
        i++ // Skip closing ```
        blocks.push({
          type: 'code',
          language: lang,
          content: codeLines.join('\n'),
        })
        continue
      }

      // Markdown Table
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const tableLines: string[] = []
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableLines.push(lines[i].trim())
          i++
        }

        if (tableLines.length >= 2) {
          const splitRow = (rowStr: string) =>
            rowStr
              .slice(1, -1)
              .split('|')
              .map((c) => c.trim())

          const headers = splitRow(tableLines[0])
          // Check if second line is separator |---|---|
          const hasSeparator = tableLines[1].includes('---')
          const dataRows = (hasSeparator ? tableLines.slice(2) : tableLines.slice(1)).map(splitRow)

          blocks.push({
            type: 'table',
            headers,
            rows: dataRows,
          })
          continue
        }
      }

      // Headings (### or ##)
      if (line.startsWith('### ')) {
        blocks.push({ type: 'heading', level: 3, text: line.slice(4).trim() })
        i++
        continue
      }
      if (line.startsWith('## ')) {
        blocks.push({ type: 'heading', level: 2, text: line.slice(3).trim() })
        i++
        continue
      }

      // Lists (- or * or 1.)
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        blocks.push({ type: 'list-item', text: line.trim().slice(2).trim() })
        i++
        continue
      }
      const numMatch = line.trim().match(/^(\d+)\.\s+(.*)$/)
      if (numMatch) {
        blocks.push({ type: 'list-item', prefix: `${numMatch[1]}.`, text: numMatch[2].trim() })
        i++
        continue
      }

      // Empty line
      if (!line.trim()) {
        i++
        continue
      }

      // Paragraph
      blocks.push({ type: 'paragraph', text: line })
      i++
    }

    return blocks
  }

  // Render inline spans (**bold**, `code`, plain)
  const renderInline = (text: string): React.ReactNode => {
    // Regex splits on **bold** and `code`
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g)

    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-semibold text-cp-text">
            {part.slice(2, -2)}
          </strong>
        )
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        const codeText = part.slice(1, -1)
        const isChip = codeText.startsWith('[') && codeText.endsWith(']')
        return (
          <code
            key={idx}
            className={`font-mono px-1.5 py-0.5 rounded text-[11px] ${
              isChip
                ? 'bg-cp-crimson/15 text-cp-crimson font-medium border border-cp-crimson/30'
                : 'bg-cp-card/90 text-cp-crimson border border-cp-border/60'
            }`}
          >
            {codeText}
          </code>
        )
      }
      return part
    })
  }

  const blocks = parseBlocks(content)

  return (
    <div className={`space-y-3 font-sans text-xs leading-relaxed text-cp-text ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <div
              key={index}
              className="mt-3.5 mb-1.5 flex items-center gap-2 border-l-2 border-cp-crimson pl-2.5 font-semibold text-cp-text text-xs tracking-tight"
            >
              <span>{renderInline(block.text)}</span>
            </div>
          )
        }

        if (block.type === 'code') {
          return (
            <div
              key={index}
              className="my-3 overflow-hidden rounded-lg border border-cp-border bg-[#0B0C0E] shadow-md"
            >
              <div className="flex items-center justify-between border-b border-cp-border/60 bg-cp-secondary/80 px-3 py-1.5 text-[11px] font-mono text-cp-text-secondary">
                <span className="flex items-center gap-1.5 font-bold uppercase text-cp-crimson">
                  <Terminal className="h-3 w-3" />
                  {block.language}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(block.content, index)}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-cp-text-secondary hover:text-cp-text hover:bg-cp-elevated transition-colors"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="h-3 w-3 text-cp-healthy" />
                      <span className="text-[10px] text-cp-healthy">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span className="text-[10px]">Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 font-mono text-[11px] leading-relaxed text-cp-text overflow-x-auto selection:bg-cp-crimson/30">
                <code>{block.content}</code>
              </pre>
            </div>
          )
        }

        if (block.type === 'table') {
          return (
            <div
              key={index}
              className="my-3 overflow-x-auto rounded-lg border border-cp-border bg-cp-card/50 shadow-sm"
            >
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="border-b border-cp-border bg-cp-secondary/80 text-cp-text-secondary uppercase">
                  <tr>
                    {block.headers.map((h, hIdx) => (
                      <th key={hIdx} className="py-2 px-3 font-semibold text-cp-text">
                        {renderInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-cp-border/40">
                  {block.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-cp-elevated/40 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="py-2 px-3 text-cp-text font-normal">
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        if (block.type === 'list-item') {
          return (
            <div key={index} className="flex items-start gap-2 pl-1">
              {block.prefix ? (
                <span className="shrink-0 font-mono text-[11px] text-cp-crimson font-bold">
                  {block.prefix}
                </span>
              ) : (
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cp-crimson" />
              )}
              <div className="flex-1">{renderInline(block.text)}</div>
            </div>
          )
        }

        return (
          <p key={index} className="text-cp-text leading-relaxed">
            {renderInline(block.text)}
          </p>
        )
      })}
    </div>
  )
}
export default MarkdownRenderer

