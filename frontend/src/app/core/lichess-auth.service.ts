import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';

/**
 * Autorizzazione OAuth con Lichess per leggere studi **privati/unlisted**
 * (Prototipo 15). Usa il flusso **Authorization Code + PKCE** per client pubblici:
 * nessun client secret, nessuna registrazione preventiva (Lichess accetta un
 * `client_id` arbitrario per i client PKCE). Il token serve solo a leggere il PGN
 * degli studi; non introduce autenticazione applicativa e **non** viene persistito
 * lato backend — resta in `sessionStorage` del browser.
 */
const AUTH_URL = 'https://lichess.org/oauth';
const TOKEN_URL = 'https://lichess.org/api/token';
const CLIENT_ID = 'webapp-scacchi';
const SCOPE = 'study:read';

const TOKEN_KEY = 'was.lichess.token';
const VERIFIER_KEY = 'was.lichess.pkce.verifier';
const STATE_KEY = 'was.lichess.pkce.state';
const RETURN_KEY = 'was.lichess.returnTo';

@Injectable({ providedIn: 'root' })
export class LichessAuthService {
  private readonly http = inject(HttpClient);

  /** Access token Lichess corrente (solo in sessione), o null se non connesso. */
  readonly token = signal<string | null>(this.readStored(TOKEN_KEY));
  readonly connected = computed(() => this.token() !== null);

  /** Avvia il flusso OAuth: redirige a Lichess. `returnTo` è dove tornare dopo. */
  async connect(returnTo: string): Promise<void> {
    const verifier = randomString(48);
    const challenge = base64url(await sha256(verifier));
    const state = randomString(16);
    this.store(VERIFIER_KEY, verifier);
    this.store(STATE_KEY, state);
    this.store(RETURN_KEY, returnTo);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: this.redirectUri(),
      scope: SCOPE,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      state,
    });
    window.location.href = `${AUTH_URL}?${params.toString()}`;
  }

  /** Scambia il codice di autorizzazione con un access token (chiamato dal callback). */
  handleCallback(code: string, state: string): Observable<string> {
    const expectedState = this.readStored(STATE_KEY);
    const verifier = this.readStored(VERIFIER_KEY);
    if (!code || !expectedState || state !== expectedState || !verifier) {
      return throwError(() => new Error('Stato OAuth non valido o sessione scaduta.'));
    }
    const body = new HttpParams()
      .set('grant_type', 'authorization_code')
      .set('code', code)
      .set('code_verifier', verifier)
      .set('redirect_uri', this.redirectUri())
      .set('client_id', CLIENT_ID);

    return this.http
      .post<{ access_token: string }>(TOKEN_URL, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      .pipe(
        map((res) => {
          this.setToken(res.access_token);
          this.remove(VERIFIER_KEY);
          this.remove(STATE_KEY);
          return res.access_token;
        }),
      );
  }

  /** Percorso a cui tornare dopo il callback (consuma il valore memorizzato). */
  consumeReturnTo(): string {
    const value = this.readStored(RETURN_KEY) ?? '/studies/import-lichess';
    this.remove(RETURN_KEY);
    return value;
  }

  disconnect(): void {
    this.setToken(null);
  }

  private redirectUri(): string {
    return `${window.location.origin}/lichess/callback`;
  }

  private setToken(value: string | null): void {
    this.token.set(value);
    if (value) {
      this.store(TOKEN_KEY, value);
    } else {
      this.remove(TOKEN_KEY);
    }
  }

  private readStored(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private store(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // sessionStorage non disponibile: il flusso non potrà completarsi, ma non rompiamo.
    }
  }

  private remove(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

/** Stringa casuale base64url da byte sicuri (per verifier/state PKCE). */
function randomString(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return base64url(buf);
}

async function sha256(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(digest);
}

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
