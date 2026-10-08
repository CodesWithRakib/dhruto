import { describe, expect, it } from "vitest";
import {
  normalizeParcelListQuery,
  PARCELS_DEFAULT_LIMIT,
} from "../../features/parcels/hooks/use-parcels-list";

/**
 * Hand-edited or shared URLs must degrade to sane defaults instead of
 * sending garbage (?page=-1, ?limit=abc, ?sort=dropTable) to the API.
 */
describe("normalizeParcelListQuery", () => {
  const valid = {
    page: 3,
    limit: 20,
    sort: "createdAt",
    order: "DESC",
    status: "DELIVERED",
  };

  it("passes valid queries through untouched", () => {
    expect(normalizeParcelListQuery(valid)).toEqual({
      page: 3,
      limit: 20,
      sort: "createdAt",
      order: "DESC",
      status: "DELIVERED",
    });
  });

  it("clamps page to the first page", () => {
    expect(normalizeParcelListQuery({ ...valid, page: -2 }).page).toBe(1);
    expect(normalizeParcelListQuery({ ...valid, page: 0 }).page).toBe(1);
    expect(normalizeParcelListQuery({ ...valid, page: 2.7 }).page).toBe(2);
    expect(normalizeParcelListQuery({ ...valid, page: Number.NaN }).page).toBe(1);
  });

  it("falls back to the default page size for unknown limits", () => {
    expect(normalizeParcelListQuery({ ...valid, limit: 1000 }).limit).toBe(PARCELS_DEFAULT_LIMIT);
    expect(normalizeParcelListQuery({ ...valid, limit: 7 }).limit).toBe(PARCELS_DEFAULT_LIMIT);
    expect(normalizeParcelListQuery({ ...valid, limit: 50 }).limit).toBe(50);
  });

  it("rejects unknown sort keys and normalizes order", () => {
    expect(normalizeParcelListQuery({ ...valid, sort: "dropTable" }).sort).toBe("createdAt");
    expect(normalizeParcelListQuery({ ...valid, sort: "codAmount" }).sort).toBe("codAmount");
    expect(normalizeParcelListQuery({ ...valid, order: "asc" }).order).toBe("ASC");
    expect(normalizeParcelListQuery({ ...valid, order: "newest" }).order).toBe("DESC");
  });

  it("clears unknown statuses instead of querying them", () => {
    expect(normalizeParcelListQuery({ ...valid, status: "FLYING" }).status).toBe("");
    expect(normalizeParcelListQuery({ ...valid, status: "" }).status).toBe("");
  });
});
