export const MODULE_COLORS = {
  contribuables:  { hex: '#5B4BDB', tw: 'violet',  label: 'Contribuables' },
  recettes:       { hex: '#22C55E', tw: 'green',   label: 'Recettes' },
  declarations:   { hex: '#0EA5E9', tw: 'sky',     label: 'Déclarations' },
  creances:       { hex: '#F59E0B', tw: 'orange',  label: 'Créances' },
  recouvrement:   { hex: '#3B82F6', tw: 'blue',    label: 'Recouvrement' },
  paiements:      { hex: '#10B981', tw: 'emerald', label: 'Paiements' },
  quittances:     { hex: '#F43F5E', tw: 'rose',    label: 'Quittances' },
  controles:      { hex: '#6366F1', tw: 'indigo',  label: 'Contrôles' },
  remboursements: { hex: '#14B8A6', tw: 'teal',    label: 'Remboursements' },
  regles:         { hex: '#EC4899', tw: 'pink',     label: 'Règles fiscales' },
} as const

export type ModuleKey = keyof typeof MODULE_COLORS
