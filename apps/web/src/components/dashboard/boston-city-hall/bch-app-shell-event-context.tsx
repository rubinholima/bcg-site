"use client";

import { createContext, useContext } from "react";

type Ctx = {
  eventId: string | null;
  eventName: string | null;
  setEventName: (name: string | null) => void;
};

export const BchAppShellEventContext = createContext<Ctx>({
  eventId: null,
  eventName: null,
  setEventName: () => {},
});

export function useBchAppShellEvent() {
  return useContext(BchAppShellEventContext);
}
