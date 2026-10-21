// StoreCare AI — AI Fixer
// Generates fixes in the merchant's brand voice via Claude API.
// Falls back to a high-quality template fix when no API key is set.

export async function generateFix(issue, productData, brandVoice) {
  const key = process.env.CLAUDE_API_KEY
  if (key) {
    try {
      return await claudeFix(issue, productData, brandVoice, key)
    } catch (e) {
      console.error('Claude fix failed, using template fallback:', e.message)
    }
  }
  return templateFix(issue, productData, brandVoice)
}

async function claudeFix(issue, productData, brandVoice, key) {
  const prompts = {
    MISSING_DESCRIPTION: `Write a product description (120-180 words) for this product. Include: an emotional opening, 3-4 key benefits as a short list, and a closing line. Tone: ${brandVoice.tone}. Audience: ${brandVoice.audience}. Brand: ${brandVoice.brand}. Product: "${productData.title}". End with a soft call to action mentioning free delivery.`,
    MISSING_SEO_TITLE: `Write an SEO page title (max 60 characters) for this product. Include the product type and "Pakistan". No quotes. Product: "${productData.title}".`,
    MISSING_SEO_DESCRIPTION: `Write a meta description (140-155 characters) for this product. Include the product type, "Pakistan", and a benefit. Product: "${productData.title}".`,
    MISSING_ALT_TEXT: `Write image alt text (max 100 characters) describing this product image for accessibility and SEO. Include the product type and brand "Lenceria". Product: "${productData.title}".`,
  }
  const prompt = prompts[issue.type]
  if (!prompt) throw new Error('unknown issue type')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error('claude api ' + res.status)
  const data = await res.json()
  return (data.content?.[0]?.text || '').trim()
}

// Fallback: high-quality template (works with no API key — great for demos)
function templateFix(issue, productData, brandVoice) {
  const title = productData.title
  switch (issue.type) {
    case 'MISSING_DESCRIPTION':
      return `<p><strong>${title}</strong> — premium quality, imported and made to last. Designed for all-day comfort with a fit that flatters, this piece belongs in every wardrobe.</p><ul><li>Premium imported quality</li><li>Comfortable, flattering fit</li><li>Easy care, made to last</li></ul><p>Order today with free delivery and Cash on Delivery available across Pakistan.</p>`
    case 'MISSING_SEO_TITLE':
      return `${title} | ${brandVoice.brand} Pakistan`.slice(0, 60)
    case 'MISSING_SEO_DESCRIPTION':
      return `Shop ${title} online in Pakistan at ${brandVoice.brand}. Premium quality, free delivery and Cash on Delivery.`.slice(0, 158)
    case 'MISSING_ALT_TEXT':
      return `${title} — ${brandVoice.brand} Pakistan`
    default:
      return ''
  }
}
