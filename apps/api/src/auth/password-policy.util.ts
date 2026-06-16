export function validatePlatformPassword(password: string): string | null {
  if (!password || password.length < 8) {
    return 'Nova senha deve ter no mínimo 8 caracteres';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Nova senha deve ter pelo menos 1 letra maiúscula';
  }
  if (!/[a-z]/.test(password)) {
    return 'Nova senha deve ter pelo menos 1 letra minúscula';
  }
  if (!/[0-9]/.test(password)) {
    return 'Nova senha deve ter pelo menos 1 número';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Nova senha deve ter pelo menos 1 caractere especial';
  }
  return null;
}
