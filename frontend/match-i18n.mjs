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
const loc = {}
for (const l of ['fr', 'en', 'mg']) loc[l] = loadTs(path.join(root, `src/locales/${l}.ts`))[l]
for (const f of fs.readdirSync(path.join(root, 'src/locales/modules')).filter((f) => f.endsWith('.ts'))) {
  const mod = loadTs(path.join(root, 'src/locales/modules', f))
  for (const l of ['fr', 'en', 'mg']) Object.assign(loc[l], mod[l] ?? {})
}
// reverse index: fr value -> keys
const idx = new Map()
for (const [k, v] of Object.entries(loc.fr)) {
  if (!idx.has(v)) idx.set(v, [])
  idx.get(v).push(k)
}

const files = process.argv.slice(2)
for (const file of files) {
  const abs = path.resolve(file)
  const text = fs.readFileSync(abs, 'utf8')
  const sf = ts.createSourceFile(abs, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const seen = new Set()
  const found = []
  const missing = []
  function add(node, value) {
    const v = value.replace(/\s+/g, ' ').trim()
    if (!v || v.length > 220 || seen.has(v)) return
    if (!/[A-Za-zÀ-ÿ]/.test(v)) return
    seen.add(v)
    const keys = idx.get(v) ?? []
    if (keys.length === 1) found.push({ v, key: keys[0], line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 })
    else if (keys.length > 1) found.push({ v, key: keys.join('|'), line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 })
    else missing.push({ v, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1 })
  }
  function visit(node) {
    if (ts.isJsxText(node)) add(node, node.getText(sf))
    else if (ts.isJsxAttribute(node) && node.initializer) {
      if (ts.isStringLiteral(node.initializer)) add(node, node.initializer.text)
      else if (ts.isJsxExpression(node.initializer) && node.initializer.expression && ts.isStringLiteral(node.initializer.expression)) add(node, node.initializer.expression.text)
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const p = node.parent
      const skip = ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isJsxAttribute(p) ||
        (ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p)) && p.name === node ||
        ts.isElementAccessExpression(p) || ts.isCaseClause(p)
      if (!skip) add(node, node.text)
    } else if (ts.isTemplateExpression(node)) {
      add(node, node.head.text)
      for (const span of node.templateSpans) if (span.literal.text.trim()) add(span.literal, span.literal.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  console.log(`\n=== ${path.basename(file)} matched ${found.length} / ${found.length + missing.length} ===`)
  for (const f of found) console.log(`  ${f.line} [${f.key}] ${f.v}`)
  console.log(`--- unmatched ${missing.length} ---`)
  for (const m of missing) console.log(`  ${m.line} ${m.v}`)
}
