"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Cup360PageShell } from "@/components/dashboard/cup360/Cup360PageShell";
import { DesenvolvimentoCoursePlayer } from "@/components/dashboard/desenvolvimento/DesenvolvimentoCoursePlayer";

export default function DesenvolvimentoCursoPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  const router = useRouter();
  const { canAccessModule, loading } = useAuth();

  if (!loading && !canAccessModule("desenvolvimento")) {
    router.replace("/dashboard");
    return null;
  }

  return (
    <Cup360PageShell className="max-w-none">
      <DesenvolvimentoCoursePlayer courseId={courseId} />
    </Cup360PageShell>
  );
}
