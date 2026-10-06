// @vitest-environment node
import { realpathSync } from "node:fs";
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
