import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/en.json";
import { Pagination } from "../../components/pagination";
import { ActiveFilters } from "../../components/active-filters";
import { ConfirmDialog } from "../../components/confirm-dialog";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("Shared UI primitives", () => {
  describe("Pagination", () => {
    it("shows the current position and moves in both directions", () => {
      const onPageChange = vi.fn();
      renderWithIntl(
        <Pagination page={2} totalPages={5} onPageChange={onPageChange} />,
      );

      expect(screen.getByText("Page 2 of 5")).toBeDefined();

      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      expect(onPageChange).toHaveBeenCalledWith(3);

      fireEvent.click(screen.getByRole("button", { name: "Previous" }));
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it("disables the direction that has no page left", () => {
      const { unmount } = renderWithIntl(
        <Pagination page={1} totalPages={3} onPageChange={vi.fn()} />,
      );
      expect((screen.getByRole("button", { name: "Previous" }) as HTMLButtonElement).disabled).toBe(
        true,
      );
      unmount();

      renderWithIntl(<Pagination page={3} totalPages={3} onPageChange={vi.fn()} />);
      expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(
        true,
      );
    });

    it("does not invent a total when the API reports none (cursor feeds)", () => {
      renderWithIntl(<Pagination page={4} hasNextPage onPageChange={vi.fn()} />);
      expect(screen.getByText("Page 4")).toBeDefined();
      expect(screen.queryByText(/of/)).toBeNull();
    });

    it("clamps an out-of-range page to the last page", () => {
      const onPageChange = vi.fn();
      renderWithIntl(<Pagination page={99} totalPages={3} onPageChange={onPageChange} />);
      expect(screen.getByText("Page 3 of 3")).toBeDefined();
      expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(
        true,
      );
    });
  });

  describe("ActiveFilters", () => {
    it("renders nothing when no filter is active", () => {
      const { container } = renderWithIntl(
        <ActiveFilters filters={[]} onRemove={vi.fn()} onClearAll={vi.fn()} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it("removes only the clicked filter and can clear everything", () => {
      const onRemove = vi.fn();
      const onClearAll = vi.fn();
      renderWithIntl(
        <ActiveFilters
          filters={[
            { key: "status", label: "Status", display: "Pending" },
            { key: "district", label: "District", display: "Dhaka" },
          ]}
          onRemove={onRemove}
          onClearAll={onClearAll}
        />,
      );

      expect(screen.getByText("Status:")).toBeDefined();
      expect(screen.getByText("Dhaka")).toBeDefined();

      fireEvent.click(screen.getByRole("button", { name: "Remove Status filter" }));
      expect(onRemove).toHaveBeenCalledWith("status");

      fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
      expect(onClearAll).toHaveBeenCalledTimes(1);
    });
  });

  describe("ConfirmDialog", () => {
    it("closes without confirming when cancelled", () => {
      const onOpenChange = vi.fn();
      const onConfirm = vi.fn();
      renderWithIntl(
        <ConfirmDialog
          open
          onOpenChange={onOpenChange}
          title="Delete this subscription?"
          description="Deliveries stop immediately."
          onConfirm={onConfirm}
        />,
      );

      expect(screen.getByText("Delete this subscription?")).toBeDefined();
      expect(screen.getByText("Deliveries stop immediately.")).toBeDefined();

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(onConfirm).not.toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("runs the action and closes on success", async () => {
      const onOpenChange = vi.fn();
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      renderWithIntl(
        <ConfirmDialog open onOpenChange={onOpenChange} title="Confirm" onConfirm={onConfirm} />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
      expect(onConfirm).toHaveBeenCalledTimes(1);

      await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    });

    it("stays open and surfaces the API error when the action fails", async () => {
      const onOpenChange = vi.fn();
      const onConfirm = vi.fn().mockRejectedValue(new Error("Unable to cancel this payout."));
      renderWithIntl(
        <ConfirmDialog open onOpenChange={onOpenChange} title="Confirm" onConfirm={onConfirm} />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toContain("Unable to cancel this payout.");
      // A failed action must not look successful: the dialog stays open.
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
    });
  });
});
