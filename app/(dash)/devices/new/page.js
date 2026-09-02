"use client";

import DeviceForm from "@/components/DeviceForm";
import { useI18n } from "@/components/I18nProvider";

export default function NewDevicePage() {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("form.newDevice")}</h1>
      <DeviceForm />
    </div>
  );
}
