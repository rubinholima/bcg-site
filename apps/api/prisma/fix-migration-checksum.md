# Corrigir migration "modified after applied"

A migration `20260127200000_add_tenant_kind_and_location` foi recriada (o arquivo original foi perdido).
Para o Prisma parar de acusar "modified after applied" **sem fazer reset** do banco:

1. **Remover o registro da migration** na tabela do Prisma (no PostgreSQL):

   ```sql
   DELETE FROM "_prisma_migrations"
   WHERE migration_name = '20260127200000_add_tenant_kind_and_location';
   ```

2. **Marcar a migration como aplicada** com o conteúdo atual do arquivo:

   ```bash
   npx prisma migrate resolve --applied 20260127200000_add_tenant_kind_and_location
   ```

3. Rodar de novo:

   ```bash
   npx prisma migrate dev
   ```

Assim o Prisma passa a considerar essa migration aplicada com o checksum do arquivo atual e o drift some (o arquivo já foi ajustado para `kindId` NOT NULL).
