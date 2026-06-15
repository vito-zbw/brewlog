"use client";

import { useRouter } from "next/navigation";
import type { Bean, Photo, UpdateBeanInput } from "@/types";
import { BeanForm } from "@/components/BeanForm";
import { BeanDeleteButton } from "@/components/BeanDeleteButton";

interface BeanEditFormProps {
  bean: Bean;
  photos: Photo[];
  currentUserId: number;
}

/** Client wrapper: edits an existing bean (fields + photos) via the shared form. */
export function BeanEditForm({ bean, photos, currentUserId }: BeanEditFormProps) {
  const router = useRouter();

  const handleSubmit = async (payload: UpdateBeanInput): Promise<Bean> => {
    const res = await fetch(`/api/beans/${bean.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { data?: Bean; error?: string };
    if (!res.ok || !json.data) {
      throw new Error(json.error ?? "保存失败，请重试");
    }
    return json.data;
  };

  const handleComplete = () => {
    router.push(`/beans/${bean.id}`);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <BeanForm
        initial={bean}
        initialPhotos={photos}
        submitLabel="保存修改"
        showPhotos
        currentUserId={currentUserId}
        testIdPrefix="bean-edit"
        onSubmit={handleSubmit}
        onComplete={handleComplete}
        onCancel={() => router.push(`/beans/${bean.id}`)}
      />
      <div className="flex justify-end border-t border-cream-dark/50 pt-4">
        <BeanDeleteButton beanId={bean.id} />
      </div>
    </div>
  );
}
