import ts from 'typescript'
import fs from 'fs'
import path from 'path'

// Usage: node i18n-transform.mjs <map.json>
// map.json: { "file": "src/pages/X.tsx", "prefix": "x", "strings": [{ "fr": "...", "key": "...", "en": "...", "mg": "..." }] }

const mapPath = process.argv[2]
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
const abs = path.resolve(map.file)
const source = fs.readFileSync(abs, 'utf8')
const sf = ts.createSourceFile(abs, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const entries = map.strings.filter((s) => s.fr && s.key)
const byFr = new Map(entries.map((s) => [s.fr, s.key]))
const edits = []
const components = new Set()
let replacements = 0
let skipped = []

const ALLOWED_ATTRS = new Set([
  'placeholder', 'title', 'subtitle', 'label', 'aria-label', 'alt', 'message',
  'confirmLabel', 'cancelLabel', 'emptyTitle', 'emptyMessage', 'description',
  'hint', 'tooltip', 'header', 'caption', 'text', 'empty', 'error', 'success',
])

function isComponentFunction(node) {
  if (!node || !ts.isFunctionLike(node)) return false
  if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) {
    return !!node.name && /^[A-Z]/.test(node.name.text)
  }
  if (ts.isArrowFunction(node)) {
    const p = node.parent
    if (ts.isVariableDeclaration(p) && ts.isIdentifier(p.name)) return /^[A-Z]/.test(p.name.text)
    if (ts.isExportAssignment(p)) return true
  }
  return false
}

function nearestComponent(node) {
  let cur = node.parent
  while (cur) {
    if (isComponentFunction(cur)) return cur
    cur = cur.parent
  }
  return null
}

function isInsideNonComponentFunction(node) {
  let cur = node.parent
  while (cur) {
    if (ts.isFunctionLike(cur)) {
      return !isComponentFunction(cur)
    }
    cur = cur.parent
  }
  return false
}

function isPropertyName(node) {
  const p = node.parent
  if (!p) return false
  if ((ts.isPropertyAssignment(p) || ts.isPropertyDeclaration(p) || ts.isMethodDeclaration(p) || ts.isPropertySignature(p)) && p.name === node) return true
  if (ts.isJsxAttribute(p) && p.name === node) return true
  return false
}

function jsxTextReplacement(node) {
  const raw = node.getText(sf)
  const text = raw.trim()
  if (!text) return null
  const key = byFr.get(text)
  if (!key) return null
  const lead = /^\s/.test(raw) ? "{' '}" : ''
  const trail = /\s$/.test(raw) ? "{' '}" : ''
  return { key, text: `${lead}{t('${key}')}${trail}` }
}

function attrAllows(name) {
  if (name.startsWith('data-')) return false
  return ALLOWED_ATTRS.has(name)
}

function visit(node) {
  // JSX text
  if (ts.isJsxText(node)) {
    if (nearestComponent(node)) {
      const rep = jsxTextReplacement(node)
      if (rep) {
        edits.push({ start: node.getStart(sf), end: node.getEnd(), text: rep.text })
        components.add(nearestComponent(node))
        replacements++
      }
    }
  }

  // JSX attribute with string literal
  if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
    const name = ts.isIdentifier(node.name) ? node.name.text : node.name.getText(sf)
    const value = node.initializer.text
    const key = byFr.get(value)
    if (key && attrAllows(name)) {
      edits.push({ start: node.initializer.getStart(sf), end: node.initializer.getEnd(), text: `{t('${key}')}` })
      const comp = nearestComponent(node)
      if (comp) components.add(comp)
      replacements++
    }
  }

  // String literals inside component expressions
  if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) {
    const p = node.parent
    const skip = ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isJsxAttribute(p) ||
      isPropertyName(node) || ts.isCaseClause(p) || ts.isElementAccessExpression(p) ||
      (ts.isCallExpression(p) && p.expression.kind === ts.SyntaxKind.ImportKeyword)
    if (!skip && nearestComponent(node)) {
      const key = byFr.get(node.text)
      if (key) {
        edits.push({ start: node.getStart(sf), end: node.getEnd(), text: `t('${key}')` })
        components.add(nearestComponent(node))
        replacements++
      }
    }
  }

  ts.forEachChild(node, visit)
}
visit(sf)

// Which components already have a `t` binding from useI18n?
function componentHasT(comp) {
  let found = false
  function walk(n) {
    if (found) return
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 't' && n.initializer && ts.isCallExpression(n.initializer) && n.initializer.expression.getText(sf) === 'useI18n') {
      found = true
      return
    }
    if (ts.isVariableDeclaration(n) && ts.isObjectBindingPattern(n.name) && n.initializer && ts.isCallExpression(n.initializer) && n.initializer.expression.getText(sf) === 'useI18n') {
      if (n.name.elements.some((e) => ts.isBindingElement(e) && e.name.getText(sf) === 't')) found = true
    }
    ts.forEachChild(n, walk)
  }
  walk(comp)
  return found
}

const hookEdits = []
for (const comp of components) {
  if (!comp.body || !ts.isBlock(comp.body)) {
    skipped.push('component without block body at line ' + (sf.getLineAndCharacterOfPosition(comp.getStart(sf)).line + 1))
    continue
  }
  if (componentHasT(comp)) continue
  hookEdits.push({ start: comp.body.getStart(sf) + 1, end: comp.body.getStart(sf) + 1, text: `\n  const { t } = useI18n()` })
}

// Add import if missing
const needsImport = components.size > 0 && !/from ['"](?:\.\.\/)*lib\/i18n['"]/.test(source)
let importEdit = null
if (needsImport) {
  const imports = sf.statements.filter((s) => ts.isImportDeclaration(s))
  const last = imports.length ? imports[imports.length - 1] : null
  const pos = last ? last.getEnd() : 0
  importEdit = { start: pos, end: pos, text: `\nimport { useI18n } from '../lib/i18n'` }
}

if (!edits.length) {
  console.log('No replacements for ' + map.file)
  process.exit(0)
}

const allEdits = [...edits, ...hookEdits]
if (importEdit) allEdits.push(importEdit)
allEdits.sort((a, b) => b.start - a.start || b.end - a.end)
let result = source
for (const e of allEdits) {
  result = result.slice(0, e.start) + e.text + result.slice(e.end)
}
fs.writeFileSync(abs, result, 'utf8')
console.log(`Updated ${map.file}: ${replacements} replacements, ${components.size} components, ${hookEdits.length} hooks, import=${needsImport}`)
if (skipped.length) console.log('Skipped:\n' + skipped.join('\n'))
