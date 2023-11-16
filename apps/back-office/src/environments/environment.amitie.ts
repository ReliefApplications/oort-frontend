import { AuthConfig } from 'angular-oauth2-oidc';
import { theme } from '../themes/amitie/amitie.prod';
import { sharedEnvironment } from './environment.shared';
import { Environment } from './environment.type';

/**
 * Authentication configuration
 */
const authConfig: AuthConfig = {
  issuer: 'https://id.amitie-admin.com/auth/realms/oort',
  redirectUri: 'https://amitie-admin.com/admin/',
  postLogoutRedirectUri: 'https://amitie-admin.com/admin/auth/',
  clientId: 'oort-client',
  scope: 'openid profile email offline_access',
  responseType: 'code',
  showDebugInformation: false,
};

/**
 * Environment file for local development.
 */
export const environment: Environment = {
  ...sharedEnvironment,
  production: true,
  apiUrl: 'https://amitie-admin.com/api',
  subscriptionApiUrl: 'wss://amitie-admin.com/api',
  frontOfficeUri: 'https://amitie-admin.com',
  backOfficeUri: 'https://amitie-admin.com/admin/',
  module: 'backoffice',
  availableLanguages: ['en'],
  authConfig,
  esriApiKey:
    'AAPKf2bae9b3f32943e2a8d58b0b96ffea3fj8Vt8JYDt1omhzN_lONXPRHN8B89umU-pA9t7ze1rfCIiiEVXizYEiFRFiVrl6wg',
  theme,
  availableWidgets: [
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
