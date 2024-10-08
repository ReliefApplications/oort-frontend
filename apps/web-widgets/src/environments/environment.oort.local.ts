import { AuthConfig } from 'angular-oauth2-oidc';
import { theme } from '../themes/default';
import { sharedEnvironment } from './environment.shared';

/** Authentication configuration */
const authConfig: AuthConfig = {
  issuer: 'https://id-dev.oortcloud.tech/realms/oort',
  redirectUri: 'http://localhost:4200/',
  postLogoutRedirectUri: 'http://localhost:4200/auth/',
  clientId: 'oort-client',
  scope: 'openid profile email offline_access',
  responseType: 'code',
  showDebugInformation: true,
};

/**
 * Environment file for local development.
 */
export const environment = {
  ...sharedEnvironment,
  production: true,
  apiUrl: 'https://oort-dev.oortcloud.tech/api',
  subscriptionApiUrl: 'wss://oort-dev.oortcloud.tech/api',
  // apiUrl: 'http://localhost:3000',
  // subscriptionApiUrl: 'ws://localhost:3000',
  frontOfficeUri: 'http://localhost:4200/',
  backOfficeUri: 'http://localhost:4200/',
  module: 'widgets',
  availableLanguages: ['en', 'test'],
  authConfig,
  theme,
  tinymceBaseUrl: 'https://oort-dev.oortcloud.tech/tinymce',
  i18nUrl: 'https://oort-dev.oortcloud.tech/assets/i18n/',
};
