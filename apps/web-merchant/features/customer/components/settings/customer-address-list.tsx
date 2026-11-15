"use client";

import * as React from "react";
import { Plus, Home, Building, MapPin, Check, Trash2 } from "lucide-react";
import { Button } from "@dhruto/ui";

export interface CustomerAddress {
  id: string;
  tag: "Home" | "Office" | "Other";
  recipientName: string;
  phone: string;
  address: string;
  thana: string;
  district: string;
  isDefault: boolean;
}

interface CustomerAddressListProps {
  addresses: CustomerAddress[];
  onOpenAdd: () => void;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CustomerAddressList({
  addresses,
  onOpenAdd,
  onSetDefault,
  onDelete,
}: CustomerAddressListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Saved Delivery Addresses</h2>
          <p className="text-xs text-muted-foreground">
            Managed destinations for rider doorstep dispatch
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenAdd}
          className="h-9 gap-1.5 rounded-xl bg-surface-elevated text-xs font-semibold hover:bg-surface-muted"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Address
        </Button>
      </div>

      <div className="space-y-3">
        {addresses.length === 0 ? (
          <div className="rounded-3xl bg-surface-elevated p-8 text-center text-xs text-muted-foreground">
            No delivery addresses saved yet. Click &quot;Add Address&quot; to configure your doorstep delivery coordinates.
          </div>
        ) : (
          addresses.map((addr) => (
            <div
              key={addr.id}
              className={`rounded-3xl p-5 transition-all ${
                addr.isDefault
                  ? "bg-surface-elevated"
                  : "bg-surface-elevated/70"
              }`}
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      {addr.tag === "Home" ? (
                        <Home className="h-3.5 w-3.5" />
                      ) : addr.tag === "Office" ? (
                        <Building className="h-3.5 w-3.5" />
                      ) : (
                        <MapPin className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <span className="text-xs font-extrabold text-foreground">{addr.tag}</span>
                    {addr.isDefault ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        Default
                      </span>
                    ) : null}
                  </div>

                  <p className="text-xs text-foreground font-medium pt-0.5">{addr.address}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {addr.thana}, {addr.district} • Contact: {addr.phone}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {!addr.isDefault ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSetDefault(addr.id)}
                      className="h-8 rounded-xl bg-surface-muted/60 text-xs font-semibold hover:bg-surface-muted"
                    >
                      Make Default
                    </Button>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-primary">
                      <Check className="h-3.5 w-3.5" />
                      Primary
                    </span>
                  )}

                  {addresses.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => onDelete(addr.id)}
                      title="Delete address"
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                      aria-label="Delete address"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
