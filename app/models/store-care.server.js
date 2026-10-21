// StoreCare AI — server helpers: scan persistence, fixes, applying to Shopify
import db from '../db.server'
import { scanCatalog } from '../scanners/catalog-scan.js'
import { computeScore } from './health-score.js'
import { generateFix } from '../ai/fixer.js'

export const BRAND_VOICE_DEFAULT = {
  tone: 'warm, confident and feminine',
  audience: 'women in Pakistan looking for premium imported lingerie',
  brand: 'Lenceria',
}

export async function runScan(admin, shop) {
  const { scanned, issues } = await scanCatalog(admin, shop)
  const score = computeScore(issues)

  const scan = await db.scan.create({
    data: { shop, score, issues: issues.length },
  })

  for (const i of issues) {
    await db.issue.create({
      data: {
        shop,
        scanId: scan.id,
        type: i.type,
        productId: i.productId,
        productTitle: i.productTitle,
        detail: i.detail,
        fixable: i.fixable,
      },
    })
  }

  // keep only the latest 10 scans per shop
  const old = await db.scan.findMany({
    where: { shop },
    orderBy: { createdAt: 'desc' },
    skip: 10,
  })
  for (const o of old) {
    await db.issue.deleteMany({ where: { scanId: o.id } })
    await db.scan.delete({ where: { id: o.id } })
  }

  return { scan, issues, scanned }
}

export async function getLatestScan(shop) {
  return db.scan.findFirst({
    where: { shop },
    orderBy: { createdAt: 'desc' },
    include: { issuesList: { where: { status: 'open' } } },
  })
}

export async function getOpenIssues(shop) {
  return db.issue.findMany({
    where: { shop, status: 'open' },
    orderBy: { createdAt: 'asc' },
  })
}

export async function getIssue(id) {
  return db.issue.findUnique({ where: { id } })
}

// Apply a fix to Shopify and mark the issue done
export async function applyFixToShopify(admin, issue, brandVoice) {
  const productId = issue.productId
  const q = `
    query Product($id: ID!) {
      product(id: $id) {
        id
        title
        handle
        descriptionHtml
        seo { title description }
        featuredMedia { id }
      }
    }`
  const response = await admin.graphql(q, { variables: { id: productId } })
  const data = await response.json()
  const product = data.data.product
  if (!product) throw new Error('product not found')

  const productData = { title: product.title }
  let fix

  if (issue.type === 'MISSING_DESCRIPTION') {
    fix = await generateFix(issue, productData, brandVoice)
    const m = `mutation($id: ID!, $desc: String!) {
      productUpdate(input: { id: $id, descriptionHtml: $desc }) { product { id } userErrors { message } }
    }`
    const r = await admin.graphql(m, { variables: { id: productId, desc: fix } })
    const rd = await r.json()
    if (rd.data.productUpdate.userErrors?.length) throw new Error(rd.data.productUpdate.userErrors[0].message)
  } else if (issue.type === 'MISSING_SEO_TITLE' || issue.type === 'MISSING_SEO_DESCRIPTION') {
    fix = await generateFix(issue, productData, brandVoice)
    const seoInput = {}
    if (issue.type === 'MISSING_SEO_TITLE') seoInput.title = fix
    else seoInput.description = fix
    const m = `mutation($id: ID!, $seo: SEO!) {
      productUpdate(input: { id: $id, seo: $seo }) { product { id } userErrors { message } }
    }`
    const r = await admin.graphql(m, { variables: { id: productId, seo: seoInput } })
    const rd = await r.json()
    if (rd.data.productUpdate.userErrors?.length) throw new Error(rd.data.productUpdate.userErrors[0].message)
  } else if (issue.type === 'MISSING_ALT_TEXT') {
    fix = await generateFix(issue, productData, brandVoice)
    const mediaId = product.featuredMedia?.id
    if (!mediaId) throw new Error('no media')
    const m = `mutation($id: ID!, $mediaId: ID!, $alt: String!) {
      productUpdateMedia(id: $id, media: { id: $mediaId, alt: $alt }) {
        media { id }
        mediaUserErrors { field message }
      }
    }`
    const r = await admin.graphql(m, { variables: { id: productId, mediaId, alt: fix } })
    const rd = await r.json()
    const errs = rd.data.productUpdateMedia.mediaUserErrors
    if (errs?.length) throw new Error(errs[0].message)
  } else {
    throw new Error('unsupported issue type: ' + issue.type)
  }

  await db.issue.update({ where: { id: issue.id }, data: { status: 'fixed', fixedContent: fix } })
  return fix
}

export async function getBrandVoice(shop) {
  // v1: single global voice; per-shop config comes later
  const raw = process.env.BRAND_VOICE_JSON
  if (raw) {
    try { return JSON.parse(raw) } catch (e) {}
  }
  return BRAND_VOICE_DEFAULT
}
