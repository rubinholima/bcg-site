import { redirect } from "next/navigation";

/**
 * Login agora é em /login (email/senha). Redireciona.
 */
export default function AuthCallbackPage() {
  redirect("/login");
}
