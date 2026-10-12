"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  Building,
  Check,
  Home,
  MapPin,
  MessageSquare,
  Plus,
  Shield,
  Smartphone,
  Trash2,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Switch,
} from "@dhruto/ui";
import { PageHeader } from "@/components/page-header";
import { useAppSelector } from "@/store/hooks";
import { toast } from "sonner";

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

const STORAGE_KEY_ADDRESSES = "dhruto_customer_addresses_v1";
const STORAGE_KEY_NOTIFS = "dhruto_customer_notifs_v1";

const DEFAULT_ADDRESSES: CustomerAddress[] = [
  {
    id: "addr-1",
    tag: "Home",
    recipientName: "Mahmudur Rahman",
    phone: "01700000005",
    address: "House 42, Road 11, Block D, Banani",
    thana: "Banani",
    district: "Dhaka",
    isDefault: true,
  },
  {
    id: "addr-2",
    tag: "Office",
    recipientName: "Mahmudur Rahman",
    phone: "01700000005",
    address: "Level 8, Concord Tower, Gulshan-1",
    thana: "Gulshan",
    district: "Dhaka",
    isDefault: false,
  },
];

export function CustomerSettingsView() {
  const t = useTranslations("Customer");
  const authUser = useAppSelector((s) => s.auth.user);

  const [addresses, setAddresses] = React.useState<CustomerAddress[]>(DEFAULT_ADDRESSES);

  // Notification toggles
  const [smsOtp, setSmsOtp] = React.useState(true);
  const [whatsappUpdates, setWhatsappUpdates] = React.useState(true);
  const [deliveryEmails, setDeliveryEmails] = React.useState(true);

  // Add Address Modal
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [newTag, setNewTag] = React.useState<"Home" | "Office" | "Other">("Home");
  const [newAddressText, setNewAddressText] = React.useState("");
  const [newThana, setNewThana] = React.useState("");
  const [newDistrict, setNewDistrict] = React.useState("Dhaka");
  const [newPhone, setNewPhone] = React.useState("");
  const [newSetDefault, setNewSetDefault] = React.useState(false);

  // Load from localStorage
  React.useEffect(() => {
    try {
      const savedAddrs = localStorage.getItem(STORAGE_KEY_ADDRESSES);
      if (savedAddrs) {
        const parsed = JSON.parse(savedAddrs) as CustomerAddress[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAddresses(parsed);
        }
      }

      const savedNotifs = localStorage.getItem(STORAGE_KEY_NOTIFS);
      if (savedNotifs) {
        const parsed = JSON.parse(savedNotifs);
        if (typeof parsed.smsOtp === "boolean") setSmsOtp(parsed.smsOtp);
        if (typeof parsed.whatsappUpdates === "boolean") setWhatsappUpdates(parsed.whatsappUpdates);
        if (typeof parsed.deliveryEmails === "boolean") setDeliveryEmails(parsed.deliveryEmails);
      }
    } catch {
      // Storage unavailable
    }
  }, []);

  const saveAddresses = (list: CustomerAddress[]) => {
    setAddresses(list);
    try {
      localStorage.setItem(STORAGE_KEY_ADDRESSES, JSON.stringify(list));
    } catch {
      // Storage unavailable
    }
  };

  const handleSetDefault = (id: string) => {
    const updated = addresses.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    saveAddresses(updated);
    toast.success("Default delivery address updated.");
  };

  const handleDeleteAddress = (id: string) => {
    if (addresses.length <= 1) {
      toast.error("You must maintain at least one delivery address.");
      return;
    }
    const updated = addresses.filter((a) => a.id !== id);
    if (!updated.some((a) => a.isDefault) && updated.length > 0 && updated[0]) {
      updated[0].isDefault = true;
    }
    saveAddresses(updated);
    toast.info("Delivery address removed.");
  };

  const handleAddAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddressText.trim() || !newThana.trim()) {
      toast.error("Please fill in address and thana.");
      return;
    }

    const newAddr: CustomerAddress = {
      id: `addr-${Date.now()}`,
      tag: newTag,
      recipientName: authUser?.name || "Customer",
      phone: newPhone.trim() || authUser?.phone || "+8801700000005",
      address: newAddressText.trim(),
      thana: newThana.trim(),
      district: newDistrict.trim() || "Dhaka",
      isDefault: newSetDefault || addresses.length === 0,
    };

    let updated = [...addresses];
    if (newAddr.isDefault) {
      updated = updated.map((a) => ({ ...a, isDefault: false }));
    }
    updated.push(newAddr);

    saveAddresses(updated);
    toast.success("New delivery address added.");
    setAddModalOpen(false);
    setNewAddressText("");
    setNewThana("");
    setNewPhone("");
    setNewSetDefault(false);
  };

  const handleSavePreferences = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY_NOTIFS,
        JSON.stringify({ smsOtp, whatsappUpdates, deliveryEmails })
      );
    } catch {
      // Storage unavailable
    }
    toast.success("Delivery alert preferences saved.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("settingsPageTitle")}
        description={t("settingsPageSubtitle")}
      />

      {/* Add Address Modal Dialog */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md p-6 rounded-3xl border border-border/80 shadow-2xl">
          <form onSubmit={handleAddAddressSubmit} className="space-y-4">
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
                      className={`flex-1 rounded-xl py-1.5 text-xs font-bold transition-all ${
                        newTag === tag
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "bg-surface text-muted-foreground border border-border hover:bg-surface-muted"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase text-muted-foreground">
                  Street Address & House / Flat No.
                </label>
                <input
                  type="text"
                  required
                  value={newAddressText}
                  onChange={(e) => setNewAddressText(e.target.value)}
                  placeholder="e.g. House 14, Road 5, Block B"
                  className="mt-1 h-9 w-full rounded-xl border border-border bg-surface px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold uppercase text-muted-foreground">
                    Thana / Upazila
                  </label>
                  <input
                    type="text"
                    required
                    value={newThana}
                    onChange={(e) => setNewThana(e.target.value)}
                    placeholder="e.g. Dhanmondi"
                    className="mt-1 h-9 w-full rounded-xl border border-border bg-surface px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase text-muted-foreground">
                    District
                  </label>
                  <input
                    type="text"
                    required
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    placeholder="e.g. Dhaka"
                    className="mt-1 h-9 w-full rounded-xl border border-border bg-surface px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
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
                  className="mt-1 h-9 w-full rounded-xl border border-border bg-surface px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="setDef"
                  checked={newSetDefault}
                  onChange={(e) => setNewSetDefault(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="setDef" className="text-xs font-medium text-foreground cursor-pointer">
                  Set as my primary default delivery address
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddModalOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="h-9 text-xs font-semibold">
                Save Address
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Saved Addresses */}
        <div className="space-y-4 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Saved Delivery Addresses</h2>
              <p className="text-xs text-muted-foreground">
                Managed destinations for rider doorstep dispatch
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddModalOpen(true)}
              className="h-9 gap-1.5 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Address
            </Button>
          </div>

          <div className="space-y-3">
            {addresses.map((addr) => (
              <Card
                key={addr.id}
                className={`border transition-all ${
                  addr.isDefault
                    ? "border-primary/40 bg-surface shadow-xs"
                    : "border-border/80 bg-surface/80"
                }`}
              >
                <CardContent className="p-4 sm:p-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-soft text-primary">
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
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
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
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(addr.id)}
                        className="h-8 text-xs font-semibold"
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
                        onClick={() => handleDeleteAddress(addr.id)}
                        title="Delete address"
                        className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                        aria-label="Delete address"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Column: Notification Preferences & Security */}
        <div className="space-y-6 lg:col-span-5">
          {/* Notification Card */}
          <Card className="border border-border/80 bg-surface shadow-2xs">
            <CardContent className="p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Bell className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Delivery Notifications</h3>
                  <p className="text-[11px] text-muted-foreground">Manage how you receive OTP and tracking alerts</p>
                </div>
              </div>

              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                      SMS OTP & Handoff Alerts
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Receive instant SMS when rider is en route and with delivery OTP.
                    </p>
                  </div>
                  <Switch checked={smsOtp} onCheckedChange={setSmsOtp} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                      WhatsApp Live Tracking
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Get real-time map link and rider status updates via WhatsApp.
                    </p>
                  </div>
                  <Switch checked={whatsappUpdates} onCheckedChange={setWhatsappUpdates} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <span className="text-xs font-semibold text-foreground">Email Digital POD Receipts</span>
                    <p className="text-[11px] text-muted-foreground">
                      Receive completed delivery proof and invoices to your email.
                    </p>
                  </div>
                  <Switch checked={deliveryEmails} onCheckedChange={setDeliveryEmails} />
                </div>
              </div>

              <Button
                size="sm"
                className="w-full h-9 text-xs font-semibold"
                onClick={handleSavePreferences}
              >
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>

          {/* Account Profile Card */}
          <Card className="border border-border/80 bg-surface shadow-2xs">
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Shield className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Account & Security</h3>
                  <p className="text-[11px] text-muted-foreground">Verified recipient profile</p>
                </div>
              </div>

              <div className="space-y-2.5 pt-1 text-xs">
                <div className="flex justify-between py-1 border-b border-border/60">
                  <span className="text-muted-foreground">Recipient Name</span>
                  <span className="font-bold text-foreground">{authUser?.name || "Mahmudur Rahman"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/60">
                  <span className="text-muted-foreground">Registered Phone</span>
                  <span className="font-mono font-bold text-foreground">{authUser?.phone || "+8801700000005"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-semibold text-primary">Verified Customer</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
