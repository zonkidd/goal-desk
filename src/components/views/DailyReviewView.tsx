import { useEffect, useRef } from 'react'
import { useDailyReviewStore } from '../../store/appStore'
import { DailyReviewInput } from './DailyReviewInput'
import { DailyReviewItemCard } from './DailyReviewItemCard'

export function DailyReviewView() {
  const { items, loading, hasMore, loadInitialTimeline, loadMoreTimeline, createItem, updateItem, deleteItem } = useDailyReviewStore()
  
  // Intersection Observer for infinite scrolling
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadInitialTimeline()
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMoreTimeline()
        }
      },
      { threshold: 1.0 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [observerTarget, hasMore, loading, loadMoreTimeline])

  return (
    <div className="w-full max-w-3xl mx-auto pb-32">
      <h2 className="text-2xl font-bold mb-8">每日复盘 Daily Review</h2>
      
      <DailyReviewInput onSubmit={createItem} />

      <div className="space-y-4">
        {items.map(item => (
          <DailyReviewItemCard
            key={item.id}
            item={item}
            onUpdate={updateItem}
            onDelete={deleteItem}
          />
        ))}
        
        {loading && (
          <div className="py-8 text-center text-theme-secondary text-sm animate-pulse font-medium tracking-widest uppercase">
            Loading...
          </div>
        )}
        
        {!loading && hasMore && (
          <div ref={observerTarget} className="h-4 w-full" />
        )}
        
        {!loading && !hasMore && items.length > 0 && (
          <div className="py-12 text-center flex items-center justify-center gap-4 text-theme-secondary/40">
            <div className="h-px w-12 bg-theme-secondary/20" />
            <span className="text-xs uppercase tracking-[0.2em] font-bold">End of Timeline</span>
            <div className="h-px w-12 bg-theme-secondary/20" />
          </div>
        )}
        
        {!loading && !hasMore && items.length === 0 && (
          <div className="py-20 text-center text-theme-secondary/60 flex flex-col items-center gap-3">
            <span className="text-4xl">🌱</span>
            <p className="text-sm">还没写过复盘哦，从今天开始记录吧！</p>
          </div>
        )}
      </div>
    </div>
  )
}
