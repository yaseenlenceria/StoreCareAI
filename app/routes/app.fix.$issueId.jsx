// StoreCare AI — apply a fix to a single issue
import { json } from '@remix-run/node'
import { authenticate } from '../shopify.server'
import { getIssue, applyFixToShopify, getBrandVoice } from '../models/store-care.server'

export const loader = async ({ request, params }) => {
  const { admin, session } = await authenticate.admin(request)
  return json({ ok: true })
}

export const action = async ({ request, params }) => {
  const { session, admin } = await authenticate.admin(request)
  const issue = await getIssue(params.issueId)
  if (!issue || issue.shop !== session.shop) {
    return json({ ok: false, error: 'Issue not found' }, { status: 404 })
  }
  try {
    const voice = await getBrandVoice(session.shop)
    const fix = await applyFixToShopify(admin, issue, voice)
    return json({ ok: true, fix })
  } catch (e) {
    return json({ ok: false, error: String(e.message || e) }, { status: 500 })
  }
}
