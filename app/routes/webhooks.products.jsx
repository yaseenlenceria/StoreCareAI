// StoreCare AI — product webhooks: auto-rescan when products change
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { runScan } from "../models/store-care.server";

// Shopify sends products/create and products/update — we re-scan so the
// merchant's health score is always current. This is the "never ends" engine.
export const action = async ({ request }) => {
  const { shop, admin, payload } = await authenticate.webhook(request);

  try {
    await runScan(admin, shop);
    console.log(`[StoreCare] rescan completed for ${shop} after product webhook`);
  } catch (e) {
    console.error("[StoreCare] rescan failed:", e.message);
  }

  return json({ ok: true });
};
