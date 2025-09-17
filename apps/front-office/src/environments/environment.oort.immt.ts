import { AuthConfig } from 'angular-oauth2-oidc';
import { theme } from '../themes/oort/oort.prod';
import { sharedEnvironment } from './environment.shared';
import { Environment } from './environment.type';

/**
 * Authentication configuration
 */
const authConfig: AuthConfig = {
  issuer:
    'https://login.microsoftonline.com/1d4fae52-39b3-4bfa-b0b3-022956b11194/v2.0',
  redirectUri: 'https://pubplanner.unesco.org/',
  postLogoutRedirectUri: 'https://pubplanner.unesco.org/auth/',
  clientId: '669f2d37-7391-4484-a3c1-8403f369eee8',
  scope: 'openid profile email offline_access',
  responseType: 'code',
  showDebugInformation: true,
  strictDiscoveryDocumentValidation: false,
};

/**
 * Environment file for local development.
 */
export const environment: Environment = {
  ...sharedEnvironment,
  production: true,
  apiUrl: 'https://pubplanner.unesco.org/api',
  subscriptionApiUrl: 'wss://pubplanner.unesco.org/api',
  frontOfficeUri: 'https://pubplanner.unesco.org',
  backOfficeUri: 'https://pubplanner.unesco.org/admin/',
  availableLanguages: ['en', 'fr'],
  authConfig,
  theme,
};
