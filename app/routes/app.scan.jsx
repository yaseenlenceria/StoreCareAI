// StoreCare AI — run scan (action route)
import { json } from '@remix-run/node'
import { authenticate } from '../shopify.server'
import { runScan } from '../models/store-care.server'

export const action = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request)
  const { scan, issues, scanned } = await runScan(admin, session.shop)
  return json({ ok: true, scanId: scan.id, score: scan.score, issues: issues.length, scanned })
}

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request)
  const { scan, issues, scanned } = await runScan(admin, session.shop)
  return json({ ok: true, scanId: scan.id, score: scan.score, issues: issues.length, scanned })
}
