import { describe, it, expect } from "vitest";
import { parseCsv, toBulkRow } from "@/features/parcels/lib/csv";

/** Phase 7: bulk CSV parsing (pure unit tests, no network). */
describe("bulk CSV parser", () => {
  it("parses headers and rows", () => {
    const parsed = parseCsv(
      "recipientName,recipientPhone,district\nRahim,01712345678,Dhaka\nKarim,01812345678,CTG",
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.headers).toEqual(["recipientName", "recipientPhone", "district"]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({ recipientName: "Rahim", district: "Dhaka" });
  });

  it("handles quoted commas, escaped quotes, and CRLF", () => {
    const parsed = parseCsv(
      'recipientName,deliveryAddress\r\n"Ahmed, Jr","House ""12"", Road 4"\r\nSifat,Plain road',
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0]).toMatchObject({
      recipientName: "Ahmed, Jr",
      deliveryAddress: 'House "12", Road 4',
    });
    expect(parsed.rows[1]).toMatchObject({ recipientName: "Sifat" });
  });

  it("rejects empty input and unterminated quotes", () => {
    expect(parseCsv("").errors).toEqual(["CSV file is empty"]);
    expect(parseCsv('a,b\n"x,y').errors).toEqual(["Unterminated quoted field in CSV"]);
  });

  it("maps records to booking rows with numeric coercion", () => {
    const row = toBulkRow({
      recipientName: "R",
      recipientPhone: "01712345678",
      district: "Dhaka",
      thana: "Mirpur",
      deliveryAddress: "addr",
      codAmount: "1200",
      weight: "1.5",
    });
    expect(row).toMatchObject({ codAmount: 1200, weight: 1.5 });
    expect(toBulkRow({} as Record<string, string>).codAmount).toBe(0);
  });
});
