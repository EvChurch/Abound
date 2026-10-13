// @vitest-environment node
import { realpathSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MailDev } from "maildev";
import type { Transporter } from "nodemailer";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Resolve from Maildev's installed package so these tests exercise its SMTP
// dependency, rather than the application's independent Nodemailer version.
const maildevPackage = realpathSync(
  resolve("node_modules/maildev/package.json"),
);
const smtpRequire = createRequire(
  realpathSync(
    resolve(dirname(maildevPackage), "..", "@maildev/smtp/package.json"),
  ),
);
const parseAddress = smtpRequire("nodemailer/lib/addressparser") as (
  value: string,
) => Array<{ address: string; name: string }>;

describe("Maildev SMTP address parser security", () => {
  it("keeps a comment suffix out of the destination domain", () => {
    // GHSA-g57g-f23g-4646: a quoted local part followed by a comment
    // must not concatenate the trailing text into an SMTP destination.
    expect(parseAddress('"user"@example.invalid(comment)evil.invalid')).toEqual(
      [{ address: "user@example.invalid", name: "evil.invalid" }],
    );
  });

  it("preserves ordinary display names and separate recipients", () => {
    expect(
      parseAddress(
        '"Fixture Sender" <sender@example.invalid>, receiver@example.invalid',
      ),
    ).toEqual([
      { address: "sender@example.invalid", name: "Fixture Sender" },
      { address: "receiver@example.invalid", name: "" },
    ]);
  });
});

it("captures SMTP MIME messages with the scoped Nodemailer client", async () => {
  const directory = await mkdtemp(join(tmpdir(), "abound-maildev-contract-"));
  const server = new MailDev({
    smtp: 0,
    web: 0,
    ip: "127.0.0.1",
    webIp: "127.0.0.1",
    mailDirectory: directory,
    autoRelay: false,
    silent: true,
  });
  try {
    await server.start();
    const { smtp, api } = server.getServers()!;
    expect(smtp).not.toBeNull();
    expect(api).not.toBeNull();
    const base = `http://127.0.0.1:${api!.getPort()}/api`;
    expect((await fetch(`${base}/healthz`)).ok).toBe(true);
    const createTransport = smtpRequire("nodemailer")
      .createTransport as (options: {
      host: string;
      port: number;
      ignoreTLS: boolean;
    }) => Transporter;
    const client = createTransport({
      host: "127.0.0.1",
      port: smtp!.getPort(),
      ignoreTLS: true,
    });
    try {
      await client.sendMail({
        from: '"Fixture Sender" <sender@example.invalid>',
        to: "receiver@example.invalid",
        subject: "isolated SMTP compatibility fixture",
        text: "synthetic body",
        attachments: [
          { filename: "fixture.txt", content: "synthetic attachment" },
        ],
      });
    } finally {
      client.close();
    }
    const emails = (await (await fetch(`${base}/email`)).json()) as Array<{
      id: string;
      subject: string;
      to: Array<{ address: string }>;
      text: string;
      attachments: Array<{ filename: string; generatedFileName: string }>;
    }>;
    expect(emails).toHaveLength(1);
    expect(emails[0].subject).toBe("isolated SMTP compatibility fixture");
    expect(emails[0].to[0].address).toBe("receiver@example.invalid");
    expect(emails[0].text).toContain("synthetic body");
    expect(emails[0].attachments[0].filename).toBe("fixture.txt");
    expect(
      await (
        await fetch(
          `${base}/email/${emails[0].id}/attachment/${emails[0].attachments[0].generatedFileName}`,
        )
      ).text(),
    ).toBe("synthetic attachment");
  } finally {
    await server.stop();
    await rm(directory, { recursive: true, force: true });
  }
}, 15_000);
