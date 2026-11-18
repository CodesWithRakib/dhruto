"use client";

import * as React from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@dhruto/ui";
import { DistrictSelect, ThanaSelect } from "@/components/location/district-thana-picker";

interface CustomerAddAddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newTag: "Home" | "Office" | "Other";
  setNewTag: (tag: "Home" | "Office" | "Other") => void;
  newAddressText: string;
  setNewAddressText: (val: string) => void;
  newDistrict: string;
  setNewDistrict: (val: string) => void;
  newThana: string;
  setNewThana: (val: string) => void;
  newPhone: string;
  setNewPhone: (val: string) => void;
  newSetDefault: boolean;
  setNewSetDefault: (val: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function CustomerAddAddressDialog({
  open,
  onOpenChange,
  newTag,
  setNewTag,
  newAddressText,
  setNewAddressText,
  newDistrict,
  setNewDistrict,
  newThana,
  setNewThana,
  newPhone,
  setNewPhone,
  newSetDefault,
  setNewSetDefault,
  onSubmit,
}: CustomerAddAddressDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md p-6 rounded-3xl bg-surface-elevated">
        <form onSubmit={onSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Add Delivery Address
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter your doorstep delivery coordinates for swift parcel handoffs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <div>
              <label className="text-[11px] font-bold uppercase text-muted-foreground">
                Address Type
              </label>
              <div className="mt-1 flex gap-2">
                {(["Home", "Office", "Other"] as const).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setNewTag(tag)}
                    className={`flex-1 rounded-2xl py-2 text-xs font-bold transition-all ${
                      newTag === tag
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface-muted/60 text-muted-foreground hover:bg-surface-muted"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-muted-foreground">
                Street Address &amp; House / Flat No.
              </label>
              <input
                type="text"
                required
                value={newAddressText}
                onChange={(e) => setNewAddressText(e.target.value)}
                placeholder="e.g. House 14, Road 5, Block B"
                className="mt-1 h-10 w-full rounded-2xl bg-field px-3.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:bg-background hover:bg-field-hover"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                  District
                </label>
                <DistrictSelect
                  value={newDistrict}
                  onChange={(val) => {
                    setNewDistrict(val);
                  }}
                  placeholder="Select or type district"
                  className="h-10 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                  Thana / Upazila
                </label>
                <ThanaSelect
                  districtName={newDistrict}
                  value={newThana}
                  onChange={setNewThana}
                  placeholder="Select or type thana"
                  className="h-10 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-muted-foreground">
                Contact Phone for Rider
              </label>
              <input
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="e.g. 01700000005"
                className="mt-1 h-10 w-full rounded-2xl bg-field px-3.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:bg-background hover:bg-field-hover"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="setDef"
                checked={newSetDefault}
                onChange={(e) => setNewSetDefault(e.target.checked)}
                className="rounded text-primary focus:ring-primary"
              />
              <label htmlFor="setDef" className="text-xs font-medium text-foreground cursor-pointer">
                Set as my primary default delivery address
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="h-9 rounded-xl text-xs font-semibold">
              Save Address
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
