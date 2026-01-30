# Módulos do dashboard

O menu do dashboard e o acesso às páginas são controlados por **módulos** e **permissões por perfil** (super_admin, company_admin, editor).

## Onde as permissões são definidas

- **Configurações → Módulos** (apenas super admin): lista todos os módulos e permite marcar se **Company Admin** e **Editor** podem acessar cada um. Super admin sempre tem acesso a todos.

## Todo novo módulo deve aparecer nessa tela

Sempre que um **novo módulo** for criado no dashboard (nova página no menu), ele precisa ser cadastrado no backend para aparecer em **Configurações → Módulos** e ter suas permissões definidas. Caso contrário, o módulo não aparecerá no menu para ninguém (o menu é montado a partir da API `/me/modules`).

### Como adicionar um novo módulo

1. **Backend (Prisma)**  
   - Inserir um novo registro na tabela **Module** (slug, name, sortOrder).  
   - Inserir os registros em **ModuleRole** para cada perfil que pode acessar (super_admin, company_admin, editor) com `canAccess: true` ou `false` conforme o padrão desejado.

2. **Migration ou seed**  
   - Criar uma migration que faz os `INSERT` em `Module` e `ModuleRole`, ou rodar um script de seed.  
   - Exemplo de slug: `meu_modulo` (usado na API e no front para filtrar o menu).

3. **Frontend (sidebar)**  
   - Adicionar o item no array `menuItems` em `components/dashboard/sidebar.tsx` com o mesmo **moduleSlug** usado no backend (ex.: `moduleSlug: "meu_modulo"`).  
   - A rota da página (ex.: `/dashboard/meu-modulo`) deve existir em `app/dashboard/`.

4. **Proteção da página**  
   - Na página do módulo, usar `canAccessModule("meu_modulo")` (do `useAuth()`) e redirecionar para `/403` se o usuário não tiver acesso.

Após isso, o novo módulo passa a aparecer em **Configurações → Módulos** e o super admin pode definir se Company Admin e Editor podem acessá-lo.
