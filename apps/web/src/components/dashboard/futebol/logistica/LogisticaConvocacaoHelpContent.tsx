"use client";

/** Texto de ajuda — só em client (evita passar conteúdo complexo de RSC). */
export function LogisticaConvocacaoHelpContent() {
  return (
    <>
      <p>
        Escolha o <strong className="text-foreground">clube</strong> e o{" "}
        <strong className="text-foreground">jogo da agenda</strong> ou um registro de viagem já
        existente.
      </p>
      <p>
        Se ainda não houver registro para o jogo, um planejamento mínimo é criado automaticamente
        para você marcar os convocados.
      </p>
      <p>
        Marque <strong className="text-foreground">atletas</strong> e{" "}
        <strong className="text-foreground">comissão técnica</strong>, depois clique em{" "}
        <strong className="text-foreground">Salvar convocação</strong>.
      </p>
      <p>
        Em <strong className="text-foreground">jogos em casa</strong> não há pessoas autorizadas nem
        relatório de passageiros — só elenco e comissão.
      </p>
      <p>
        Em jogos <strong className="text-foreground">fora</strong>, você pode incluir pessoas
        autorizadas cadastradas em Logística → Cadastros → Pessoas autorizadas.
      </p>
    </>
  );
}
