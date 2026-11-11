import { fr as baseFr } from './fr'
import { en as baseEn } from './en'
import { mg as baseMg } from './mg'
import * as assessments from './modules/gestion-assessments'
import * as debts from './modules/gestion-debts'
import * as administration from './modules/administration'
import * as referentiels from './modules/referentiels'
import * as taxpayer from './modules/taxpayer'
import * as reportsAdmin from './modules/reports-admin'
import * as declarations from './modules/declarations'
import * as collectionExtra from './modules/collection-extra'
import * as commonExtra from './modules/common-extra'
import * as complaints from './modules/gestion-complaints'
import * as controls from './modules/gestion-controls'

export const fr: Record<string, string> = {
  ...baseFr,
  ...assessments.fr,
  ...debts.fr,
  ...administration.fr,
  ...referentiels.fr,
  ...taxpayer.fr,
  ...reportsAdmin.fr,
  ...declarations.fr,
  ...collectionExtra.fr,
  ...commonExtra.fr,
  ...complaints.fr,
  ...controls.fr,
}

export const en: Record<string, string> = {
  ...baseEn,
  ...assessments.en,
  ...debts.en,
  ...administration.en,
  ...referentiels.en,
  ...taxpayer.en,
  ...reportsAdmin.en,
  ...declarations.en,
  ...collectionExtra.en,
  ...commonExtra.en,
  ...complaints.en,
  ...controls.en,
}

export const mg: Record<string, string> = {
  ...baseMg,
  ...assessments.mg,
  ...debts.mg,
  ...administration.mg,
  ...referentiels.mg,
  ...taxpayer.mg,
  ...reportsAdmin.mg,
  ...declarations.mg,
  ...collectionExtra.mg,
  ...commonExtra.mg,
  ...complaints.mg,
  ...controls.mg,
}
