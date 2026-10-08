import { describe, expect, it } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { DataTable, type ColumnDef } from "@dhruto/ui";
import en from "../../messages/en.json";
import bn from "../../messages/bn.json";

interface Row {
  code: string;
}

const COLUMNS: ColumnDef<Row, unknown>[] = [
  {
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => row.original.code,
  },
];

function renderTable(
  locale: "en" | "bn",
  messages: Record<string, unknown>,
  labels: Record<string, string>,
  data: Row[],
  formatNumber?: (value: number) => string,
) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <DataTable
        columns={COLUMNS}
        data={data}
        totalItems={3}
        pageCount={2}
        currentPage={1}
        itemsPerPage={2}
        onPageChange={() => {}}
        onLimitChange={() => {}}
        labels={labels}
        formatNumber={formatNumber}
      />
    </NextIntlClientProvider>,
  );
}

describe("DataTable localized chrome", () => {
  it("renders English pagination copy by default", () => {
    renderTable("en", en, {}, [{ code: "A" }]);
    // Page 1 of 2 rows per page 2 with 3 total rows shows rows 1-2.
    expect(screen.getByText("Showing 1 to 2 of 3 items")).toBeDefined();
    expect(screen.getByText("Per page:")).toBeDefined();
    expect(screen.getByText("Page 1 of 2")).toBeDefined();
  });

  it("renders Bangla pagination copy when labels are provided", () => {
    const labels = {
      showingRange: (bn as { DataTable: Record<string, string> }).DataTable.showingRange as string,
      perPage: (bn as { DataTable: Record<string, string> }).DataTable.perPage as string,
      pageOf: (bn as { DataTable: Record<string, string> }).DataTable.pageOf as string,
      previous: (bn as { DataTable: Record<string, string> }).DataTable.previous as string,
      next: (bn as { DataTable: Record<string, string> }).DataTable.next as string,
    };
    // Bangla numerals through the app's own formatter, as money does.
    const bnNumber = (value: number) =>
      new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 0 }).format(value);
    renderTable("bn", bn, labels, [{ code: "A" }], bnNumber);

    // No English pagination text may survive on the Bangla surface.
    expect(screen.queryByText(/Showing/)).toBeNull();
    expect(screen.queryByText("Per page:")).toBeNull();
    expect(screen.getByText("মোট ৩টির মধ্যে ১–২ দেখানো হচ্ছে")).toBeDefined();
    expect(screen.getByText("প্রতি পৃষ্ঠায়:")).toBeDefined();
    expect(screen.getByText("পৃষ্ঠা ১ / ২")).toBeDefined();
  });

  it("uses the localized empty message when there are no rows", () => {
    renderTable(
      "bn",
      bn,
      { emptyMessage: "কোনো পার্সেল নেই", emptyHint: "অন্য কিছু দেখুন" },
      [],
    );
    expect(screen.getByText("কোনো পার্সেল নেই")).toBeDefined();
    expect(screen.getByText("অন্য কিছু দেখুন")).toBeDefined();
  });
});
