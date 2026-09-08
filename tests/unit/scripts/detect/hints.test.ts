import { extractPlatformHints } from "#detect/hints.ts";
import { buildProbeView } from "#detect/probe-view.ts";
import type { ProbeData } from "#probe/read-probe-data.ts";

const SEARCH_INDEX = "https://framerusercontent.com/sites/abc123/searchIndex-x.json";

function probeData(homeHtml: string, headers: Record<string, string> = {}): ProbeData {
  return {
    sourceUrl: "https://example.com/",
    homeHtml,
    homeHttp: { status: 200, finalUrl: "https://example.com/", redirectChain: [], headers },
  };
}

const view = (homeHtml: string, headers: Record<string, string> = {}) =>
  buildProbeView(probeData(homeHtml, headers));

it("extracts the search index url and the site id from the meta tag", () => {
  const hints = extractPlatformHints(
    view(`<html><head><meta name="framer-search-index" content="${SEARCH_INDEX}"></head><body></body></html>`),
  );

  expect(hints.searchIndexUrl).toBe(SEARCH_INDEX);
  expect(hints.framerSiteId).toBe("abc123");
});

it("extracts the route id and the breakpoints from the hydrate payload", () => {
  const payload = JSON.stringify({
    routeId: "augiA20Il",
    breakpoints: [{ hash: "1c1yqcz", mediaQuery: "(min-width: 1200px)" }],
  }).replace(/"/g, "&quot;");

  const hints = extractPlatformHints(
    view(`<html><head></head><body><div data-framer-hydrate-v2="${payload}"></div></body></html>`),
  );

  expect(hints.framerRouteId).toBe("augiA20Il");
  expect(hints.framerBreakpoints).toEqual([{ hash: "1c1yqcz", mediaQuery: "(min-width: 1200px)" }]);
});
