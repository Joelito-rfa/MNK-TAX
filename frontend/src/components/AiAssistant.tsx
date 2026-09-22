import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence, MotionConfig, useAnimation, type PanInfo } from 'motion/react'
import { Bot, Send, Sparkles, X, Lightbulb, ChevronRight, Trash2 } from 'lucide-react'
import Markdown from 'react-markdown'
import { apiErrorMessage, apiPost } from '../lib/api'
import { useI18n } from '../lib/i18n'

type Msg = { role: 'user' | 'bot'; text: string }
type ChatInput = { role: string; content: string }

const STORAGE_CHAT = 'mnk_ai_chat'
const STORAGE_POS = 'mnk_ai_pos'
const MAX_STORED_MSGS = 50

/* ── Position persistée du bouton AI ── */
const DEFAULT_BOT_POS = { x: 0, y: 0 }  // l'ancrage est déjà bottom-5 right-5 (marge 20px)

/**
 * Le bouton est ancré en bas à droite (bottom-5 right-5) : x/y sont des DÉCALAGES
 * négatifs (vers la gauche / le haut). On borne la valeur pour garantir qu'il reste
 * visible à l'écran, quelle que soit la valeur stockée ou la taille de fenêtre.
 */
function clampBotPosition(p: { x: number; y: number }): { x: number; y: number } {
  const x = Number.isFinite(p.x) ? p.x : 0
  const y = Number.isFinite(p.y) ? p.y : 0
  return {
    x: Math.max(-window.innerWidth + 88, Math.min(0, x)),
    y: Math.max(-window.innerHeight + 88, Math.min(0, y)),
  }
}

