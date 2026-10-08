import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { CopyButton } from "../../components/data-display/copy-button";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const writeText = vi.fn<() => Promise<void>>();

function installClipboard(implementation: () => Promise<void>) {
  writeText.mockImplementation(implementation);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
}

const PROPS = {
  value: "DHR-20261008-4821",
  label: "Copy tracking ID",
  copiedLabel: "Tracking ID copied",
  errorLabel: "Could not copy to clipboard",
};

describe("CopyButton", () => {
  beforeEach(() => {
    writeText.mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
    installClipboard(() => Promise.resolve());
  });

  it("copies the value and reports success", async () => {
    render(<CopyButton {...PROPS} />);

    const button = screen.getByRole("button", { name: "Copy tracking ID" });
    fireEvent.click(button);

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("DHR-20261008-4821"));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Tracking ID copied"));
    // The confirmation is announced to assistive tech, not just coloured.
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("Tracking ID copied"),
    );
  });

  it("surfaces clipboard denial instead of throwing", async () => {
    installClipboard(() => Promise.reject(new Error("denied")));
    render(<CopyButton {...PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "Copy tracking ID" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Could not copy to clipboard"));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toBe("Could not copy to clipboard"),
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("exposes the label as visible text when asked", () => {
    render(<CopyButton {...PROPS} showLabel />);
    expect(screen.getByText("Copy tracking ID")).toBeDefined();
  });
});
