import ts from 'typescript'
import fs from 'fs'
import path from 'path'

const root = process.cwd()
function loadTs(file) {
  const src = fs.readFileSync(file, 'utf8')
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const module = { exports: {} }
  new Function('exports', 'module', 'require', js)(module.exports, module, (id) => { throw new Error('require ' + id) })
  return module.exports
}
const base = {
  fr: loadTs(path.join(root, 'src/locales/fr.ts')).fr,
  en: loadTs(path.join(root, 'src/locales/en.ts')).en,
  mg: loadTs(path.join(root, 'src/locales/mg.ts')).mg,
}
const fragments = fs.readdirSync(path.join(root, 'src/locales/modules')).filter((f) => f.endsWith('.ts'))
const merged = { fr: { ...base.fr }, en: { ...base.en }, mg: { ...base.mg } }
for (const f of fragments) {
  const mod = loadTs(path.join(root, 'src/locales/modules', f))
  for (const loc of ['fr', 'en', 'mg']) Object.assign(merged[loc], mod[loc] ?? {})
}

// gather used keys
const used = new Map()
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'locales') continue
      walk(p)
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      const text = fs.readFileSync(p, 'utf8')
      const re = /\bt\(\s*['"]([^'"]+)['"]/g
      let m
      while ((m = re.exec(text))) {
        if (!used.has(m[1])) used.set(m[1], [])
        used.get(m[1]).push(path.relative(root, p))
      }
    }
  }
}
walk(path.join(root, 'src'))

let missing = 0
for (const [key, files] of [...used.entries()].sort()) {
  const miss = ['fr', 'en', 'mg'].filter((l) => merged[l][key] === undefined)
  if (miss.length) {
    missing++
    console.log(`MISSING ${key} [${miss.join(',')}] used in ${[...new Set(files)].slice(0, 3).join(', ')}`)
  }
}
console.log(`\nUsed keys: ${used.size}; missing: ${missing}`)

// fragment parity
for (const f of fragments) {
  const mod = loadTs(path.join(root, 'src/locales/modules', f))
  const sets = ['fr', 'en', 'mg'].map((l) => new Set(Object.keys(mod[l] ?? {})))
  const union = new Set([...sets[0], ...sets[1], ...sets[2]])
  for (const key of union) {
    if (!sets[0].has(key) || !sets[1].has(key) || !sets[2].has(key)) {
      console.log(`FRAGMENT PARITY ${f}: ${key} fr=${sets[0].has(key)} en=${sets[1].has(key)} mg=${sets[2].has(key)}`)
    }
  }
}
