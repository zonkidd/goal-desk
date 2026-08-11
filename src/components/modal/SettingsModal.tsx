import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, Upload, X, Check, Loader2 } from 'lucide-react'
import { useUiStore } from '../../store/uiStore'
import { createWorkspaceMutationAdapter } from '../../lib/workspaceMutations'

export function SettingsModal() {
  const isOpen = useUiStore((state) => state.isSettingsOpen)
  const closeSettings = useUiStore((state) => state.closeSettings)
  const setStatusMessage = useUiStore((state) => state.setStatusMessage)
  const backupDirectory = useUiStore((state) => state.backupDirectory)
  const setBackupDirectory = useUiStore((state) => state.setBackupDirectory)
  
  const [isExporting, setIsExporting] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importSuccess, setImportSuccess] = useState(false)

  const mutations = createWorkspaceMutationAdapter()

  const handleSelectDirectory = async () => {
    const dir = await mutations.pickDirectory()
    if (dir) setBackupDirectory(dir)
  }

  const handleExport = async () => {
    if (isExporting || exportSuccess) return;
    setIsExporting(true)
    try {
      let targetPath: string | undefined = undefined;
      if (backupDirectory) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        targetPath = `${backupDirectory}/kairos-backup-${timestamp}.sqlite`;
      }
      const result = await mutations.exportDatabase(targetPath)
      if (result.statusMessage) setStatusMessage(result.statusMessage)
      
      if (result.success) {
        setExportSuccess(true)
        setTimeout(() => setExportSuccess(false), 2000)
      }
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async () => {
    if (isImporting || importSuccess) return;
    setIsImporting(true)
    try {
      const result = await mutations.importDatabase(backupDirectory ?? undefined)
      if (result.statusMessage) setStatusMessage(result.statusMessage)
      
      if (result.success) {
        setImportSuccess(true)
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        setIsImporting(false)
      }
    } catch {
      setIsImporting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close settings"
            className="fixed inset-0 z-40 bg-slate-900/15 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSettings}
          />
          <motion.div
            className="fixed left-1/2 top-1/2 z-50 w-[480px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/10 bg-theme-card shadow-2xl backdrop-blur-md"
            initial={{ opacity: 0, scale: 0.96, y: '-48%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%' }}
            exit={{ opacity: 0, scale: 0.98, y: '-48%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="text-sm font-bold tracking-tight text-theme-primary">Settings 设置</h2>
              <button onClick={closeSettings} className="text-theme-secondary transition-colors hover:text-theme-primary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-theme-secondary">Data 数据</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-theme-card/30 p-4 ring-1 ring-white/5">
                  <div className="flex-1 mr-4">
                    <p className="text-sm font-semibold text-theme-primary">默认备份位置 (Backup Directory)</p>
                    <p className="mt-1 text-xs text-theme-secondary truncate" title={backupDirectory || '未设置'}>
                      {backupDirectory || '每次备份时手动选择位置'}
                    </p>
                  </div>
                  <button
                    onClick={handleSelectDirectory}
                    className="flex-shrink-0 flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-theme-secondary shadow-sm transition-all hover:bg-theme-card/50 hover:text-theme-primary"
                  >
                    更改
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-theme-card/30 p-4 ring-1 ring-white/5">
                  <div>
                    <p className="text-sm font-semibold text-theme-primary">导出备份 (Export Database)</p>
                    <p className="mt-1 text-xs text-theme-secondary">将本地的所有数据导出为一个 SQLite 文件</p>
                  </div>
                  <button
                    onClick={handleExport}
                    disabled={isExporting || exportSuccess}
                    className="flex items-center gap-2 rounded-lg bg-theme-accent px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-theme-accent-hover disabled:opacity-70 disabled:cursor-not-allowed w-[88px] justify-center"
                  >
                    {isExporting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : exportSuccess ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        成功
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5" />
                        导出
                      </>
                    )}
                  </button>
                </div>
                
                <div className="flex items-center justify-between rounded-xl bg-theme-card/30 p-4 ring-1 ring-white/5">
                  <div>
                    <p className="text-sm font-semibold text-theme-primary">导入恢复 (Restore Backup)</p>
                    <p className="mt-1 text-xs text-theme-secondary">选择一个以前导出的 SQLite 备份文件进行覆盖<br/>⚠️ 恢复后应用将重新加载</p>
                  </div>
                  <button
                    onClick={handleImport}
                    disabled={isImporting || importSuccess}
                    className="flex items-center gap-2 rounded-lg border border-theme-accent text-theme-accent px-3 py-1.5 text-xs font-semibold shadow-sm transition-all hover:bg-theme-accent/10 disabled:opacity-70 disabled:cursor-not-allowed w-[88px] justify-center"
                  >
                    {isImporting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : importSuccess ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        重启中
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        导入
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
