"use client";

import { useCallback, useEffect, useState } from "react";
import { FeedbackModal } from "@/components/ui/feedback-modal";

const STORAGE_KEY = "bcg-save-success";

const DEFAULT_MESSAGE = "Alterações salvas. Você continua nesta tela.";

/** Marca sucesso antes de router.replace para a tela de edição exibir o modal. */
export function markSaveSuccessForNavigation() {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY, "1");
  }
}

export function useSaveSuccessFeedback(message = DEFAULT_MESSAGE) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(STORAGE_KEY) === "1") {
      sessionStorage.removeItem(STORAGE_KEY);
      setOpen(true);
    }
  }, []);

  const notifySaved = useCallback(() => setOpen(true), []);

  function SaveSuccessModal() {
    return (
      <FeedbackModal
        open={open}
        onOpenChange={setOpen}
        title="Salvo"
        message={message}
        variant="success"
      />
    );
  }

  return { notifySaved, SaveSuccessModal, saveSuccessOpen: open, setSaveSuccessOpen: setOpen };
}
