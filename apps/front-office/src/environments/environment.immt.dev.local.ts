import { AuthConfig } from 'angular-oauth2-oidc';
import { theme } from '../themes/oort/oort.prod';
import { sharedEnvironment } from './environment.shared';
import { Environment } from './environment.type';

/**
 * Authentication configuration
 */
const authConfig: AuthConfig = {
  issuer: 'https://id-mab.unesco.oortcloud.tech/realms/oort',
  redirectUri: 'http://localhost:4200/',
  postLogoutRedirectUri: 'http://localhost:4200/auth/',
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
  production: false,
  apiUrl: 'https://dev.pubplanner.oortcloud.tech/api',
  subscriptionApiUrl: 'wss://dev.pubplanner.oortcloud.tech/api',
  frontOfficeUri: 'http://localhost:4200/',
  backOfficeUri: 'http://localhost:4200/',
  availableLanguages: ['en', 'fr'],
  defaultIntlLocale: 'fr',
  authConfig,
  theme,
  user: { attributes: ['unescoSector', 'unescoMajorProgramme'] },
};
