import { useEffect, useRef, useState, useCallback } from 'react'
import { Bot, Send, Sparkles, X, GripHorizontal, RotateCcw, Lightbulb, ChevronRight, Trash2 } from 'lucide-react'
import Markdown from 'react-markdown'
import { apiErrorMessage, apiPost } from '../lib/api'
import { useI18n } from '../lib/i18n'

type Position = { x: number; y: number }
type Msg = { role: 'user' | 'bot'; text: string }
type ChatInput = { role: string; content: string }

const STORAGE_POS = 'mnk_ai_pos'
const STORAGE_CHAT = 'mnk_ai_chat'
const MAX_STORED_MSGS = 50
const FACE = 48
const MARGIN = 20

/** Suggestions contextuelles qui changent selon la conversation */
const SUGGESTIONS_BY_CONTEXT: Record<string, string[]> = {
  _default: [
    'ai.suggest.summary',
    'ai.suggest.taxpayers',
    'ai.suggest.recovery',
    'ai.suggest.alerts',
  ],
  taxpayer: [
    'ai.suggest.declarations',
    'ai.suggest.payments',
    'ai.suggest.topTaxpayers',
    'ai.suggest.alerts',
  ],
  declaration: [
    'ai.suggest.taxpayers',
    'ai.suggest.debts',
    'ai.suggest.alerts',
    'ai.suggest.recommendations',
  ],
  debt: [
    'ai.suggest.overdue',
    'ai.suggest.collection',
    'ai.suggest.payments',
    'ai.suggest.recommendations',
  ],
  payment: [
    'ai.suggest.receipts',
    'ai.suggest.collection',
    'ai.suggest.taxpayers',
    'ai.suggest.summary',
  ],
  collection: [
    'ai.suggest.overdue',
    'ai.suggest.debts',
    'ai.suggest.recommendations',
    'ai.suggest.summary',
  ],
  alert: [
    'ai.suggest.recommendations',
    'ai.suggest.overdue',
    'ai.suggest.collection',
    'ai.suggest.summary',
  ],
}

/* ── Persistance localStorage ── */
function loadChatHistory(): Msg[] {
  try {
    const raw = localStorage.getItem(STORAGE_CHAT)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown[]
    return parsed.filter((m): m is Msg =>
      m != null && typeof m === 'object' && 'role' in m && 'text' in m
        && ((m as Msg).role === 'user' || (m as Msg).role === 'bot')
    )
  } catch { return [] }
}

function saveChatHistory(msgs: Msg[]) {
  try {
    const toStore = msgs.slice(-MAX_STORED_MSGS)
    localStorage.setItem(STORAGE_CHAT, JSON.stringify(toStore))
  } catch { /* quota exceeded or private browsing */ }
}

function clearChatHistory() {
  try { localStorage.removeItem(STORAGE_CHAT) } catch { /* ignore */ }
}

/* ── Détection de contexte depuis le dernier message bot ── */
function detectContext(lastBot: string): string {
  const lower = lastBot.toLowerCase()
  if (/contribuable|taxpayer|nif/i.test(lower)) return 'taxpayer'
  if (/déclar|declaration/i.test(lower)) return 'declaration'
  if (/créance|créanc|dette|overdue|retard/i.test(lower)) return 'debt'
  if (/paiement|payment|encaiss/i.test(lower)) return 'payment'
  if (/recouvrement|collection|taux/i.test(lower)) return 'collection'
  if (/alerte|alert|critique|urgent/i.test(lower)) return 'alert'
  return '_default'
}

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

/* ── Composants Markdown personnalisés pour le chat ── */
function ChatMarkdown({ content }: { content: string }) {
  return (
    <Markdown
      components={{
        h2: ({ children }) => <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-2 mb-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-2 mb-0.5">{children}</h3>,
        p: ({ children }) => <p className="text-sm leading-relaxed mb-1.5 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 text-sm">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 text-sm">{children}</ol>,
        li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-slate-900 dark:text-white">{children}</strong>,
        em: ({ children }) => <em className="italic text-slate-600 dark:text-slate-300">{children}</em>,
        hr: () => <hr className="my-2 border-slate-200 dark:border-slate-600" />,
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto">
            <table className="w-full text-xs border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-slate-100 dark:bg-slate-700">{children}</thead>,
        th: ({ children }) => <th className="px-2 py-1 text-left font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">{children}</th>,
        td: ({ children }) => <td className="px-2 py-1 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300">{children}</td>,
        code: ({ children, className }) => {
          const isInline = !className
          if (isInline) return <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs font-mono text-brand-700 dark:text-brand-300">{children}</code>
          return <code className="block p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-mono overflow-x-auto">{children}</code>
        },
      }}
    >
      {content}
    </Markdown>
  )
}

