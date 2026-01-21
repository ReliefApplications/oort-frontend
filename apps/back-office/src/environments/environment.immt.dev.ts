import { AuthConfig } from 'angular-oauth2-oidc';
import { theme } from '../themes/oort/oort.prod';
import { sharedEnvironment } from './environment.shared';
import { Environment } from './environment.type';

/**
 * Authentication configuration
 */
const authConfig: AuthConfig = {
  issuer: 'https://id-mab.unesco.oortcloud.tech/realms/oort',
  redirectUri: 'https://dev.pubplanner.oortcloud.tech/admin/',
  postLogoutRedirectUri: 'https://dev.pubplanner.oortcloud.tech/admin/auth/',
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
  apiUrl: 'https://dev.pubplanner.oortcloud.tech/api',
  subscriptionApiUrl: 'wss://dev.pubplanner.oortcloud.tech/api',
  frontOfficeUri: 'https://dev.pubplanner.oortcloud.tech',
  backOfficeUri: 'https://dev.pubplanner.oortcloud.tech/admin/',
  availableLanguages: ['en', 'fr'],
  defaultIntlLocale: 'fr',
  authConfig,
  theme,
  user: { attributes: ['unescoSector', 'unescoMajorProgramme'] },
  availableWidgets: [
    'form',
    'donut-chart',
    'line-chart',
    'bar-chart',
    'column-chart',
    'pie-chart',
    'grid',
    'text',
    'map',
    'summaryCard',
    'tabs',
  ],
};
