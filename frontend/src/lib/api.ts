import axios, { AxiosError, type AxiosRequestConfig } from 'axios'

const TOKEN_KEY = 'mnk_tax_access_token'
const REFRESH_KEY = 'mnk_tax_refresh_token'

export const tokenStore = {
  get access(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },
  get refresh(): string | null {
    return localStorage.getItem(REFRESH_KEY)
  },
  set(access: string, refresh: string) {
    localStorage.setItem(TOKEN_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = tokenStore.access
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  try {
    const loc = localStorage.getItem('mnktax-locale')
    if (loc === 'fr' || loc === 'mg' || loc === 'en') {
      const map: Record<string, string> = { fr: 'fr-MG', mg: 'mg-MG', en: 'en-US' }
      config.headers['Accept-Language'] = map[loc]
    }
  } catch {}
  return config
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}> = []

function processQueue(error: unknown) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(undefined)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry && window.location.pathname !== '/login') {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => api(originalRequest))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = tokenStore.refresh
      if (!refreshToken) {
        tokenStore.clear()
        window.location.href = '/login'
        isRefreshing = false
        return Promise.reject(error)
      }

      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } },
        )
        const data = res.data as { accessToken: string; refreshToken: string }
        tokenStore.set(data.accessToken, data.refreshToken)
        processQueue(null)
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError)
        tokenStore.clear()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export function apiErrorCode(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { code?: string } | undefined
    if (data?.code) return data.code
  }
  return null
}

export function apiFieldErrors(error: unknown): Record<string, string> | null {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { fieldErrors?: Record<string, string> } | undefined
    return data?.fieldErrors ?? null
  }
  return null
}

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string; code?: string } | undefined
    if (data?.message) return data.message
    if (data?.error) return data.error
    return `Erreur HTTP ${error.response?.status ?? 'inconnue'}`
  }
  return error instanceof Error ? error.message : 'Erreur inconnue'
}

/** Use with t(): translate known error codes, fallback to raw message */
export function apiErrorMessageI18n(error: unknown, t: (k: string) => string): string {
  const code = apiErrorCode(error)
  if (code) {
    const key = `errors.${code}`
    const translated = t(key)
    if (translated !== key) return translated
  }
  return apiErrorMessage(error)
}

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.get<T>(url, config)
  return res.data
}

export async function apiGetBlob(url: string): Promise<Blob> {
  const res = await api.get<Blob>(url, { responseType: 'blob' })
  return res.data
}

export async function apiPost<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.post<T>(url, data, config)
  return res.data
}

export async function apiUpload<T>(url: string, file: File, fieldName = 'file', extraFields?: Record<string, string>): Promise<T> {
  const form = new FormData()
  form.append(fieldName, file)
  if (extraFields) {
    Object.entries(extraFields).forEach(([k, v]) => form.append(k, v))
  }
  const res = await api.post<T>(url, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function apiPatch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.patch<T>(url, data, config)
  return res.data
}

export async function apiPut<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await api.put<T>(url, data, config)
  return res.data
}

export async function apiDelete(url: string, config?: AxiosRequestConfig): Promise<void> {
  await api.delete(url, config)
}
