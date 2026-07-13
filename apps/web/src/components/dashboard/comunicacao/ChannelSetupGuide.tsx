import { Info } from "lucide-react";

/** Como empresa, departamento e números WhatsApp se conectam na plataforma. */
export function ChannelSetupGuide() {
  return (
    <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-4 text-sm text-muted-foreground">
      <p className="mb-2 flex items-center gap-2 font-medium text-foreground">
        <Info className="h-4 w-4 shrink-0 text-sky-500" />
        Como alinhar os números (WhatsApp Cloud API)
      </p>
      <ul className="list-inside list-disc space-y-1.5 text-xs sm:text-sm">
        <li>
          <strong className="text-foreground">Empresa / clube</strong> — escolha no filtro da página
          (Boston City FC USA, Brazil, Hall, etc.). É o <code className="text-foreground">Tenant</code> do
          Cup360.
        </li>
        <li>
          <strong className="text-foreground">Departamento / área</strong> — no cadastro do canal (Comercial,
          Marketing, Mídia…). Cada departamento pode ter um número WhatsApp próprio.
        </li>
        <li>
          <strong className="text-foreground">phone_number_id</strong> — ID do número no Meta Business
          (Configurações → WhatsApp → API). O webhook da BCG identifica qual departamento recebeu a mensagem
          por esse ID.
        </li>
        <li>
          <strong className="text-foreground">Número exibido</strong> — só referência visual (+1 617…).
        </li>
        <li>
          <strong className="text-foreground">Uma API, vários números</strong> — não precisa de app Meta
          separado por departamento. Um webhook (
          <code className="text-foreground">/api/comunicacao/webhooks/whatsapp</code>) e token de acesso
          (próxima fase) servem todos os números da mesma conta Business.
        </li>
      </ul>
    </div>
  );
}
