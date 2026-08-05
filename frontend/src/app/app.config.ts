import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // `withComponentInputBinding`: la `data` della route diventa input del
    // componente montato (ISSUE-021, nome della sezione del segnaposto).
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch())
  ]
};
