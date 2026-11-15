"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { useAppSelector } from "@/store/hooks";
import { toast } from "sonner";
import {
  CustomerAddressList,
  type CustomerAddress,
} from "./settings/customer-address-list";
import { CustomerAddAddressDialog } from "./settings/customer-add-address-dialog";
import { CustomerNotificationsCard } from "./settings/customer-notifications-card";
import { CustomerAccountCard } from "./settings/customer-account-card";

const STORAGE_KEY_ADDRESSES = "dhruto_customer_addresses_v1";
const STORAGE_KEY_NOTIFS = "dhruto_customer_notifs_v1";

export function CustomerSettingsView() {
  const t = useTranslations("Customer");
  const authUser = useAppSelector((s) => s.auth.user);

  const [addresses, setAddresses] = React.useState<CustomerAddress[]>([]);

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

  // Load from localStorage or sync with authenticated customer
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
      phone: newPhone.trim() || authUser?.phone || "",
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
        JSON.stringify({ smsOtp, whatsappUpdates, deliveryEmails }),
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
      <CustomerAddAddressDialog
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        newTag={newTag}
        setNewTag={setNewTag}
        newAddressText={newAddressText}
        setNewAddressText={setNewAddressText}
        newDistrict={newDistrict}
        setNewDistrict={setNewDistrict}
        newThana={newThana}
        setNewThana={setNewThana}
        newPhone={newPhone}
        setNewPhone={setNewPhone}
        newSetDefault={newSetDefault}
        setNewSetDefault={setNewSetDefault}
        onSubmit={handleAddAddressSubmit}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Saved Addresses */}
        <div className="space-y-4 lg:col-span-7">
          <CustomerAddressList
            addresses={addresses}
            onOpenAdd={() => setAddModalOpen(true)}
            onSetDefault={handleSetDefault}
            onDelete={handleDeleteAddress}
          />
        </div>

        {/* Right Column: Notification Preferences & Security */}
        <div className="space-y-6 lg:col-span-5">
          <CustomerNotificationsCard
            smsOtp={smsOtp}
            setSmsOtp={setSmsOtp}
            whatsappUpdates={whatsappUpdates}
            setWhatsappUpdates={setWhatsappUpdates}
            deliveryEmails={deliveryEmails}
            setDeliveryEmails={setDeliveryEmails}
            onSave={handleSavePreferences}
          />

          <CustomerAccountCard
            name={authUser?.name || ""}
            phone={authUser?.phone || ""}
          />
        </div>
      </div>
    </div>
  );
}
