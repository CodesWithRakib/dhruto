"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  Building,
  Check,
  Home,
  MessageSquare,
  Plus,
  Shield,
  Smartphone,
} from "lucide-react";
import { Button, Card, CardContent, Switch } from "@dhruto/ui";
import { PageHeader } from "@/components/page-header";
import { useAppSelector } from "@/store/hooks";
import { toast } from "sonner";

interface Address {
  id: string;
  tag: "Home" | "Office" | "Other";
  recipientName: string;
  phone: string;
  address: string;
  thana: string;
  district: string;
  isDefault: boolean;
}

const INITIAL_ADDRESSES: Address[] = [
  {
    id: "addr-1",
    tag: "Home",
    recipientName: "Customer Account",
    phone: "+8801712345678",
    address: "House 42, Road 11, Block D, Banani",
    thana: "Banani",
    district: "Dhaka",
    isDefault: true,
  },
  {
    id: "addr-2",
    tag: "Office",
    recipientName: "Customer Account",
    phone: "+8801712345678",
    address: "Level 8, Concord Tower, Gulshan-1",
    thana: "Gulshan",
    district: "Dhaka",
    isDefault: false,
  },
];

export function CustomerSettingsView() {
  const t = useTranslations("Customer");
  const authUser = useAppSelector((s) => s.auth.user);

  const [addresses, setAddresses] = React.useState<Address[]>(INITIAL_ADDRESSES);

  // Notification toggles
  const [smsOtp, setSmsOtp] = React.useState(true);
  const [whatsappUpdates, setWhatsappUpdates] = React.useState(true);
  const [deliveryEmails, setDeliveryEmails] = React.useState(true);

  const handleSetDefault = (id: string) => {
    setAddresses((prev) =>
      prev.map((a) => ({
        ...a,
        isDefault: a.id === id,
      }))
    );
    toast.success("Default delivery address updated.");
  };

  const handleSavePreferences = () => {
    toast.success("Delivery alert preferences saved.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("settingsPageTitle")}
        description={t("settingsPageSubtitle")}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Saved Addresses */}
        <div className="space-y-4 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Saved Delivery Addresses</h2>
              <p className="text-xs text-muted-foreground">Addresses riders deliver your orders to</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.info("Address addition dialog opened.")}
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
                        {addr.tag === "Home" ? <Home className="h-3.5 w-3.5" /> : <Building className="h-3.5 w-3.5" />}
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

                  {!addr.isDefault ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(addr.id)}
                      className="h-8 self-end sm:self-center text-xs font-semibold"
                    >
                      Make Default
                    </Button>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-primary self-end sm:self-center">
                      <Check className="h-3.5 w-3.5" />
                      Primary Address
                    </span>
                  )}
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
                  <span className="font-bold text-foreground">{authUser?.name || "Customer"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/60">
                  <span className="text-muted-foreground">Registered Phone</span>
                  <span className="font-mono font-bold text-foreground">{authUser?.phone || "+8801700000000"}</span>
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
