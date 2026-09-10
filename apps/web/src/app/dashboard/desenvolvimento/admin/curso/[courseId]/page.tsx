"use client";

import { use } from "react";
import { DesenvolvimentoAdminCourseEditor } from "@/components/dashboard/desenvolvimento/DesenvolvimentoAdminCourseEditor";

export default function DesenvolvimentoAdminCursoPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  return <DesenvolvimentoAdminCourseEditor courseId={courseId} />;
}
