import { useRef, useState } from 'react'
import { ChevronDown, Download, FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from './ui'
import PortalDropdown from './PortalDropdown'
import { useToast } from './Toast'
import { useDropdown } from '../lib/useDropdown'
import { useI18n } from '../lib/i18n'
import { exportTable, type ExportCell } from '../lib/exporters'

export interface ExportButtonProps {
  /** Nom de base du fichier (sans extension). */
  filenameBase: string
  /** Titre du document (utilisé pour la feuille Excel et le PDF). */
  title: string
  /** En-têtes de colonnes, dans l'ordre d'affichage. */
  headers: string[]
  /**
   * Lignes déjà disponibles, ou fonction asynchrone qui va chercher
   * toutes les lignes correspondant aux filtres actifs.
   */
  rows: ExportCell[][] | (() => ExportCell[][] | Promise<ExportCell[][]>)
  disabled?: boolean
  variant?: 'primary' | 'dark' | 'secondary' | 'danger' | 'ghost' | 'success'
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

/**
 * Bouton d'export proposant un vrai fichier Excel (.xls) et un CSV
 * compatible Excel (UTF-8 BOM, séparateur « ; »).
 *
 * Le menu est rendu dans un portail : il passe ainsi toujours au-dessus
 * des tableaux et n'est jamais rogné par les conteneurs `overflow-hidden`.
 */
export function ExportButton({
  filenameBase,
  title,
  headers,
  rows,
  disabled = false,
  variant = 'secondary',
  size = 'sm',
  label,
}: ExportButtonProps) {
  const [pending, setPending] = useState(false)
  const { isOpen, close, triggerProps, dropdownProps } = useDropdown()
  const anchorRef = useRef<HTMLSpanElement>(null)
  const toast = useToast()
  const { t } = useI18n()

  async function handle(format: 'Excel' | 'CSV') {
    if (pending) return
    close()
    setPending(true)
    try {
      const resolved = typeof rows === 'function' ? await rows() : rows
      if (!resolved || resolved.length === 0) {
        toast.info(t('common.export.noData'))
        return
      }
      exportTable(format, filenameBase, title, headers, resolved)
      toast.success(t('toast.exportDone'))
    } catch {
      toast.error(t('common.export.error'))
    } finally {
      setPending(false)
    }
  }

  return (
    <span ref={anchorRef} {...triggerProps} className="inline-flex">
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={disabled || pending}
        loading={pending}
      >
        <Download className="h-4 w-4" />
        {label ?? t('common.export')}
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </Button>
      <PortalDropdown
        anchorRef={anchorRef}
        open={isOpen}
        onClose={close}
        width={200}
        dropdownProps={dropdownProps as unknown as Record<string, unknown>}
      >
        <div className="overflow-hidden rounded-xl bg-white p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => handle('Excel')}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
            {t('common.export.excel')}
          </button>
          <button
            type="button"
            onClick={() => handle('CSV')}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <FileText className="h-4 w-4 text-sky-500" />
            {t('common.export.csv')}
          </button>
        </div>
      </PortalDropdown>
    </span>
  )
}
