import { AuthConfig } from 'angular-oauth2-oidc';
import { theme } from '../themes/oort/oort.prod';
import { sharedEnvironment } from './environment.shared';
import { Environment } from './environment.type';

/**
 * Authentication configuration
 */
const authConfig: AuthConfig = {
  issuer: 'https://id-mab.unesco.oortcloud.tech/realms/oort',
  redirectUri: 'https://v1.pubplanner.oortcloud.tech/',
  postLogoutRedirectUri: 'https://v1.pubplanner.oortcloud.tech/auth/',
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
  apiUrl: 'https://v1.pubplanner.oortcloud.tech/api',
  subscriptionApiUrl: 'wss://v1.pubplanner.oortcloud.tech/api',
  frontOfficeUri: 'https://v1.pubplanner.oortcloud.tech',
  backOfficeUri: 'https://v1.pubplanner.oortcloud.tech/admin/',
  availableLanguages: ['en', 'fr'],
  defaultIntlLocale: 'fr',
  authConfig,
  theme,
  user: { attributes: ['unescoSector', 'unescoMajorProgramme'] },
};
