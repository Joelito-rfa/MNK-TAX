import { describe, it, expect } from 'vitest'
// @ts-expect-error node types resolved via @types/node in vitest context
import { readFileSync } from 'node:fs'
// @ts-expect-error node types resolved via @types/node in vitest context
import { resolve } from 'node:path'
import { fr } from '../fr'
import { mg } from '../mg'
import { en } from '../en'

/**
 * Garde-fou i18n : dès qu'une clé est ajoutée dans une locale, elle doit
 * exister dans les trois. Un oubli casse silencieusement l'affichage
 * (la clé brute est alors affichée à l'écran).
 */

const locales = { fr, mg, en } as const
type LocaleName = keyof typeof locales

const keysOf = (name: LocaleName) => Object.keys(locales[name])
const ref = keysOf('fr')

describe('parité des clés i18n', () => {
  it.each(Object.keys(locales) as LocaleName[])(
    '%s contient exactement les mêmes clés que fr',
    (name) => {
      const keys = keysOf(name)
      const missing = ref.filter((k) => !(k in locales[name]))
      const extra = keys.filter((k) => !ref.includes(k))

      expect(missing, `clés manquantes dans ${name}`).toEqual([])
      expect(extra, `clés en trop dans ${name}`).toEqual([])
      expect(keys.length).toBe(ref.length)
    },
  )

  it.each(Object.keys(locales) as LocaleName[])('%s ne contient aucune valeur vide', (name) => {
    const empty = Object.entries(locales[name])
      .filter(([, v]) => typeof v !== 'string' || v.trim() === '')
      .map(([k]) => k)

    expect(empty, `valeurs vides dans ${name}`).toEqual([])
  })

  /**
   * `{plural}` est un marqueur de pluralisation : son nombre d'occurrences
   * varie légitimement selon la langue (le malgache n'a pas de pluriel
   * grammatical, l'anglais n'accorde pas l'adjectif). On le traite donc
   * comme optionnel, mais toute autre divergence est un bug : soit un
   * placeholder oublié (message incomplet), soit une coquille qui s'affichera
   * telle quelle à l'écran.
   */
  const OPTIONAL_PLACEHOLDERS = new Set(['plural'])

  const placeholders = (v: string) => new Set([...v.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))

  it.each(Object.keys(locales) as LocaleName[])(
    '%s ne renvoie aucun placeholder inconnu de fr',
    (name) => {
      const orphans = ref.filter((k) => {
        const allowed = placeholders(fr[k])
        return [...placeholders(locales[name][k])].filter((p) => !allowed.has(p)).length > 0
      })

      expect(orphans, `placeholders orphelins (inexistants dans fr) dans ${name}`).toEqual([])
    },
  )

  it.each(Object.keys(locales) as LocaleName[])(
    '%s ne perd aucun placeholder obligatoire de fr',
    (name) => {
      const missing = ref.filter((k) => {
        const expected = [...placeholders(fr[k])].filter((p) => !OPTIONAL_PLACEHOLDERS.has(p))
        const actual = placeholders(locales[name][k])
        return expected.some((p) => !actual.has(p))
      })

      expect(missing, `placeholders obligatoires manquants dans ${name}`).toEqual([])
    },
  )
})

describe('qualité des sources i18n', () => {
  // Vitest tourne avec cwd = racine du projet frontend.
  const sourceOf = (file: 'fr' | 'mg' | 'en') =>
    readFileSync(resolve((globalThis as unknown as { process: { cwd(): string } }).process.cwd(), 'src/locales', `${file}.ts`), 'utf8')

  it.each(['fr', 'mg', 'en'] as const)('%s.ts ne redéfinit aucune clé en double', (file) => {
    const source = sourceOf(file)
    const found = [...source.matchAll(/^\s*'([\w.\-]+)'\s*:/gm)].map((m) => m[1])
    const seen = new Set<string>()
    const duplicates = found.filter((k) => (seen.has(k) ? true : (seen.add(k), false)))

    // Un doublon est invisible à l'exécution (le dernier l'emporte) : seule
    // l'analyse du source permet de le détecter.
    expect(duplicates, `clés en double dans ${file}.ts`).toEqual([])
  })

  it.each(['fr', 'mg', 'en'] as const)('%s.ts est correctement indenté (une clé par ligne)', (file) => {
    const source = sourceOf(file)
    const rows = source.split('\n').filter((line: string) => /^\s*'[\w.\-]+'/.test(line))

    // Une ligne portant plusieurs déclarations trahit une édition ratée.
    const overloaded = rows
      .map((line: string, i: number) => ({ line, n: i + 1 }))
      .filter(({ line }: { line: string }) => (line.match(/'\s*:/g) || []).length > 1)
      .map(({ line, n }: { line: string; n: number }) => `${n}: ${line.trim().slice(0, 80)}`)

    expect(overloaded, `plusieurs clés sur une même ligne dans ${file}.ts`).toEqual([])
  })
})
