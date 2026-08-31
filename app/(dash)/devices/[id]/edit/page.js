"use client";

import { use } from "react";
import useSWR from "swr";
import { fetcher } from "@/components/api";
import DeviceForm from "@/components/DeviceForm";

export default function EditDevicePage({ params }) {
  const { id } = use(params);
  const { data } = useSWR(`/api/devices/${id}`, fetcher);

  if (!data) return <div className="text-muted">جارٍ التحميل…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">تعديل: {data.device.name}</h1>
      <DeviceForm id={id} initial={data.device} />
    </div>
  );
}
