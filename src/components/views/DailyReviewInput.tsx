import { useState, useRef, KeyboardEvent } from 'react'
import { Send, GripVertical } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { DailyReviewBlock } from '../../types/dailyReview'

interface DailyReviewInputProps {
  onSubmit: (date: string, blocks: DailyReviewBlock[]) => Promise<void>
}

// Helper to get local date string YYYY-MM-DD
function getLocalDateString(date: Date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function DailyReviewInput({ onSubmit }: DailyReviewInputProps) {
  const [blocks, setBlocks] = useState<DailyReviewBlock[]>([{ id: crypto.randomUUID(), content: '' }])
  const [date, setDate] = useState(getLocalDateString())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const hasContent = blocks.some((b) => b.content.trim() !== '')

  const handleSubmit = async () => {
    const validBlocks = blocks.map(b => ({ ...b, content: b.content.trim() })).filter(b => b.content !== '')
    if (validBlocks.length === 0 || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSubmit(date, validBlocks)
      setBlocks([{ id: crypto.randomUUID(), content: '' }])
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      const newBlock: DailyReviewBlock = { id: crypto.randomUUID(), content: '' }
      const nextBlocks = [...blocks]
      
      // Split logic could be added here, but for now just add below
      nextBlocks.splice(index + 1, 0, newBlock)
      setBlocks(nextBlocks)
      
      setTimeout(() => {
        const nextInput = inputRefs.current.get(newBlock.id)
        if (nextInput) nextInput.focus()
      }, 0)
      return
    }

    if (e.key === 'Backspace') {
      const input = e.currentTarget
      if (input.selectionStart === 0 && input.selectionEnd === 0) {
        e.preventDefault()
        if (blocks.length > 1) {
          // If block has content, merge it to previous block
          const currentContent = blocks[index].content
          const nextBlocks = blocks.filter((_, i) => i !== index)
          
          if (index > 0) {
            const prevContentLength = nextBlocks[index - 1].content.length
            nextBlocks[index - 1].content += currentContent
            setBlocks(nextBlocks)
            
            setTimeout(() => {
              const prevInput = inputRefs.current.get(nextBlocks[index - 1].id)
              if (prevInput) {
                prevInput.focus()
                prevInput.setSelectionRange(prevContentLength, prevContentLength)
              }
            }, 0)
          } else {
            setBlocks(nextBlocks)
            setTimeout(() => {
              const nextInput = inputRefs.current.get(nextBlocks[0].id)
              if (nextInput) nextInput.focus()
            }, 0)
          }
        }
      }
    }
    
    // Up arrow
    if (e.key === 'ArrowUp' && index > 0) {
       e.preventDefault()
       const prevInput = inputRefs.current.get(blocks[index - 1]?.id)
       if (prevInput) prevInput.focus()
    }
    
    // Down arrow
    if (e.key === 'ArrowDown' && index < blocks.length - 1) {
       e.preventDefault()
       const nextInput = inputRefs.current.get(blocks[index + 1]?.id)
       if (nextInput) nextInput.focus()
    }
  }

  const updateBlock = (index: number, content: string) => {
    const nextBlocks = [...blocks]
    nextBlocks[index].content = content
    setBlocks(nextBlocks)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    const text = e.clipboardData.getData('text/plain')
    if (text.includes('\n')) {
      e.preventDefault()
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
      if (lines.length > 0) {
        const nextBlocks = [...blocks]
        nextBlocks[index].content += lines[0]
        
        const newBlocks = lines.slice(1).map(line => ({ id: crypto.randomUUID(), content: line }))
        nextBlocks.splice(index + 1, 0, ...newBlocks)
        
        setBlocks(nextBlocks)
        setTimeout(() => {
          const lastInput = inputRefs.current.get(newBlocks[newBlocks.length - 1]?.id || nextBlocks[index].id)
          if (lastInput) lastInput.focus()
        }, 0)
      }
    }
  }

  return (
    <div className="glass-panel p-4 rounded-xl border border-white/10 mb-12 flex flex-col gap-3 transition-all focus-within:border-theme-accent/50 focus-within:shadow-md">
      <div className="flex flex-col gap-1.5 w-full min-h-[60px]">
        {blocks.map((block, index) => (
          <div key={block.id} className="flex items-start gap-2 group relative">
            <div className="w-4 h-4 mt-1 rounded-sm hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 cursor-grab active:cursor-grabbing text-theme-secondary/40">
               <GripVertical className="w-3 h-3" />
            </div>
            <input
              ref={(el) => {
                if (el) inputRefs.current.set(block.id, el)
                else inputRefs.current.delete(block.id)
              }}
              value={block.content}
              onChange={(e) => updateBlock(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={(e) => handlePaste(e, index)}
              placeholder={index === 0 && blocks.length === 1 ? "今天做了什么？有什么反思？ (Cmd+Enter 发送)" : ""}
              className="w-full bg-transparent text-theme-primary placeholder-theme-secondary/50 focus:outline-none text-sm leading-relaxed py-0.5"
            />
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1">
        <div className="flex items-center gap-2">
          <input 
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-theme-card border border-white/10 rounded-lg px-2 py-1 text-xs text-theme-secondary focus:outline-none focus:border-theme-accent/50 cursor-pointer"
          />
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={!hasContent || isSubmitting}
          className={cn(
            "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all",
            hasContent && !isSubmitting
              ? "bg-theme-accent text-white hover:bg-theme-accent-light"
              : "bg-theme-card text-theme-secondary/50 cursor-not-allowed"
          )}
        >
          <Send className="w-3 h-3" />
          <span>记录</span>
        </button>
      </div>
    </div>
  )
}
