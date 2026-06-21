import type { MutationAdapter } from '../lib/mutationAdapter'

export async function executeMutation<T>(
  fn: (adapter: MutationAdapter) => Promise<T>,
  adapter: MutationAdapter,
  options?: {
    onSuccess?: (result: T) => void
    onError?: (error: unknown) => void
  },
): Promise<T | null> {
  try {
    const result = await fn(adapter)
    options?.onSuccess?.(result)
    return result
  } catch (error) {
    console.error('Mutation failed:', error)
    options?.onError?.(error)
    return null
  }
}

