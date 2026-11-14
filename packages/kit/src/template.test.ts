import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("../templates/scorecard.html.hbs", import.meta.url), "utf8");
const markdown = readFileSync(new URL("../templates/scorecard.md.hbs", import.meta.url), "utf8");

describe("html export template", () => {
  it("preconnects to every font host", () => {
    expect(html).toContain('rel="preconnect" href="https://fonts.googleapis.com"');
    expect(html).toContain('rel="preconnect" href="https://fonts.gstatic.com"');
    expect(html).toContain('rel="preconnect" href="https://fontsapi.zeoseven.com"');
  });

  it("loads Castoro, Cascadia Code and Inter from Google Fonts", () => {
    expect(html).toContain("family=Castoro");
    expect(html).toContain("family=Cascadia+Code");
    expect(html).toContain("family=Inter");
  });

  it("loads the Chinese faces from zeoseven", () => {
    expect(html).toContain("zeoseven.com/2246/main/result.css");
    expect(html).toContain("zeoseven.com/159/main/result.css");
  });

  it("uses the full font stacks", () => {
    expect(html).toContain("寒蝉锦书宋Pro");
    expect(html).toContain("Sarasa Mono SC");
  });
});

describe("markdown export template", () => {
  it("renders the score table and the notes", () => {
    expect(markdown).toContain("{{#each rows}}");
    expect(markdown).toContain("{{record.notes.pros}}");
    expect(markdown).toContain("{{band}}");
  });
});
