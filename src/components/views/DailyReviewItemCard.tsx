import { useState, useRef, KeyboardEvent } from 'react'
import { Pencil, Trash2, X, Check, GripVertical } from 'lucide-react'
import type { DailyReviewItem, DailyReviewBlock } from '../../types/dailyReview'
import { cn } from '../../lib/cn'

interface DailyReviewItemCardProps {
  item: DailyReviewItem
  onUpdate: (id: string, blocks: DailyReviewBlock[]) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function DailyReviewItemCard({ item, onUpdate, onDelete }: DailyReviewItemCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editBlocks, setEditBlocks] = useState<DailyReviewBlock[]>(item.blocks || [])
  const [isSaving, setIsSaving] = useState(false)
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const handleSave = async () => {
    const validBlocks = editBlocks.map(b => ({ ...b, content: b.content.trim() })).filter(b => b.content !== '')
    if (validBlocks.length === 0 || isSaving) return
    setIsSaving(true)
    try {
      // Check if actually changed
      const isChanged = JSON.stringify(validBlocks) !== JSON.stringify(item.blocks)
      if (isChanged) {
        await onUpdate(item.id, validBlocks)
      }
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditBlocks(item.blocks || [])
    setIsEditing(false)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSave()
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      const newBlock: DailyReviewBlock = { id: crypto.randomUUID(), content: '' }
      const nextBlocks = [...editBlocks]
      nextBlocks.splice(index + 1, 0, newBlock)
      setEditBlocks(nextBlocks)
      
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
        if (editBlocks.length > 1) {
          const currentContent = editBlocks[index].content
          const nextBlocks = editBlocks.filter((_, i) => i !== index)
          
          if (index > 0) {
            const prevContentLength = nextBlocks[index - 1].content.length
            nextBlocks[index - 1].content += currentContent
            setEditBlocks(nextBlocks)
            
            setTimeout(() => {
              const prevInput = inputRefs.current.get(nextBlocks[index - 1].id)
              if (prevInput) {
                prevInput.focus()
                prevInput.setSelectionRange(prevContentLength, prevContentLength)
              }
            }, 0)
          } else {
            setEditBlocks(nextBlocks)
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
       const prevInput = inputRefs.current.get(editBlocks[index - 1]?.id)
       if (prevInput) prevInput.focus()
    }
    
    // Down arrow
    if (e.key === 'ArrowDown' && index < editBlocks.length - 1) {
       e.preventDefault()
       const nextInput = inputRefs.current.get(editBlocks[index + 1]?.id)
       if (nextInput) nextInput.focus()
    }
  }

  const updateBlock = (index: number, content: string) => {
    const nextBlocks = [...editBlocks]
    nextBlocks[index].content = content
    setEditBlocks(nextBlocks)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    const text = e.clipboardData.getData('text/plain')
    if (text.includes('\n')) {
      e.preventDefault()
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
      if (lines.length > 0) {
        const nextBlocks = [...editBlocks]
        nextBlocks[index].content += lines[0]
        
        const newBlocks = lines.slice(1).map(line => ({ id: crypto.randomUUID(), content: line }))
        nextBlocks.splice(index + 1, 0, ...newBlocks)
        
        setEditBlocks(nextBlocks)
        setTimeout(() => {
          const lastInput = inputRefs.current.get(newBlocks[newBlocks.length - 1]?.id || nextBlocks[index].id)
          if (lastInput) lastInput.focus()
        }, 0)
      }
    }
  }

  const handleDelete = async () => {
    if (window.confirm('确定要删除这条复盘吗？(Are you sure you want to delete this review?)')) {
      await onDelete(item.id)
    }
  }

  const displayTime = new Date(item.createdAt).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })

  if (isEditing) {
    return (
      <div className="glass-panel p-4 rounded-xl border border-theme-accent/50 relative transition-all shadow-md">
        <div className="flex flex-col gap-1.5 w-full min-h-[60px]">
          {editBlocks.map((block, index) => (
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
                className="w-full bg-transparent text-theme-primary focus:outline-none text-sm leading-relaxed py-0.5"
                autoFocus={index === 0}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-white/5">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium text-theme-secondary hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" /> 取消
          </button>
          <button
            onClick={handleSave}
            disabled={!editBlocks.some(b => b.content.trim() !== '') || isSaving}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-theme-accent text-white hover:bg-theme-accent-light transition-colors disabled:opacity-50 disabled:bg-theme-card"
          >
            <Check className="w-3.5 h-3.5" /> 保存
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-panel p-5 rounded-xl border border-white/5 relative group transition-all hover:border-white/20">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-theme-secondary bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
            {item.date}
          </span>
          <span className="text-[11px] text-theme-secondary/60">
            {displayTime}
          </span>
        </div>
        
        {/* Actions (visible on hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => {
              setEditBlocks(item.blocks || [])
              setIsEditing(true)
            }}
            className="p-1.5 rounded-md text-theme-secondary hover:text-theme-accent hover:bg-theme-accent/10 transition-colors"
            title="编辑"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-md text-theme-secondary hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="删除"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      <div className="flex flex-col gap-0.5 mt-1">
        {item.blocks?.map((block) => (
          <div key={block.id} className="text-[14px] text-theme-primary leading-relaxed whitespace-pre-wrap pl-1">
             {block.content}
          </div>
        ))}
      </div>
    </div>
  )
}
