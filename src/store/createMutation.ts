import { getWorkspaceMutationAdapter } from '../lib/workspaceMutations'
import type { MutationAdapter } from '../lib/mutationAdapter'

export function createMutation<TInput, TResult>(
  methodFn: (adapter: MutationAdapter, input: TInput) => Promise<TResult>,
  updater: (currentState: unknown, result: TResult) => Record<string, unknown>,
  set: (partial: Record<string, unknown> | ((state: unknown) => Record<string, unknown>)) => void,
  get: () => unknown,
): (input: TInput) => Promise<TResult | null> {
  return async (input: TInput) => {
    try {
      const adapter = getWorkspaceMutationAdapter()
      const result = await methodFn(adapter, input)
      set(updater(get(), result))
      return result
    } catch (error) {
      console.error('Mutation failed:', error)
      return null
    }
  }
}
