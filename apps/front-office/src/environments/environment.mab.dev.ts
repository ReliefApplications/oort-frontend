import { AuthConfig } from 'angular-oauth2-oidc';
import { theme } from '../themes/oort/oort.prod';
import { sharedEnvironment } from './environment.shared';
import { Environment } from './environment.type';

/**
 * Authentication configuration
 */
const authConfig: AuthConfig = {
  issuer: 'https://id-mab.unesco.oortcloud.tech/realms/oort',
  redirectUri: 'https://oort-dev.oortcloud.tech/',
  postLogoutRedirectUri: 'https://oort-dev.oortcloud.tech/auth/',
  clientId: 'mab-client',
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
  apiUrl: 'https://oort-dev.oortcloud.tech/api',
  subscriptionApiUrl: 'wss://oort-dev.oortcloud.tech/api',
  frontOfficeUri: 'https://oort-dev.oortcloud.tech',
  backOfficeUri: 'https://oort-dev.oortcloud.tech/admin/',
  availableLanguages: ['en', 'fr'],
  authConfig,
  theme,
  user: {
    attributes: ['country'],
  },
};
