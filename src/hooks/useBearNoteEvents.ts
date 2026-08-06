import { listen } from '@tauri-apps/api/event'
import { useEffect } from 'react'
import { getRuntimeAdapter } from '../lib/runtimeAdapter'
import { TaskCodec } from '../lib/codecs'
import { bearNotePreviewFromRust } from '../lib/tauriCommands'
import { useBearNoteStore } from '../store/bearNoteStore'
import { useTaskStore } from '../store/taskStore'
import { useUiStore } from '../store/uiStore'
import type { BearNoteErrorEvent, RustLinkedBearNote } from '../types/bear'

export function useBearNoteEvents() {
  useEffect(() => {
    const runtime = getRuntimeAdapter()
    if (!runtime.isTauri() || runtime.getWindowLabel() !== 'main') return

    const linked = listen<RustLinkedBearNote>('bear-note:linked', (event) => {
      const task = TaskCodec.fromRust(event.payload.task)
      const preview = bearNotePreviewFromRust(event.payload.preview)
      useTaskStore.getState().replaceTask(task)
      useBearNoteStore.getState().receiveLinkedNote({ task, preview })
      useUiStore.getState().setStatusMessage('Bear note linked')
    })

    const error = listen<BearNoteErrorEvent>('bear-note:error', (event) => {
      useBearNoteStore.getState().receiveError(event.payload.message)
      useUiStore.getState().setStatusMessage(`Bear note failed · ${event.payload.message}`)
    })

    return () => {
      void linked.then((cleanup) => cleanup())
      void error.then((cleanup) => cleanup())
    }
  }, [])
}
