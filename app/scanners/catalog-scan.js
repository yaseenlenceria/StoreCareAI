// StoreCare AI — Catalog Scanner
// Scans all products for: missing/thin descriptions, missing SEO title/description,
// missing image alt text. Returns issues[] for the health-score engine.

export async function scanCatalog(admin, shop) {
  const issues = []
  let cursor = null
  let scanned = 0

  const query = `
    query Products($cursor: String) {
      products(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          title
          handle
          descriptionHtml
          featuredMedia { preview { image { altText url } } }
          seo { title description }
          status
        }
      }
    }`

  while (true) {
    const response = await admin.graphql(query, { variables: { cursor } })
    const data = await response.json()
    const conn = data.data.products
    scanned += conn.nodes.length

    for (const p of conn.nodes) {
      if (p.status !== 'ACTIVE') continue
      const descText = stripHtml(p.descriptionHtml || '')

      if (descText.trim().length < 50) {
        issues.push(issue(shop, p, 'MISSING_DESCRIPTION',
          descText.trim().length === 0 ? 'Product has no description' : `Description is very thin (${descText.trim().length} chars)`))
      }
      if (!p.seo?.title) {
        issues.push(issue(shop, p, 'MISSING_SEO_TITLE', 'No SEO page title set — Google shows a random headline'))
      }
      if (!p.seo?.description) {
        issues.push(issue(shop, p, 'MISSING_SEO_DESCRIPTION', 'No meta description — Google writes its own snippet'))
      }
      const img = p.featuredMedia?.preview?.image
      if (img && !img.altText) {
        issues.push(issue(shop, p, 'MISSING_ALT_TEXT', 'Main product image has no alt text (bad for SEO + accessibility)'))
      }
    }

    if (!conn.pageInfo.hasNextPage) break
    cursor = conn.pageInfo.endCursor
  }

  return { scanned, issues }
}

function issue(shop, p, type, detail) {
  return { shop, type, productId: p.id, productTitle: p.title, detail, fixable: true }
}

function stripHtml(html) {
  return String(html).replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ')
}
