/**
 * Variáveis de ambiente usadas pelo app.
 * Garante tipagem para NEXT_PUBLIC_* (Next.js expõe em build/runtime).
 * Definir em .env.local ou no ambiente de produção.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_COGNITO_DOMAIN?: string;
    NEXT_PUBLIC_COGNITO_CLIENT_ID?: string;
    NEXT_PUBLIC_COGNITO_SCOPES?: string;
    NEXT_PUBLIC_APP_URL?: string;
    NEXT_PUBLIC_MEDIA_ORIGIN?: string;
    COGNITO_DOMAIN?: string;
    COGNITO_CLIENT_ID?: string;
    COGNITO_SCOPE?: string;
    COGNITO_SCOPES?: string;
    COGNITO_RESPONSE_TYPE?: string;
  }
}
