export interface DailyReviewBlock {
  id: string
  content: string
}

export interface DailyReviewItem {
  id: string
  date: string // YYYY-MM-DD format
  blocks: DailyReviewBlock[]
  createdAt: Date
  updatedAt: Date
}
