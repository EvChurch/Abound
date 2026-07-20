import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { CSSProperties } from "react";

export type JoiningNeverGivenEmailProps = {
  body: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  heading: string;
  previewText: string;
  recipientFirstName: string;
  signature: string;
};

export function JoiningNeverGivenEmail({
  body,
  ctaLabel,
  ctaUrl,
  heading,
  previewText,
  recipientFirstName,
  signature,
}: JoiningNeverGivenEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.kicker}>Abound Giving</Text>
            <Heading style={styles.heading}>{heading}</Heading>
          </Section>
          <Section style={styles.content}>
            <Text style={styles.paragraph}>Hi {recipientFirstName},</Text>
            {body.split("\n\n").map((paragraph, index) => (
              <Text key={index} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
            {ctaLabel && ctaUrl ? (
              <Button href={ctaUrl} style={styles.button}>
                {ctaLabel}
              </Button>
            ) : null}
            <Text style={styles.signature}>{signature}</Text>
          </Section>
          <Hr style={styles.rule} />
          <Text style={styles.footer}>
            You are receiving this because you are connected with our church.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: "#f6f8f7",
    color: "#17211d",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    margin: 0,
  },
  button: {
    backgroundColor: "#0f766e",
    borderRadius: "6px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: 700,
    marginTop: "8px",
    padding: "12px 18px",
    textDecoration: "none",
  },
  container: {
    backgroundColor: "#ffffff",
    border: "1px solid #dbe4df",
    borderRadius: "8px",
    margin: "32px auto",
    maxWidth: "600px",
    overflow: "hidden",
  },
  content: {
    padding: "8px 28px 28px",
  },
  footer: {
    color: "#66746e",
    fontSize: "12px",
    lineHeight: "20px",
    padding: "0 28px 24px",
  },
  header: {
    backgroundColor: "#eef6f3",
    padding: "28px 28px 18px",
  },
  heading: {
    color: "#17211d",
    fontSize: "26px",
    lineHeight: "32px",
    margin: "6px 0 0",
  },
  kicker: {
    color: "#0f766e",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0",
    lineHeight: "18px",
    margin: 0,
    textTransform: "uppercase" as const,
  },
  paragraph: {
    color: "#26342f",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "16px 0",
  },
  rule: {
    borderColor: "#dbe4df",
    margin: "0 28px 18px",
  },
  signature: {
    color: "#26342f",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "24px 0 0",
    whiteSpace: "pre-line" as const,
  },
} satisfies Record<string, CSSProperties>;
