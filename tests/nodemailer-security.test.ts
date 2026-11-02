// @vitest-environment node
import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import type { AddressInfo } from "node:net";
import type { Readable } from "node:stream";
import { describe, expect, it } from "vitest";

import { MailDevEmailSender } from "@/lib/communications/maildev-sender";

const rootRequire = createRequire(resolve("package.json"));
const maildevPackage = realpathSync(
  resolve("node_modules/maildev/package.json"),
);
const smtpRequire = createRequire(
  realpathSync(
    resolve(dirname(maildevPackage), "../@maildev/smtp/package.json"),
  ),
);
const mailparserRequire = createRequire(smtpRequire.resolve("mailparser"));
const serverRequire = createRequire(smtpRequire.resolve("smtp-server"));
const contexts = [
  ["application", rootRequire],
  ["MailDev SMTP", smtpRequire],
  ["MailDev mailparser", mailparserRequire],
  ["MailDev smtp-server", serverRequire],
] as const;

describe.each(contexts)(
  "%s resolved address parser",
  (_name, parentRequire) => {
    const parserPath = parentRequire.resolve("nodemailer/lib/addressparser");
    const parseAddress = parentRequire("nodemailer/lib/addressparser") as (
      value: string,
    ) => Array<{ address: string; name: string }>;

    it.each([
      '"user"@example.invalid(comment)evil.invalid',
      "user@example.invalid(comment)evil.invalid",
    ])("keeps trailing comment text out of the envelope for %s", (input) => {
      expect(parseAddress(input)).toEqual([
        { address: "user@example.invalid", name: "evil.invalid" },
      ]);
      const MimeNode = parentRequire("nodemailer/lib/mime-node") as new () => {
        setHeader: (key: string, value: string) => void;
        getEnvelope: () => { to: string[] };
      };
      const node = new MimeNode();
      node.setHeader("To", input);
      expect(node.getEnvelope().to).toEqual(["user@example.invalid"]);
    });

    it("preserves ordinary display names and separate recipients", () => {
      expect(
        parseAddress(
          '"Fixture Sender" <sender@example.invalid>, to@example.invalid',
        ),
      ).toEqual([
        { address: "sender@example.invalid", name: "Fixture Sender" },
        { address: "to@example.invalid", name: "" },
      ]);
    });

    it("bounds comment-chain parsing work in a separate process", () => {
      // GHSA-prgh-xp8r-p3m5: flattening the growing accumulator per atom is
      // quadratic. A subprocess deadline also protects the test runner on regressions.
      const result = spawnSync(
        process.execPath,
        [
          "-e",
          `const assert = require('node:assert/strict');
         const parse = require(process.argv[1]);
         const parsed = parse('a' + '@b(c)'.repeat(200000));
         assert.equal(parsed.length, 1);
         assert.ok(parsed[0].address.startsWith('a@b'));`,
          parserPath,
        ],
        { timeout: 4000, encoding: "utf8" },
      );
      expect(result.error, result.stderr).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
    });
  },
);

it("bounds parsing of folded adversarial inbound headers through MailDev mailparser", () => {
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      String.raw`const assert = require('node:assert/strict');
       const {simpleParser} = require(process.argv[1]);
       const header = ('@b(c)'.repeat(200000)).match(/.{1,500}/g).join('\r\n ');
       simpleParser('From: sender@example.invalid\r\nTo: a' + header +
         '\r\nSubject: synthetic\r\n\r\nfixture').then(message => {
           assert.equal(message.subject, 'synthetic');
           assert.ok(message.to.value[0].address.startsWith('a@b'));
         }).catch(error => { console.error(error); process.exitCode = 1; });`,
      smtpRequire.resolve("mailparser"),
    ],
    { timeout: 4000, encoding: "utf8" },
  );
  expect(result.error, result.stderr).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
});

type Envelope = { rcptTo: Array<{ address: string }> };
type SmtpCallback = (error?: Error) => void;
const { SMTPServer } = smtpRequire("smtp-server") as {
  SMTPServer: new (options: {
    disabledCommands: string[];
    onRcptTo: (
      address: unknown,
      session: unknown,
      callback: SmtpCallback,
    ) => void;
    onData: (
      stream: Readable,
      session: { envelope: Envelope },
      callback: SmtpCallback,
    ) => void;
  }) => {
    server: { address: () => AddressInfo };
    listen: (port: number, host: string, callback: () => void) => void;
    close: (callback: () => void) => void;
  };
};

it("sends through the actual application adapter over loopback SMTP and maps rejections", async () => {
  let rejectRecipient = false;
  const messages: Array<{ mime: string; envelope: Envelope }> = [];
  const server = new SMTPServer({
    disabledCommands: ["AUTH", "STARTTLS"],
    onRcptTo(_address, _session, callback) {
      callback(rejectRecipient ? new Error("synthetic rejection") : undefined);
    },
    onData(stream, session, callback) {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => {
        messages.push({
          mime: Buffer.concat(chunks).toString(),
          envelope: session.envelope,
        });
        callback();
      });
    },
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  try {
    const sender = new MailDevEmailSender({
      host: "127.0.0.1",
      port: server.server.address().port,
      fromEmail: "sender@example.invalid",
      fromName: "Fixture Sender",
    });
    const payload = {
      from: "",
      automationId: "fixture",
      recipientId: "fixture",
      runId: "fixture",
      recipientEmail: "receiver@example.invalid",
      subject: "Synthetic transport contract",
      html: "<p>synthetic html</p>",
      text: "synthetic text",
      replyTo: "reply@example.invalid",
    };
    const accepted = await sender.send(payload);
    expect(accepted.status).toBe("ACCEPTED");
    if (accepted.status !== "ACCEPTED") throw new Error(accepted.errorMessage);
    expect(accepted.providerMessageId).toBeTruthy();
    expect(messages).toHaveLength(1);
    expect(messages[0].envelope.rcptTo[0].address).toBe(
      "receiver@example.invalid",
    );
    for (const value of [
      "Reply-To: reply@example.invalid",
      "Subject: Synthetic transport contract",
      "synthetic text",
      "synthetic html",
    ]) {
      expect(messages[0].mime).toContain(value);
    }
    // The application passes string recipients to Nodemailer. Verify the
    // advisory fixture at the actual SMTP envelope boundary as well.
    expect(
      (
        await sender.send({
          ...payload,
          recipientEmail: '"user"@example.invalid(comment)evil.invalid',
        })
      ).status,
    ).toBe("ACCEPTED");
    expect(messages[1].envelope.rcptTo[0].address).toBe("user@example.invalid");
    rejectRecipient = true;
    const rejected = await sender.send(payload);
    expect(rejected.status).toBe("FAILED");
    if (rejected.status !== "FAILED")
      throw new Error("Expected SMTP rejection");
    expect(rejected.errorMessage).toContain("synthetic rejection");
    expect(messages).toHaveLength(2);
  } finally {
    await new Promise<void>((done) => server.close(done));
  }
}, 15_000);
