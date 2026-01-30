import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import jwksClient, { JwksClient } from 'jwks-rsa';

export interface CognitoJwtPayload {
  sub: string;
  email?: string;
  name?: string;
  'cognito:groups'?: string[];
  token_use?: 'id' | 'access';
  iss?: string;
  aud?: string | string[];
  client_id?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

function getConfig() {
  const userPoolId = process.env.COGNITO_USER_POOL_ID ?? '';
  const clientId = process.env.COGNITO_CLIENT_ID ?? '';
  const region = process.env.AWS_REGION ?? 'us-east-1';
  const jwksUri = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
  const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
  return { userPoolId, clientId, jwksUri, issuer };
}

let cachedClient: JwksClient | null = null;
let cachedJwksUri = '';

function getJwksClient(jwksUri: string): JwksClient {
  if (cachedClient && cachedJwksUri === jwksUri) return cachedClient;
  cachedJwksUri = jwksUri;
  cachedClient = jwksClient({
    jwksUri,
    cache: true,
    cacheMaxAge: 600000,
  });
  return cachedClient;
}

function getKey(header: jwt.JwtHeader, jwksUri: string): Promise<string | Buffer> {
  const client = getJwksClient(jwksUri);
  return new Promise((resolve, reject) => {
    if (!header.kid) {
      return reject(new Error('JWT header missing kid'));
    }
    client.getSigningKey(header.kid, (err, key) => {
      if (err) return reject(err);
      if (!key) return reject(new Error('Signing key not found'));
      resolve(key.getPublicKey());
    });
  });
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = getConfig();
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);
    if (!config.userPoolId || !config.clientId) {
      throw new UnauthorizedException('Cognito not configured');
    }

    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded?.header?.kid) {
        throw new UnauthorizedException('Invalid token');
      }
      const payloadDecoded = decoded && typeof decoded === 'object' && 'payload' in decoded ? (decoded as { payload: CognitoJwtPayload }).payload : null;
      const tokenIss = payloadDecoded?.iss;
      // Usa o issuer do próprio token para JWKS (evita erro de casing: Cognito usa us-east-1_Etlo1rsA7, .env pode ter EtIo1rsA7)
      const jwksUri = tokenIss && tokenIss.startsWith('https://cognito-idp.') ? `${tokenIss}/.well-known/jwks.json` : config.jwksUri;

      const key = await getKey(decoded.header as jwt.JwtHeader, jwksUri);
      const issuer = tokenIss ?? config.issuer;
      const payload = jwt.verify(token, key, {
        algorithms: ['RS256'],
        clockTolerance: 120,
        issuer,
      }) as CognitoJwtPayload;

      const tokenUse = payload.token_use;
      if (tokenUse === 'id') {
        const aud = payload.aud;
        if (aud !== undefined) {
          const validAud = Array.isArray(aud) ? aud.includes(config.clientId) : aud === config.clientId;
          if (!validAud) {
            console.error('[JwtAuthGuard] id_token aud mismatch. Expected:', config.clientId, 'got:', aud);
            throw new UnauthorizedException('Invalid token audience');
          }
        }
      }
      if (tokenUse === 'access') {
        const tokenClientId = payload.client_id as string | undefined;
        if (tokenClientId !== undefined && tokenClientId !== config.clientId) {
          console.error('[JwtAuthGuard] access_token client_id mismatch. Expected:', config.clientId, 'got:', tokenClientId);
          throw new UnauthorizedException('Invalid token client_id');
        }
      }

      (request as Request & { user: CognitoJwtPayload }).user = payload;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      // Decodifica sem verificar para logar iss/exp (debug)
      const decoded = jwt.decode(token, { complete: true });
      const decodedObj = decoded && typeof decoded === 'object' && 'payload' in decoded ? decoded : null;
      const payload = decodedObj && typeof decodedObj === 'object' && 'payload' in decodedObj ? (decodedObj as { payload: { iss?: string; exp?: number } }).payload : null;
      console.error('[JwtAuthGuard] Token verification failed:', message);
      if (payload) {
        console.error('[JwtAuthGuard] Token iss:', payload.iss, 'expected:', config.issuer, 'exp:', payload.exp);
      }
      // "Not Found" = JWKS 404 ou signing key não encontrada
      if (message === 'Not Found' || message.includes('404') || message === 'Signing key not found') {
        console.error('[JwtAuthGuard] JWKS URL:', config.jwksUri);
      }
      throw new UnauthorizedException('Invalid token');
    }
  }
}
