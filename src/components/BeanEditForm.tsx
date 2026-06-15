"use client";

import { useRouter } from "next/navigation";
import type { Bean, UpdateBeanInput } from "@/types";
import { BeanForm } from "@/components/BeanForm";

/** Client wrapper: edits an existing bean via PUT, then returns to its page. */
export function BeanEditForm({ bean }: { bean: Bean }) {
  const router = useRouter();

  const handleSubmit = async (payload: UpdateBeanInput) => {
    const res = await fetch(`/api/beans/${bean.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { data?: Bean; error?: string };
    if (!res.ok || !json.data) {
      throw new Error(json.error ?? "保存失败，请重试");
    }
    router.push(`/beans/${bean.id}`);
    router.refresh();
  };

  return (
    <BeanForm
      initial={bean}
      submitLabel="保存修改"
      testIdPrefix="bean-edit"
      onSubmit={handleSubmit}
      onCancel={() => router.push(`/beans/${bean.id}`)}
    />
  );
}
