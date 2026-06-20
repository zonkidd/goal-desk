import type { MutationAdapter } from '../lib/mutationAdapter'

export async function executeMutation<T>(
  fn: (adapter: MutationAdapter) => Promise<T>,
  adapter: MutationAdapter,
  options?: { onSuccess?: (result: T) => void },
): Promise<T | null> {
  try {
    const result = await fn(adapter)
    options?.onSuccess?.(result)
    return result
  } catch (error) {
    console.error('Mutation failed:', error)
    return null
  }
}

export async function executeMutationWithResult<T, R>(
  fn: (adapter: MutationAdapter) => Promise<T>,
  adapter: MutationAdapter,
  options: {
    extractEntity: (result: T) => R | undefined | null
    onSuccess?: (entity: R) => void
  },
): Promise<R | null> {
  try {
    const result = await fn(adapter)
    const entity = options.extractEntity(result)
    if (entity == null) return null
    options.onSuccess?.(entity)
    return entity
  } catch (error) {
    console.error('Mutation failed:', error)
    return null
  }
}
