import { AuthConfig } from 'angular-oauth2-oidc';
import { theme } from '../themes/oort/oort.prod';
import { sharedEnvironment } from './environment.shared';
import { Environment } from './environment.type';

/**
 * Authentication configuration
 */
const authConfig: AuthConfig = {
  issuer: 'https://id-mab.unesco.oortcloud.tech/realms/oort',
  redirectUri: 'https://immt.unesco.oortcloud.tech/',
  postLogoutRedirectUri: 'https://immt.unesco.oortcloud.tech/auth/',
  clientId: 'immt-client',
  scope: 'openid profile email offline_access',
  responseType: 'code',
  showDebugInformation: true,
};

/**
 * Environment file for local development.
 */
export const environment: Environment = {
  ...sharedEnvironment,
  production: true,
  apiUrl: 'https://immt.unesco.oortcloud.tech/api',
  subscriptionApiUrl: 'wss://immt.unesco.oortcloud.tech/api',
  frontOfficeUri: 'https://immt.unesco.oortcloud.tech',
  backOfficeUri: 'https://immt.unesco.oortcloud.tech/admin/',
  availableLanguages: ['en', 'fr'],
  authConfig,
  theme,
};
