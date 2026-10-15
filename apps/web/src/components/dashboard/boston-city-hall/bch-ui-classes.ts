/** Classes compartilhadas — linguagem visual BCH (navy + gold). */
export const BCH_MODULE_SCOPE =
  "bch-module text-slate-200 [&_.text-muted-foreground]:text-slate-400 [&_.border-border]:border-slate-800/75";

export const BCH_CARD =
  "rounded-xl border border-slate-800/80 bg-[#0c1222]/55 p-4 sm:p-5 shadow-sm";

export const BCH_TABLE_WRAP = "overflow-x-auto rounded-lg border border-slate-800/80";

export const BCH_BTN_PRIMARY =
  "bg-amber-600 text-white hover:bg-amber-500 focus-visible:ring-amber-500/40";

export const BCH_BTN_SECONDARY =
  "border-slate-700 bg-slate-900/40 text-slate-100 hover:bg-slate-800/60";

export const BCH_INPUT =
  "border-slate-700 bg-slate-950/50 text-foreground placeholder:text-slate-500";

/**
 * Região de conteúdo BCH — centralizada, margens do shell + largura máxima confortável
 * (caixas proporcionais; não full-bleed nem coluna estreita).
 */
export const BCH_CONTENT_REGION = "mx-auto w-full min-w-0 max-w-[72rem]";

/** Container de página BCH — use via BchPageShell. */
export const BCH_PAGE_SHELL = `${BCH_CONTENT_REGION} space-y-4 pb-8 sm:space-y-5`;

/** @deprecated Use BCH_PAGE_SHELL */
export const BCH_EVENT_WORKSPACE_SHELL = BCH_PAGE_SHELL;
export const BCH_WORKSPACE_CONTENT = BCH_PAGE_SHELL;

export type BchDialogSize = "sm" | "md" | "lg" | "xl";

/** Shell base dos dialogs BCH — header/body/footer com scroll no body. */
export const BCH_DIALOG_SHELL =
  "flex max-h-[min(90dvh,820px)] flex-col gap-0 overflow-hidden border-slate-800 bg-[#0a0f1a] p-0 text-slate-100";

export const BCH_DIALOG_HEADER = "shrink-0 space-y-1 px-6 pt-6 pb-2 text-left";
export const BCH_DIALOG_BODY = "min-h-0 flex-1 overflow-y-auto px-6 py-4";
export const BCH_DIALOG_FOOTER =
  "shrink-0 gap-2 border-t border-slate-800/80 px-6 py-4 sm:flex-row sm:justify-end";

/** Legado — preferir BchDialogContent com size sm|md|lg|xl */
export const BCH_DIALOG_CONTENT =
  "max-h-[min(90dvh,720px)] max-w-[min(100vw-2rem,42rem)] overflow-y-auto border-slate-800 bg-[#0a0f1a] text-slate-100";

/** Moeda operacional padrão BCH (novos registros). */
export const BCH_DEFAULT_CURRENCY = "BRL";
