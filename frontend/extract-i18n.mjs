import ts from 'typescript'
import fs from 'fs'
import path from 'path'

const files = process.argv.slice(2)
const FRENCH = /[àâäçéèêëîïôöùûüÿœæÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸŒÆ]|\b(le|la|les|un|une|des|du|de|et|ou|en|au|aux|pour|par|sur|avec|sans|dans|est|sont|ce|cette|ces|qui|que|quoi|dont|où|plus|moins|tout|tous|toute|toutes|nouveau|nouvelle|aucun|aucune|ajouter|modifier|supprimer|enregistrer|annuler|fermer|ouvrir|rechercher|filtrer|exporter|importer|charger|chargement|détail|détails|statut|date|montant|référence|nom|type|description|actions|page|total|liste|créer|voir|envoyer|télécharger|imprimer|confirmer|sélectionner|sélectionnez|choisir|tous|toutes|actif|inactif|actifs|inactifs|en attente|en cours|en retard|payé|impayé|validé|rejeté|annulé|brouillon|soumis|clôturé|suspendu|erreur|succès|attention|information|requis|facultatif|optionnel|aucune|aucun|bienvenue|connexion|déconnexion|mot de passe|utilisateur|utilisateurs|rôle|rôles|permission|permissions|centre|fiscal|fiscale|impôt|impôts|déclaration|déclarations|créance|créances|paiement|paiements|quittance|quittances|recouvrement|contribuable|contribuables|contrôle|contrôles|réclamation|réclamations|remboursement|remboursements|paramètre|paramètres|notification|notifications|profil|sécurité|session|sessions|activité|activités|historique|journal|audit|rapport|rapports|règle|règles|échéance|échéances|calendrier|période|périodes|année|mois|jour|semaine|trimestre|montant|base|taux|net|brut|exonération|déduction|crédit|ajustement|origine|statut|référence|type|catégorie|catégories|valeur|valeurs|libellé|libellés|code|nom|prénom|adresse|téléphone|email|courriel|raison sociale|entreprise|particulier|individu|agent|administrateur|comptable|lecteur|super|admin|système|systèmes|global|général|générale|fiscalité|institution|taux|pénalité|pénalités|retard|relance|relances|mise en demeure|mises en demeure|plan|plans|échéancier|échéanciers|litige|litiges|suspension|clôture|réactivation|création|modification|suppression|activation|désactivation|validation|rejet|connexion|échec|marquage|paiement|notification|message|messages|envoyé|envoyée|reçu|reçue|destinataire|expéditeur|sujet|contenu|pièce jointe|pièces jointes|fichier|fichiers|document|documents|image|photo|avatar|langue|français|anglais|malagasy|accueil|tableau de bord|gestion|référentiels|administration|contribuables|déclarations|impositions|créances|recouvrement|paiements|quittances|contrôles fiscaux|réclamations|remboursements|messages|calendrier fiscal|règles fiscales|rapports|utilisateurs|demandes d'inscription|rôles|journal d'audit|paramètres|mon profil|notifications)\b/i

function lineOf(sf, pos) {
  return sf.getLineAndCharacterOfPosition(pos).line + 1
}

for (const file of files) {
  const abs = path.resolve(file)
  const text = fs.readFileSync(abs, 'utf8')
  const sf = ts.createSourceFile(abs, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const out = []
  function add(kind, node, value) {
    const v = value.replace(/\s+/g, ' ').trim()
    if (!v || v.length > 220) return
    if (!/[A-Za-zÀ-ÿ]/.test(v)) return
    if (/^[\w./:-]+$/.test(v) && !FRENCH.test(v)) return
    if (!FRENCH.test(v)) return
    if (/^(https?:|\/|\.\/|\.\.\/|@\/)/.test(v)) return
    if (/^[a-z0-9-_]+(\.[a-z0-9-_]+)+$/i.test(v)) return
    if (/^(GET|POST|PUT|PATCH|DELETE)$/.test(v)) return
    out.push({ kind, line: lineOf(sf, node.getStart(sf)), value: v })
  }
  function visit(node) {
    if (ts.isJsxText(node)) {
      add('jsxText', node, node.getText(sf))
    } else if (ts.isJsxAttribute(node) && node.initializer) {
      if (ts.isStringLiteral(node.initializer)) add('attr', node, node.initializer.text)
      else if (ts.isJsxExpression(node.initializer) && node.initializer.expression && ts.isStringLiteral(node.initializer.expression)) add('attrExpr', node, node.initializer.expression.text)
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      // skip import paths, jsx attributes handled above, object keys, directives
      const p = node.parent
      const skip = ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isJsxAttribute(p) || ts.isPropertyAssignment(p) && p.name === node || ts.isElementAccessExpression(p) || ts.isCaseClause(p)
      if (!skip) add(ts.isNoSubstitutionTemplateLiteral(node) ? 'template' : 'string', node, node.text)
    } else if (ts.isTemplateExpression(node)) {
      add('templateExpr', node, node.head.text)
      // add literal chunks in spans
      for (const span of node.templateSpans) {
        if (span.literal.text.trim()) add('templateSpan', span.literal, span.literal.text)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  const seen = new Set()
  const uniq = out.filter((o) => {
    const k = o.kind + '|' + o.value
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  console.log('\n=== ' + path.basename(file) + ' (' + uniq.length + ') ===')
  for (const o of uniq) console.log(`${String(o.line).padStart(4)} [${o.kind}] ${o.value}`)
}
