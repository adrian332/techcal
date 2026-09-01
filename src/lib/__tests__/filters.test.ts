import { describe, expect, it } from "vitest";
import { isFiltered, parseFilters, toggleParam, withParam } from "../filters";

describe("parseFilters", () => {
  it("reads repeated and comma-joined params alike", () => {
    expect(parseFilters({ topic: ["ai", "security"] }).topics).toEqual(["ai", "security"]);
    expect(parseFilters({ topic: "ai,security" }).topics).toEqual(["ai", "security"]);
  });

  it("drops values that are not real topics instead of erroring", () => {
    expect(parseFilters({ topic: "ai,crypto" }).topics).toEqual(["ai"]);
    expect(parseFilters({ topic: "crypto" }).topics).toBeUndefined();
  });

  it("trims the search term and ignores a blank one", () => {
    expect(parseFilters({ q: "  re:Invent " }).search).toBe("re:Invent");
    expect(parseFilters({ q: "   " }).search).toBeUndefined();
  });

  it("returns an empty filter set for an empty URL", () => {
    expect(parseFilters({})).toEqual({});
  });
});

describe("isFiltered", () => {
  it("knows when anything is narrowing the view", () => {
    expect(isFiltered({})).toBe(false);
    expect(isFiltered({ topics: ["ai"] })).toBe(true);
    expect(isFiltered({ search: "node" })).toBe(true);
  });
});

describe("toggleParam", () => {
  it("adds a value that is not set", () => {
    expect(toggleParam({}, "topic", "ai")).toBe("?topic=ai");
  });

  it("removes a value that is already set", () => {
    // "" would mean "the current URL", so turning the last filter off must be "?".
    expect(toggleParam({ topic: "ai" }, "topic", "ai")).toBe("?");
  });

  it("keeps other params intact", () => {
    const qs = toggleParam({ view: "agenda", topic: "ai" }, "topic", "security");
    expect(qs).toContain("view=agenda");
    expect(qs).toContain("topic=ai");
    expect(qs).toContain("topic=security");
  });

  it("closes the open day panel, since the day may no longer match", () => {
    expect(toggleParam({ day: "2026-09-08" }, "topic", "ai")).toBe("?topic=ai");
  });
});

describe("withParam", () => {
  it("replaces rather than appends", () => {
    expect(withParam({ month: "2026-09" }, "month", "2026-10")).toBe("?month=2026-10");
  });

  it("clears a param when given null", () => {
    expect(withParam({ month: "2026-09", day: "2026-09-08" }, "day", null)).toBe("?month=2026-09");
  });
});
