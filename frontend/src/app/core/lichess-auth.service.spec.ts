import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { LichessAuthService } from './lichess-auth.service';

describe('LichessAuthService', () => {
  let service: LichessAuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LichessAuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('starts disconnected', () => {
    expect(service.connected()).toBe(false);
    expect(service.token()).toBeNull();
  });

  it('reads an existing token from sessionStorage', () => {
    sessionStorage.setItem('was.lichess.token', 'abc');
    const fresh = TestBed.runInInjectionContext(() => new LichessAuthService());
    expect(fresh.connected()).toBe(true);
    expect(fresh.token()).toBe('abc');
  });

  it('exchanges the code for a token on a valid callback', () => {
    sessionStorage.setItem('was.lichess.pkce.state', 'st4te');
    sessionStorage.setItem('was.lichess.pkce.verifier', 'verifier123');

    let token: string | null = null;
    service.handleCallback('the-code', 'st4te').subscribe((t) => (token = t));

    const req = httpMock.expectOne('https://lichess.org/api/token');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toContain('code=the-code');
    expect(req.request.body).toContain('code_verifier=verifier123');
    req.flush({ access_token: 'tok-xyz' });

    expect(token).toBe('tok-xyz');
    expect(service.connected()).toBe(true);
    expect(sessionStorage.getItem('was.lichess.pkce.verifier')).toBeNull();
  });

  it('rejects a callback with a mismatched state without calling the API', () => {
    sessionStorage.setItem('was.lichess.pkce.state', 'expected');
    sessionStorage.setItem('was.lichess.pkce.verifier', 'v');
    let errored = false;
    service.handleCallback('code', 'WRONG').subscribe({ error: () => (errored = true) });
    httpMock.expectNone('https://lichess.org/api/token');
    expect(errored).toBe(true);
  });

  it('disconnect clears the token', () => {
    sessionStorage.setItem('was.lichess.token', 'abc');
    const fresh = TestBed.runInInjectionContext(() => new LichessAuthService());
    fresh.disconnect();
    expect(fresh.connected()).toBe(false);
    expect(sessionStorage.getItem('was.lichess.token')).toBeNull();
  });

  it('consumeReturnTo returns and clears the stored path', () => {
    sessionStorage.setItem('was.lichess.returnTo', '/studies/import-lichess?studyId=3');
    expect(service.consumeReturnTo()).toBe('/studies/import-lichess?studyId=3');
    expect(service.consumeReturnTo()).toBe('/studies/import-lichess'); // default dopo il consumo
  });
});
