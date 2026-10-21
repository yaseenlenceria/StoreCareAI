// StoreCare AI — Dashboard
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigate } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { getLatestScan } from "../models/store-care.server";
import { scoreGrade } from "../models/health-score";
import {
  Page,
  Card,
  Button,
  Text,
  BlockStack,
  InlineStack,
  ProgressBar,
  Badge,
  Box,
} from "@shopify/polaris";
import { useState } from "react";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const scan = await getLatestScan(session.shop);
  return json({
    shop: session.shop.replace(".myshopify.com", ""),
    scan: scan
      ? {
          score: scan.score,
          issues: scan.issues,
          openIssues: scan.issuesList?.length || 0,
          date: scan.createdAt,
          types: countTypes(scan.issuesList || []),
        }
      : null,
  });
};

function countTypes(issues) {
  const c = {};
  for (const i of issues) c[i.type] = (c[i.type] || 0) + 1;
  return c;
}

export default function Index() {
  const { shop, scan } = useLoaderData();
  const submit = useSubmit();
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);

  const runScan = () => {
    setScanning(true);
    submit({}, { method: "post", action: "/app/scan" });
    setTimeout(() => window.location.reload(), 20000);
  };

  const grade = scan ? scoreGrade(scan.score) : null;

  return (
    <Page
      title="StoreCare AI"
      subtitle={"Watching " + shop + ".myshopify.com — fixes while you sleep."}
      primaryAction={
        scan
          ? { content: "Re-scan store", onAction: runScan, loading: scanning }
          : { content: "🔍 Run my first free scan", onAction: runScan, loading: scanning }
      }
    >
      <BlockStack gap="500">
        {!scan && (
          <Card>
            <Box padding="600">
              <BlockStack gap="400" inlineAlign="center">
                <Text variant="headingXl" as="h2">Welcome to StoreCare AI 👋</Text>
                <Text variant="bodyLg" as="p" tone="subdued">
                  Run your first free scan — we check every product for missing
                  descriptions, SEO gaps and image problems, then fix them with AI.
                </Text>
                <Text tone="subdued">Takes about a minute · Nothing stored without approval</Text>
              </BlockStack>
            </Box>
          </Card>
        )}

        {scan && (
          <>
            <Card>
              <Box padding="500">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="200">
                    <InlineStack gap="300" blockAlign="center">
                      <Text variant="headingXl" as="h2">Store Health</Text>
                      <Badge tone={scan.openIssues > 0 ? "warning" : "success"}>
                        {scan.openIssues > 0 ? scan.openIssues + " issues open" : "All clear ✨"}
                      </Badge>
                    </InlineStack>
                    <Text tone="subdued">Last scan: {new Date(scan.date).toLocaleString()}</Text>
                  </BlockStack>
                  <div style={{ textAlign: "center", minWidth: "130px" }}>
                    <div style={{ fontSize: "56px", fontWeight: 800, lineHeight: 1, color: grade.color }}>
                      {scan.score}
                    </div>
                    <div style={{ fontSize: "13px", opacity: 0.7 }}>{grade.grade} grade</div>
                  </div>
                </InlineStack>
                <div style={{ marginTop: "16px" }}>
                  <ProgressBar progress={scan.score} size="slim" tone={scan.score >= 70 ? "success" : "critical"} />
                  <p style={{ marginTop: "8px", fontSize: "14px", opacity: 0.75 }}>{grade.message}</p>
                </div>
              </Box>
            </Card>

            {scan.openIssues > 0 && (
              <Card>
                <Box padding="500">
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="headingLg" as="h3">Open issues</Text>
                      <Button variant="primary" onClick={() => navigate("/app/issues")}>
                        Fix with AI →
                      </Button>
                    </InlineStack>
                    {Object.entries(scan.types).map(([type, n]) => (
                      <InlineStack key={type} align="space-between">
                        <Text as="span">{typeLabel(type)}</Text>
                        <Badge tone="warning">{n} products</Badge>
                      </InlineStack>
                    ))}
                  </BlockStack>
                </Box>
              </Card>
            )}

            <Card>
              <Box padding="500">
                <Text variant="bodyMd" tone="subdued">
                  ✨ StoreCare AI re-scans automatically whenever you add or update products.
                </Text>
              </Box>
            </Card>
          </>
        )}
      </BlockStack>
    </Page>
  );
}

function typeLabel(t) {
  const labels = {
    MISSING_DESCRIPTION: "Missing product descriptions",
    THIN_DESCRIPTION: "Thin product descriptions",
    MISSING_SEO_TITLE: "Missing SEO page titles",
    MISSING_SEO_DESCRIPTION: "Missing meta descriptions",
    MISSING_ALT_TEXT: "Image alt texts missing",
  };
  return labels[t] || t;
}
