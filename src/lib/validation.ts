export function validateRequiredString(value: unknown): string | null {
  if (value == null || typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function validateTaskTitle(title: unknown): string | null {
  return validateRequiredString(title)
}

export function validateGoalInput(input: {
  title: unknown
  area?: unknown
  description?: unknown
}): { title: string; area: string; description: string } | null {
  const title = validateRequiredString(input.title)
  if (!title) return null
  const area = validateRequiredString(input.area) || '未分类'
  const description = validateRequiredString(input.description) || ''
  return { title, area, description }
}

export function validateAreaTitle(title: unknown): string | null {
  return validateRequiredString(title)
}
