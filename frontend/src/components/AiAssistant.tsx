import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Sparkles, X, GripHorizontal, RotateCcw, AlertCircle } from 'lucide-react'
import { apiErrorMessage, apiPost } from '../lib/api'
import { useI18n } from '../lib/i18n'

type Position = { x: number; y: number }

type Msg = { role: 'user' | 'bot'; text: string }

const STORAGE_POS = 'mnk_ai_pos'
const FACE = 48
const MARGIN = 20

type ChatInput = { role: string; content: string }

/* ── Bot face (vivant) ── */
function BotFace({ active }: { active: boolean }) {
  return (
    <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 shadow-lg shadow-indigo-500/40 ring-2 ring-white/20">
      <Bot className="h-6 w-6 text-white" />
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-violet-500/40" style={{ animationDuration: '2.5s' }} />
      <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
        <span className={`absolute inline-flex h-full w-full rounded-full ${active ? 'animate-ping bg-emerald-400' : 'bg-emerald-400 opacity-75'}`} />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
      </span>
    </div>
  )
}

/** Position par défaut : bas-droite */
function defaultPos(): Position {
  return { x: Math.max(0, window.innerWidth - FACE - MARGIN), y: Math.max(0, window.innerHeight - FACE - MARGIN) }
}

/* ── M-TAX AI ── */
export default function AiAssistant() {
  const { t } = useI18n()
  const [pos, setPos] = useState<Position>(defaultPos)
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; orig: Position } | null>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const movedRef = useRef(false)

  /* ── restituer position sauvegardée ── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_POS)
      if (saved) {
        const p = JSON.parse(saved) as Position
        setPos({ x: p.x, y: p.y })
      }
    } catch {
      /* ignore */
    }
    const onResize = () => {
      setPos((p) => ({
        x: Math.max(0, Math.min(p.x, window.innerWidth - FACE)),
        y: Math.max(0, Math.min(p.y, window.innerHeight - FACE)),
      }))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  /* ── auto-scroll du chat ── */
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, typing])

  /* ── outils de {t("common.drag")} ── */
  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    movedRef.current = false
    dragRef.current = { startX: e.clientX, startY: e.clientY, orig: pos }
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) movedRef.current = true
    setPos({
      x: Math.max(0, Math.min(dragRef.current.orig.x + dx, window.innerWidth - FACE)),
      y: Math.max(0, Math.min(dragRef.current.orig.y + dy, window.innerHeight - FACE)),
    })
  }

  const onPointerUp = () => {
    if (!dragRef.current) return
    dragRef.current = null
    setDragging(false)
    if (movedRef.current) {
      try {
        localStorage.setItem(STORAGE_POS, JSON.stringify(pos))
      } catch {
        /* ignore */
      }
    }
  }

  function resetPos() {
    setPos(defaultPos())
    localStorage.removeItem(STORAGE_POS)
  }

  /* ── envoi du message à l'IA ── */
  async function send() {
    const text = input.trim()
    if (!text || typing) return
    setMsgs((m) => [...m, { role: 'user', text }])
    setInput('')
    setTyping(true)
    const history: ChatInput[] = msgs.map((m) => ({ role: m.role, content: m.text }))
    try {
      const res = await apiPost<{ reply: string }>('/ai/chat', { message: text, history }, { timeout: 45000 })
      setMsgs((m) => [...m, { role: 'bot', text: res.reply }])
    } catch (err) {
      setMsgs((m) => [
        ...m,
        {
          role: 'bot',
          text: `⚠️ ${apiErrorMessage(err)}`,
        },
      ])
    } finally {
      setTyping(false)
    }
  }

  return (
    <>
      {/* ── Bouton flottant déplaçable ── */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="fixed z-[60] flex items-center gap-1"
        style={{ left: pos.x, top: pos.y, touchAction: 'none' }}
        title={open ? t("ai.close") : t("ai.open")}
      >
        {!open && (
          <span className="flex h-8 items-center gap-0.5 rounded-full bg-slate-900/70 px-2 text-[10px] font-medium text-white backdrop-blur dark:bg-white/15">
            <GripHorizontal className="h-3.5 w-3.5" /> {t("common.drag")}
          </span>
        )}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => {
            if (movedRef.current) return
            setOpen((o) => !o)
          }}
          className={`select-none rounded-2xl transition-transform active:scale-95 ${dragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
          aria-label={open ? t("ai.close") : t("ai.open")}
        >
          <BotFace active={open} />
        </button>
      </div>

      {/* ── Panneau de chat ── */}
      {open && (
        <div
          className="fixed z-[60] flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/20 dark:border-slate-700/50 dark:bg-slate-800"
          style={{ width: 360, maxWidth: 'calc(100vw - 1rem)', right: 20, bottom: 88, height: 480, maxHeight: 'calc(100vh - 130px)' }}
        >
          {/* En-tête */}
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-brand-600 px-4 py-3 dark:border-slate-700">
            <BotFace active />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                M-TAX AI <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              </p>
              <p className="text-[11px] text-white/80">En ligne · à votre service</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white" aria-label={t("a11y.close")}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={chatRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {msgs.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-700/50 dark:text-slate-300">
                Bonjour ! 👋 Je suis <strong>M-TAX AI</strong>, votre assistant intelligent.
                <br />
                Posez-moi des questions sur vos données fiscales (contribuables, créances, paiements, recouvrement…) et je répondrai avec les chiffres en direct.
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                    m.role === 'user'
                      ? 'rounded-br-sm bg-brand-600 text-white'
                      : 'rounded-bl-sm border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-700/50 dark:text-slate-200'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-700/50">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500" style={{ animationDelay: '0.15s' }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-500" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            )}
          </div>

          {/* Saisie */}
          <form onSubmit={(e) => { e.preventDefault(); send() }} className="flex shrink-0 items-center gap-2 border-t border-slate-100 px-3 py-2.5 dark:border-slate-700">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("ai.placeholder")}
              className="h-9 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!input.trim() || typing}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-indigo-500/20 transition hover:bg-brand-500 disabled:opacity-40"
              aria-label={t("ai.send")}
            >
              {typing ? <AlertCircle className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={resetPos}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
              title={t("ai.resetPosition")}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