/* ── M-TAX AI ── */
export default function AiAssistant() {
  const { t } = useI18n()
  const [pos, setPos] = useState<Position>(defaultPos)
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>(loadChatHistory)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; orig: Position } | null>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const movedRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  /* ── Restituer position sauvegardée ── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_POS)
      if (saved) {
        const p = JSON.parse(saved) as Position
        setPos({ x: p.x, y: p.y })
      }
    } catch { /* ignore */ }
    const onResize = () => {
      setPos((p) => ({
        x: Math.max(0, Math.min(p.x, window.innerWidth - FACE)),
        y: Math.max(0, Math.min(p.y, window.innerHeight - FACE)),
      }))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  /* ── Auto-scroll du chat ── */
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, typing])

  /* ── Focus input à l'ouverture ── */
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  /* ── Persister les messages quand ils changent ── */
  useEffect(() => {
    saveChatHistory(msgs)
  }, [msgs])

  /* ── Outils de drag ── */
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
      try { localStorage.setItem(STORAGE_POS, JSON.stringify(pos)) } catch { /* ignore */ }
    }
  }

  function resetPos() {
    setPos(defaultPos())
    localStorage.removeItem(STORAGE_POS)
  }

  /* ── Vider la conversation ── */
  function clearChat() {
    setMsgs([])
    clearChatHistory()
  }

  /* ── Envoi du message à l'IA ── */
  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || typing) return
    setMsgs((m) => [...m, { role: 'user', text: msg }])
    setInput('')
    setTyping(true)
    const history: ChatInput[] = msgs.map((m) => ({ role: m.role, content: m.text }))
    try {
      const res = await apiPost<{ reply: string }>('/ai/chat', { message: msg, history }, { timeout: 45000 })
      setMsgs((m) => [...m, { role: 'bot', text: res.reply }])
    } catch (err) {
      setMsgs((m) => [...m, { role: 'bot', text: `⚠️ ${apiErrorMessage(err)}` }])
    } finally {
      setTyping(false)
    }
  }, [input, typing, msgs])

  /* ── Suggestions contextuelles ── */
  const lastBotMsg = [...msgs].reverse().find((m) => m.role === 'bot')
  const context = lastBotMsg ? detectContext(lastBotMsg.text) : '_default'
  const suggestionKeys = SUGGESTIONS_BY_CONTEXT[context] ?? SUGGESTIONS_BY_CONTEXT._default

  function handleSuggestion(key: string) {
    const text = t(key)
    if (text !== key) send(text)
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
        title={open ? t('ai.close') : t('ai.open')}
      >
        {!open && (
          <span className="flex h-8 items-center gap-0.5 rounded-full bg-slate-900/70 px-2 text-[10px] font-medium text-white backdrop-blur dark:bg-white/15">
            <GripHorizontal className="h-3.5 w-3.5" /> {t('common.drag')}
          </span>
        )}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => { if (movedRef.current) return; setOpen((o) => !o) }}
          className={`select-none rounded-2xl transition-transform active:scale-95 ${dragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
          aria-label={open ? t('ai.close') : t('ai.open')}
        >
          <BotFace active={open} />
        </button>
      </div>

      {/* ── Panneau de chat ── */}
      {open && (
        <div
          className="animate-panel fixed z-[60] flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/20 dark:border-slate-700/50 dark:bg-slate-800"
          style={{ width: 400, maxWidth: 'calc(100vw - 1rem)', right: 20, bottom: 88, height: 520, maxHeight: 'calc(100vh - 130px)' }}
        >
          {/* En-tête */}
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-brand-600 px-4 py-3 dark:border-slate-700">
            <BotFace active />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
                M-TAX AI <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              </p>
              <p className="text-[11px] text-white/80">{t('ai.status')}</p>
            </div>
            {msgs.length > 0 && (
              <button
                onClick={clearChat}
                className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/15 hover:text-white"
                title={t('ai.clearChat')}
                aria-label={t('ai.clearChat')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white" aria-label={t('a11y.close')}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={chatRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {msgs.length === 0 && (
              <div className="space-y-3">
                <div className="animate-chat-in rounded-xl bg-gradient-to-br from-brand-50 to-violet-50 p-4 text-sm text-slate-600 dark:from-brand-900/20 dark:to-violet-900/20 dark:text-slate-300">
                  <p className="font-medium text-slate-800 dark:text-slate-100 mb-1">👋 {t('ai.welcome')}</p>
                  <p className="text-xs leading-relaxed">{t('ai.welcomeHint')}</p>
                </div>
                {/* Suggestions initiales avec animation */}
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS_BY_CONTEXT._default.map((key, i) => (
                    <button
                      key={key}
                      onClick={() => handleSuggestion(key)}
                      className="animate-chip group flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-100 hover:border-brand-300 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-300 dark:hover:bg-brand-800/40"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <Lightbulb className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                      {t(key)}
                      <ChevronRight className="h-3 w-3 opacity-0 -ml-1 transition group-hover:opacity-100 group-hover:ml-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m, i) => {
              const isNew = i >= msgs.length - 1
              return (
                <div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} ${isNew ? (m.role === 'user' ? 'animate-chat-right' : 'animate-chat-in') : ''}`}
                >
                  {m.role === 'bot' && (
                    <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40">
                      <Bot className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      m.role === 'user'
                        ? 'rounded-br-sm bg-brand-600 text-white'
                        : 'rounded-bl-sm border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-700/50 dark:text-slate-200'
                    }`}
                  >
                    {m.role === 'bot' ? <ChatMarkdown content={m.text} /> : <span className="whitespace-pre-wrap">{m.text}</span>}
                  </div>
                </div>
              )
            })}

            {/* Suggestions après réponse du bot avec animation */}
            {!typing && msgs.length > 0 && msgs[msgs.length - 1].role === 'bot' && (
              <div className="flex flex-wrap gap-1.5 pl-8">
                {suggestionKeys.map((key, i) => {
                  const text = t(key)
                  if (text === key) return null
                  return (
                    <button
                      key={key}
                      onClick={() => handleSuggestion(key)}
                      className="animate-chip group flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:border-brand-300 hover:text-brand-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-brand-300"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      {text}
                      <ChevronRight className="h-2.5 w-2.5 opacity-0 -ml-0.5 transition group-hover:opacity-100 group-hover:ml-0" />
                    </button>
                  )
                })}
              </div>
            )}

            {typing && (
              <div className="animate-chat-in flex justify-start pl-8">
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
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('ai.placeholder')}
              className="h-9 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!input.trim() || typing}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-indigo-500/20 transition hover:bg-brand-500 disabled:opacity-40"
              aria-label={t('ai.send')}
            >
              <Send className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={resetPos}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
              title={t('ai.resetPosition')}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
