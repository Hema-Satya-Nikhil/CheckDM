import { describe, it, expect } from "vitest";
import { toUserFacingProviderMessage } from "@/lib/meta/user-message";

/**
 * Provider errors reach the browser with the operator-only path, code, subcode,
 * type and Meta trace id appended. That detail is useful in a log and useless
 * (and mildly informative to an attacker) in a UI, so it has to be stripped
 * while keeping the part a user can act on.
 */
describe("toUserFacingProviderMessage", () => {
  it("strips the path and the code/trace block", () => {
    const raw =
      "Message text is outside the allowed window (/v21.0/1234/messages) " +
      "[code=10 sub=- type=OAuthException trace=AbCdEf123]";
    expect(toUserFacingProviderMessage(raw)).toBe(
      "Message text is outside the allowed window",
    );
  });

  it("strips a code/trace block with no path", () => {
    expect(
      toUserFacingProviderMessage("User not found [code=100 sub=- type=GraphMethodException trace=XyZ]"),
    ).toBe("User not found");
  });

  it("strips a bare path", () => {
    expect(toUserFacingProviderMessage("Something failed (/v21.0/a/b)")).toBe(
      "Something failed",
    );
  });

  it("never leaks a trace id, even if the sentence is unusual", () => {
    const raw = "odd  (  /v21.0/x ) [code=1 sub=2 type=T trace=DEADBEEF]";
    expect(toUserFacingProviderMessage(raw)).not.toContain("DEADBEEF");
    expect(toUserFacingProviderMessage(raw)).not.toContain("/v21.0");
  });

  it("falls back to a readable sentence when nothing is left", () => {
    expect(toUserFacingProviderMessage("  ")).toBe(
      "The request was rejected by Instagram.",
    );
    expect(toUserFacingProviderMessage("(/v21.0/x) [code=1]")).toBe(
      "The request was rejected by Instagram.",
    );
  });

  it("leaves an already-clean message untouched", () => {
    expect(toUserFacingProviderMessage("That is not a valid recipient.")).toBe(
      "That is not a valid recipient.",
    );
  });
});
