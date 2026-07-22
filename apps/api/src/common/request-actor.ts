import { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { cadastroEmail, cadastroUpperRequired } from './cadastro-text';

/** Nome em maiúsculas e e-mail em minúsculas a partir do JWT. */
export function requestActor(user: CognitoJwtPayload) {
  const email = cadastroEmail(user.email as string);
  const rawName = (user.name as string)?.trim();
  const name = rawName
    ? cadastroUpperRequired(rawName)
    : email ?? cadastroUpperRequired('Usuário');
  return {
    userId: user.sub,
    name,
    email,
  };
}
