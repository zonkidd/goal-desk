import type { MutationAdapter } from '../lib/mutationAdapter'

export async function executeMutation<T>(
  fn: (adapter: MutationAdapter) => Promise<T>,
  adapter: MutationAdapter,
  options?: {
    onSuccess?: (result: T) => void | Promise<void>
    onError?: (error: unknown) => void | Promise<void>
  },
): Promise<T | null> {
  try {
    const result = await fn(adapter)
    await options?.onSuccess?.(result)
    return result
  } catch (error) {
    console.error('Mutation failed:', error)
    await options?.onError?.(error)
    return null
  }
}

