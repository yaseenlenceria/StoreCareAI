// StoreCare AI — Issues list with one-click AI fix
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import { getOpenIssues } from "../models/store-care.server";
import {
  Page,
  Card,
  Button,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Box,
} from "@shopify/polaris";
import { useState } from "react";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const issues = await getOpenIssues(session.shop);
  return json({ issues });
};

export default function Issues() {
  const { issues } = useLoaderData();
  const submit = useSubmit();
  const [fixing, setFixing] = useState(null);
  const [fixedList, setFixedList] = useState({});
  const [errors, setErrors] = useState({});

  const fixOne = (issueId) => {
    setFixing(issueId);
    submit({}, { method: "post", action: "/app/fix/" + issueId });
    // poll result via navigation — simplest: optimistic UI + reload
    setTimeout(() => {
      setFixing(null);
      setFixedList((f) => ({ ...f, [issueId]: true }));
      window.location.reload();
    }, 6000);
  };

  const fixAll = () => {
    const next = issues.find((i) => !fixedList[i.id]);
    if (next) fixOne(next.id);
  };

  return (
    <Page
      title="Open issues"
      subtitle={issues.length + " issues — fix them one by one with AI, or grind through the list."}
      backAction={{ url: "/app" }}
    >
      <BlockStack gap="400">
        {issues.length === 0 && (
          <Card>
            <Box padding="600" inlineAlign="center">
              <BlockStack inlineAlign="center" gap="300">
                <Text variant="headingLg" as="h2">All clear ✨</Text>
                <Text tone="subdued">No open issues. New products will be scanned automatically.</Text>
              </BlockStack>
            </Box>
          </Card>
        )}

        {issues.length > 1 && (
          <Card>
            <Box padding="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="headingMd" as="h3">
                  {Object.keys(fixedList).length} of {issues.length} fixed
                </Text>
                <Button variant="primary" onClick={fixAll} loading={!!fixing}>
                  Fix next with AI →
                </Button>
              </InlineStack>
            </Box>
          </Card>
        )}

        {issues.map((i) => (
          <Card key={i.id}>
            <Box padding="400">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="200">
                  <InlineStack gap="300" blockAlign="center">
                    <Badge tone={typeTone(i.type)}>{typeLabel(i.type)}</Badge>
                    <Text variant="bodyMd" fontWeight="semibold" as="span">
                      {i.productTitle}
                    </Text>
                  </InlineStack>
                  <Text tone="subdued" as="span">{i.detail}</Text>
                </BlockStack>
                <InlineStack gap="300" blockAlign="center">
                  {fixedList[i.id] ? (
                    <Badge tone="success">Fixed ✓</Badge>
                  ) : fixing === i.id ? (
                    <Badge>AI writing…</Badge>
                  ) : (
                    <Button variant="primary" onClick={() => fixOne(i.id)}>
                      Fix with AI
                    </Button>
                  )}
                </InlineStack>
              </InlineStack>
            </Box>
          </Card>
        ))}
      </BlockStack>
    </Page>
  );
}

function typeTone(t) {
  const tones = {
    MISSING_DESCRIPTION: "critical",
    THIN_DESCRIPTION: "warning",
    MISSING_SEO_TITLE: "warning",
    MISSING_SEO_DESCRIPTION: "warning",
    MISSING_ALT_TEXT: "info",
  };
  return tones[t] || "info";
}

function typeLabel(t) {
  const labels = {
    MISSING_DESCRIPTION: "Missing description",
    THIN_DESCRIPTION: "Thin description",
    MISSING_SEO_TITLE: "Missing SEO title",
    MISSING_SEO_DESCRIPTION: "Missing meta description",
    MISSING_ALT_TEXT: "Missing alt text",
  };
  return labels[t] || t;
}
