import { useEffect, useState } from 'react'

const gradients = [
  'from-brand-500 to-brand-700',
  'from-sky-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-violet-500 to-purple-600',
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({
  name,
  size = 'sm',
  className = '',
  src,
}: {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  src?: string | null
}) {
  const [error, setError] = useState(false)
  useEffect(() => setError(false), [src])

  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  }

  if (src && !error) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        onError={() => setError(true)}
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 object-cover ${sizes[size]} ${className}`}
      />
    )
  }

  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  const gradient = gradients[Math.abs(hash) % gradients.length]

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shadow-sm ${gradient} ${sizes[size]} ${className}`}
    >
      {initials(name)}
    </span>
  )
}
