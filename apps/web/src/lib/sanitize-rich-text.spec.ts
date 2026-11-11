import { describe, expect, it } from "vitest";
import { sanitizeRichTextHtml } from "./sanitize-rich-text";

describe("sanitizeRichTextHtml", () => {
  it("strips script tags", () => {
    expect(sanitizeRichTextHtml('<p>ok</p><script>alert(1)</script>')).not.toContain("script");
  });
});
