// StoreCare AI — Health Score engine
// Weights: SEO 40 · Content 30 · Images 20 · Extras 10

export const ISSUE_TYPES = {
  MISSING_DESCRIPTION: { weight: 30, label: 'Missing description', fixable: true },
  THIN_DESCRIPTION: { weight: 15, label: 'Thin description', fixable: true },
  MISSING_SEO_TITLE: { weight: 20, label: 'Missing SEO title', fixable: true },
  MISSING_SEO_DESCRIPTION: { weight: 20, label: 'Missing SEO description', fixable: true },
  MISSING_ALT_TEXT: { weight: 20, label: 'Missing image alt text', fixable: true },
}

// issues: [{ type, productId, productTitle, detail }]
export function computeScore(issues) {
  const weights = { MISSING_DESCRIPTION: 30, THIN_DESCRIPTION: 15, MISSING_SEO_TITLE: 20, MISSING_SEO_DESCRIPTION: 20, MISSING_ALT_TEXT: 20 }
  let lost = 0
  for (const i of issues) lost += weights[i.type] || 10
  const score = Math.max(0, Math.min(100, Math.round(100 - lost)))
  return Math.max(0, score)
}

export function scoreGrade(score) {
  if (score >= 90) return { grade: 'A', color: '#2e9e5b', message: 'Excellent — your store is in great shape!' }
  if (score >= 70) return { grade: 'B', color: '#7ab648', message: 'Good — a few fixes will push you higher.' }
  if (score >= 50) return { grade: 'C', color: '#e8a13c', message: 'Needs work — AI can fix most of this today.' }
  return { grade: 'D', color: '#ec295c', message: 'Poor — your sales are leaking. Fix issues now.' }
}
