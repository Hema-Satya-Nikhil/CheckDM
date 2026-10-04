import { describe, expect, it } from "vitest";
import { isWebUrl, optionalDestinationUrlSchema } from "@/lib/tracking/url";

// `z.string().url()` accepts anything `new URL()` parses, so it let
// `javascript:` and `data:` through into a saved campaign link. These cases
// are the ones the redirect route would have copied into a `Location` header.
const NON_WEB_SCHEMES = [
  "javascript:alert(1)",
  "JaVaScRiPt:alert(document.domain)",
  "data:text/html,<script>alert(1)</script>",
  "vbscript:msgbox(1)",
  "file:///etc/passwd",
];

const WEB_URLS = [
  "https://example.com/offer",
  "http://example.com/offer",
  "https://example.com/offer?utm_source=ig#plan",
];

describe("campaign destination URL validation", () => {
  it("rejects every non-web scheme Zod's url() accepts", () => {
    for (const value of NON_WEB_SCHEMES) {
      expect(isWebUrl(value), value).toBe(false);
      expect(optionalDestinationUrlSchema.safeParse(value).success, value).toBe(
        false
      );
    }
  });

  it("accepts http and https", () => {
    for (const value of WEB_URLS) {
      expect(isWebUrl(value), value).toBe(true);
      expect(optionalDestinationUrlSchema.safeParse(value).success, value).toBe(
        true
      );
    }
  });

  it("still treats an empty string as 'clear the link'", () => {
    expect(optionalDestinationUrlSchema.safeParse("").success).toBe(true);
  });

  it("keeps leaving a link unset distinct from clearing it", () => {
    expect(optionalDestinationUrlSchema.safeParse(undefined).success).toBe(true);
    expect(optionalDestinationUrlSchema.safeParse(null).success).toBe(true);
  });

  it("rejects values that are not URLs at all", () => {
    for (const value of ["example.com", "/r/abc", "not a url", ""]) {
      if (value === "") continue;
      expect(isWebUrl(value), value).toBe(false);
    }
  });
});