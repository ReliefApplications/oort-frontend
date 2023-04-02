import { AuthConfig } from 'angular-oauth2-oidc';
import { theme } from '../themes/default/default.dev';
import { sharedEnvironment } from './environment.shared';

/** Authentication configuration of the module. */
const authConfig: AuthConfig = {
  issuer:
    'https://login.microsoftonline.com/f610c0b7-bd24-4b39-810b-3dc280afb590/v2.0',
  redirectUri: 'https://ems-safe-dev.who.int/',
  postLogoutRedirectUri: 'https://ems-safe-dev.who.int/auth',
  clientId: '021202ac-d23b-4757-83e3-f6ecde12266b',
  scope: 'openid profile email offline_access',
  responseType: 'code',
  showDebugInformation: true,
  strictDiscoveryDocumentValidation: false,
};

/** Environment configuration */
export const environment = {
  ...sharedEnvironment,
  production: true,
  apiUrl: 'https://ems-safe-dev.who.int/api',
  subscriptionApiUrl: 'wss://ems-safe-dev.who.int/api',
  frontOfficeUri: 'https://ems-safe-dev.who.int/',
  backOfficeUri: 'https://ems-safe-dev.who.int/backoffice/',
  availableLanguages: ['en'],
  authConfig,
  theme,
};