function loadBotPosition(): { x: number; y: number } {
  try {
    const raw = localStorage.getItem(STORAGE_POS)
    if (raw) {
      const p = JSON.parse(raw)
      if (p && typeof p.x === 'number' && typeof p.y === 'number') {
        // L'ancienne version stockait des coordonnées ABSOLUES ({x:1852,y:1012}
        // sur 1920×1080) alors qu'on attend ici un décalage depuis le coin
        // bas-droite : sans clamp, le bouton était poussé hors écran
        // (« L'IA ne s'affiche plus »).
        return clampBotPosition(p)
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_BOT_POS
}

function saveBotPosition(pos: { x: number; y: number }) {
  try { localStorage.setItem(STORAGE_POS, JSON.stringify(pos)) } catch { /* ignore */ }
}

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

  /* ── Robot rigolo avec deux mains (ressorts motion) ── */
  function BotFace({ active, typing, celebrate, dragSpin = 0 }: { active: boolean; typing: boolean; celebrate: number; dragSpin?: number }) {
    const jump = useAnimation()
    const waveArm = useAnimation()

    /* Saut de joie à chaque nouvelle réponse du bot */
    useEffect(() => {
      if (celebrate > 0) {
        jump.start({ y: [0, -10, 0], rotate: [0, -4, 0], transition: { duration: 0.55, ease: 'easeOut' } })
      }
    }, [celebrate, jump])

    /* La main droite salue à l'ouverture */
    useEffect(() => {
      if (active) {
        waveArm.start({ rotate: [0, -38, 22, -28, 12, 0], transition: { duration: 1.1, ease: 'easeInOut' } })
      } else {
        waveArm.set({ rotate: 0 })
      }
    }, [active, waveArm])

    const handBounce = (delay: number) =>
      typing
        ? { y: [0, -5, 0], transition: { repeat: Infinity, duration: 0.5, delay, ease: 'easeInOut' as const } }
        : { y: 0, transition: { duration: 0.2 } }

    return (
      <div className="ai-bot-3d-wrap">
        <motion.div animate={jump} className="relative">
          <motion.div
            animate={{ y: [0, -5, 0], rotate: dragSpin ? [0, dragSpin] : [0, -1.2, 1.2, 0] }}
            transition={{ repeat: dragSpin ? 0 : Infinity, duration: dragSpin ? 0.6 : 4, ease: dragSpin ? 'easeInOut' : 'easeInOut' }}
            className="relative flex justify-center"
            style={{ width: 68, height: 60 }}
          >
            {/* Antenne */}
            <div className="absolute left-1/2 top-0 flex -translate-x-1/2 flex-col items-center">
              <motion.span
                animate={{ scale: [1, 1.4, 1], opacity: [0.95, 0.55, 0.95] }}
                transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                className={`h-2 w-2 rounded-full shadow ${typing ? 'bg-amber-300 shadow-amber-300/80' : 'bg-violet-300 shadow-violet-300/80'}`}
              />
              <span className="h-2 w-0.5 rounded bg-white/60" />
            </div>
            {/* Bras gauche + main */}
            <motion.div animate={handBounce(0)} className="absolute left-0.5 top-7 origin-top">
              <div className="mx-auto h-5 w-1.5 rounded-full bg-gradient-to-b from-indigo-400 to-indigo-500" />
              <div className="h-3.5 w-3.5 rounded-full bg-white shadow-md ring-1 ring-indigo-200" />
            </motion.div>
            {/* Bras droit + main (salut imbriqué dans le rebond) */}
            <motion.div animate={handBounce(0.12)} className="absolute right-0.5 top-7 origin-top">
              <motion.div animate={waveArm} className="origin-top">
                <div className="mx-auto h-5 w-1.5 rounded-full bg-gradient-to-b from-indigo-400 to-indigo-500" />
                <div className="h-3.5 w-3.5 rounded-full bg-white shadow-md ring-1 ring-indigo-200" />
              </motion.div>
            </motion.div>
            {/* Tête */}
            <div className="relative mt-2.5 flex h-11 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 via-violet-600 to-indigo-700 shadow-lg shadow-indigo-500/40 ring-2 ring-white/25">
              <span className="absolute -left-1.5 top-1/2 h-4 w-1.5 -translate-y-1/2 rounded-full bg-indigo-400" />
              <span className="absolute -right-1.5 top-1/2 h-4 w-1.5 -translate-y-1/2 rounded-full bg-indigo-400" />
              <div className="flex items-start gap-2">
                {(['gauche', 'droite'] as const).map((cote) => (
                  <motion.span
                    key={cote}
                    animate={{ scaleY: [1, 1, 0.08, 1, 1] }}
                    transition={{ repeat: Infinity, duration: 4.6, times: [0, 0.9, 0.93, 0.96, 1], ease: 'easeInOut' }}
                    className="flex h-4 w-2.5 items-start justify-center rounded-full bg-white pt-1"
                  >
                    <motion.span
                      animate={typing ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                      transition={typing ? { repeat: Infinity, duration: 0.5 } : { duration: 0.2 }}
                      className="h-1.5 w-1.5 rounded-full bg-slate-900"
                    />
                  </motion.span>
                ))}
              </div>
              <span className="absolute bottom-1.5 left-1/2 h-2 w-4 -translate-x-1/2 rounded-b-full border-b-2 border-white/90" />
              {/* Halo respirant */}
              <motion.span
                animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.12, 0.35] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                className="absolute inset-0 -z-10 rounded-2xl bg-violet-500/50"
              />
              {/* Pastille de statut */}
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className={`absolute inline-flex h-full w-full rounded-full ${active ? 'animate-ping bg-emerald-400' : 'bg-emerald-400 opacity-75'}`} />
                <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
              </span>
            </div>
          </motion.div>
          <div className="ai-bot-3d-glow" />
        </motion.div>
      </div>
    )
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
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>(loadChatHistory)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  /* ── Drag mode: double-click pour activer/désactiver ── */
  const [dragMode, setDragMode] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [botPos, setBotPos] = useState(loadBotPosition)
  const [wobble, setWobble] = useState(false)

  /* On retarde le clic simple pour le distinguer d'un double-clic :
     sans ce délai, un double-clic déclencherait aussi l'ouverture/la fermeture
     du panneau au moment où l'on veut juste activer le mode déplacement. */
  const clickTimer = useRef<number | null>(null)
  const suppressClick = useRef(false)

  const clearPendingClick = useCallback(() => {
    if (clickTimer.current != null) {
      window.clearTimeout(clickTimer.current)
      clickTimer.current = null
    }
  }, [])

  /* Simple clic (sans second clic dans la foulée) → ouvrir/fermer la discussion.
     En mode déplacement, le clic simple ne fait rien : il sert à saisir le bouton. */
  const handleClick = useCallback(() => {
    if (suppressClick.current || clickTimer.current != null) return
    clickTimer.current = window.setTimeout(() => {
      clickTimer.current = null
      if (!dragMode) setOpen((o) => !o)
    }, 250)
  }, [dragMode])

  /* Double-clic → toggler le mode déplacement (sans ouvrir/fermer le chat) */
  const handleDoubleClick = useCallback(() => {
    clearPendingClick()
    setDragMode((d) => !d)
    setWobble(true)
    setTimeout(() => setWobble(false), 600)
  }, [clearPendingClick])

  /* Nettoyage du timer au démontage */
  useEffect(() => () => clearPendingClick(), [clearPendingClick])

  /* Quand on relâche après un drag */
  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    setDragging(false)
    /* Un relâchement de drag ne doit jamais être interprété comme un clic */
    suppressClick.current = true
    setTimeout(() => { suppressClick.current = false }, 0)
    setBotPos((prev) => {
      const newPos = clampBotPosition({ x: prev.x + info.offset.x, y: prev.y + info.offset.y })
      saveBotPosition(newPos)
      return newPos
    })
  }, [])

  /* ── Re-clamp au montage + au resize (l'ancienne version le faisait) ── */
  useEffect(() => {
    const reClamp = () => setBotPos((p) => {
      const next = clampBotPosition(p)
      if (next.x === p.x && next.y === p.y) return p
      // Migre aussi d'éventuelles valeurs héritées de l'ancien format
      saveBotPosition(next)
      return next
    })
    reClamp()
    window.addEventListener('resize', reClamp)
    return () => window.removeEventListener('resize', reClamp)
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

  /* ── Saut de joie à chaque nouvelle réponse du bot ── */
  const botCount = msgs.filter((m) => m.role === 'bot').length
  const prevBotCount = useRef(botCount)
  const [celebrate, setCelebrate] = useState(0)
  useEffect(() => {
    if (botCount > prevBotCount.current) setCelebrate((c) => c + 1)
    prevBotCount.current = botCount
  }, [botCount])

  /* ── Suggestions contextuelles ── */
  const lastBotMsg = [...msgs].reverse().find((m) => m.role === 'bot')
  const context = lastBotMsg ? detectContext(lastBotMsg.text) : '_default'
  const suggestionKeys = SUGGESTIONS_BY_CONTEXT[context] ?? SUGGESTIONS_BY_CONTEXT._default

  function handleSuggestion(key: string) {
    const text = t(key)
    if (text !== key) send(text)
  }

  return (
    <MotionConfig reducedMotion="user">
      {/* ── Bouton flottant (clic = ouvrir, double-clic = mode déplacement) ── */}
      <motion.div
        drag={dragMode}
        dragMomentum={false}
        dragElastic={0.1}
        onDragStart={() => setDragging(true)}
        onDragEnd={handleDragEnd}
        animate={{
          x: botPos.x,
          y: botPos.y,
          rotate: dragging ? [0, -8, 8, -6, 6, -3, 3, 0] : 0,
        }}
        transition={dragging ? { rotate: { repeat: Infinity, duration: 0.4 } } : { type: 'spring', stiffness: 300, damping: 25 }}
        className="fixed bottom-5 right-5 z-[60]"
        style={{ cursor: dragMode ? (dragging ? 'grabbing' : 'grab') : undefined }}
        title={
          dragMode
            ? (dragging ? t('ai.dragFlying') : t('ai.dragHint'))
            : `${open ? t('ai.close') : t('ai.open')} · ${t('ai.dragMode')}`
        }
      >
        <motion.button
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          whileHover={dragMode ? { scale: 1.15 } : { scale: 1.07 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          className={`cursor-pointer select-none rounded-2xl ${wobble ? 'animate-wobble' : ''}`}
          aria-label={open ? t('ai.close') : t('ai.open')}
        >
          {dragMode && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold text-amber-500 [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]"
          >
            {dragging ? t('ai.dragFlying') : t('ai.dragHint')}
            </motion.div>
          )}
          <BotFace active={open} typing={typing} celebrate={celebrate} dragSpin={dragging ? 360 : 0} />
        </motion.button>
      </motion.div>

      {/* ── Panneau de chat ── */}
      <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="ai-panel-3d fixed z-[60] flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/20 dark:border-slate-700/50 dark:bg-slate-800"
          style={{ width: 400, maxWidth: 'calc(100vw - 1rem)', right: 20, bottom: 88, height: 520, maxHeight: 'calc(100vh - 130px)' }}
        >
          <div className="ai-panel-3d-shadow" />
          {/* Corps connecteur 3D entre la tête et le panneau */}
          <div className="ai-connector" style={{ top: -18, left: '50%', marginLeft: '-3px' }} />
          {/* En-tête */}
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-brand-600 px-4 py-3 dark:border-slate-700">
            <BotFace active typing={typing} celebrate={celebrate} />
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
              return (
                <motion.div
                  key={i}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
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
                </motion.div>
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
          </form>
        </motion.div>
      )}
      </AnimatePresence>
    </MotionConfig>
  )
}
