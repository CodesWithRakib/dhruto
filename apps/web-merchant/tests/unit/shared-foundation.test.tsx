import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/en.json";
import { FilterTabs } from "../../components/filter-tabs";
import { FilterButton } from "../../components/filters/filter-button";
import { Timeline, TimelineItem } from "../../components/data-display/timeline";
import { EmptyState, ErrorState, LoadingState } from "../../components/feedback/states";
import { Combobox } from "../../components/forms/combobox";
import { TableToolbar } from "../../components/data-display/table-toolbar";
import { Package } from "lucide-react";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("shared foundation semantics", () => {
  it("FilterTabs marks exactly one option as pressed", () => {
    const onValueChange = vi.fn();
    renderWithIntl(
      <FilterTabs
        value="b"
        onValueChange={onValueChange}
        label="Status"
        options={[
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: "B" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "A" }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: "A" }));
    expect(onValueChange).toHaveBeenCalledWith("a");
  });

  it("FilterButton hides the count badge when nothing is active", () => {
    const { rerender } = renderWithIntl(
      <FilterButton count={0} label="Filters" onClick={vi.fn()} />,
    );
    expect(screen.queryByText("0")).toBeNull();
    rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <FilterButton count={3} label="Filters" onClick={vi.fn()} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("3")).toBeDefined();
  });

  it("Timeline exposes a labelled list with the current step", () => {
    renderWithIntl(
      <Timeline label="Delivery timeline">
        <TimelineItem title="Picked up" timestamp="Oct 7" />
        <TimelineItem title="Out for delivery" timestamp="Oct 8" tone="primary" current />
      </Timeline>,
    );
    const list = screen.getByRole("list", { name: "Delivery timeline" });
    expect(list).toBeDefined();
    expect(screen.getByText("Out for delivery").closest("li")?.getAttribute("aria-current")).toBe(
      "step",
    );
  });

  it("states use the correct live-region roles", () => {
    const { unmount: unmountError } = renderWithIntl(<ErrorState title="Down" />);
    expect(screen.getByRole("alert")).toBeDefined();
    unmountError();
    const { unmount: unmountLoading } = renderWithIntl(<LoadingState title="Busy" />);
    expect(screen.getByRole("status")).toBeDefined();
    unmountLoading();
    renderWithIntl(
      <EmptyState title="Empty" icon={Package} action={<button type="button">Act</button>} />,
    );
    expect(screen.getByRole("button", { name: "Act" })).toBeDefined();
  });

  it("Combobox filters options and reports the selection", () => {
    const onChange = vi.fn();
    renderWithIntl(
      <Combobox
        value=""
        onChange={onChange}
        placeholder="Pick a hub"
        searchPlaceholder="Search hubs"
        emptyText="Nothing found"
        options={[
          { value: "dhk", label: "Dhaka Hub" },
          { value: "ctg", label: "Chattogram Hub" },
        ]}
      />,
    );
    // Radix menus ignore bare synthetic clicks in jsdom; keyboard opens them.
    const trigger = screen.getByRole("button", { name: "Pick a hub" });
    fireEvent.keyDown(trigger, { key: "Enter", code: "Enter" });
    const search = screen.getByPlaceholderText("Search hubs");
    fireEvent.change(search, { target: { value: "chatto" } });
    expect(screen.queryByText("Dhaka Hub")).toBeNull();
    fireEvent.click(screen.getByRole("option", { name: /Chattogram Hub/ }));
    expect(onChange).toHaveBeenCalledWith("ctg");
  });

  it("TableToolbar debounces search instead of firing per keystroke", () => {
    vi.useFakeTimers();
    try {
      const onSearchChange = vi.fn();
      renderWithIntl(
        <TableToolbar
          searchValue=""
          onSearchChange={onSearchChange}
          searchPlaceholder="Search parcels"
        />,
      );
      const input = screen.getByPlaceholderText("Search parcels");
      fireEvent.change(input, { target: { value: "D" } });
      fireEvent.change(input, { target: { value: "DH" } });
      expect(onSearchChange).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(onSearchChange).toHaveBeenCalledTimes(1);
      expect(onSearchChange).toHaveBeenCalledWith("DH");
    } finally {
      vi.useRealTimers();
    }
  });
});
