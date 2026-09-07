import { useEffect, useRef, type ReactNode } from 'react'

type Animation = 'fade-up' | 'fade-in' | 'scale-in' | 'slide-left' | 'slide-right' | 'blur-in' | 'blur-up'

export default function ScrollReveal({
  children,
  animation = 'fade-up',
  delay = 0,
  className = '',
  once = true,
}: {
  children: ReactNode
  animation?: Animation
  delay?: number
  className?: string
  once?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.animationDelay = `${delay}ms`
          el.classList.add(`reveal-${animation}`)
          if (once) observer.unobserve(el)
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [animation, delay, once])

  return (
    <div ref={ref} className={`reveal-base ${className}`}>
      {children}
    </div>
  )
}
