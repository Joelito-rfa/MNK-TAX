import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGetBlob } from '../lib/api'
import { Avatar } from './Avatar'

/**
 * Avatar d'un utilisateur quelconque : charge l'image via l'API (authentifiée)
 * et retombe sur les initiales si l'utilisateur n'a pas d'avatar ou si la
 * requête échoue (404, 403…).
 */
export function UserAvatar({
  userId,
  name,
  hasAvatar,
  size = 'sm',
  className = '',
}: {
  userId: number | null | undefined
  name: string
  hasAvatar?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const enabled = userId != null && hasAvatar !== false
  const { data: blob } = useQuery({
    queryKey: ['user-avatar', userId],
    queryFn: () => apiGetBlob(`/users/${userId}/avatar`),
    enabled,
    retry: false,
    staleTime: 60_000,
  })

  const src = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])
  useEffect(() => {
    return () => {
      if (src) URL.revokeObjectURL(src)
    }
  }, [src])

  return <Avatar name={name} size={size} src={src} className={className} />
}
