/**
 * Environment file of uat platform.
 */
export const environment = {
    production: true,
    apiUrl: 'https://ems-safe-test.who.int/api',
    subscriptionApiUrl: 'wss://ems-safe-test.who.int/api',
    clientId: '021202ac-d23b-4757-83e3-f6ecde12266b',
    authority: 'https://login.microsoftonline.com/f610c0b7-bd24-4b39-810b-3dc280afb590',
    redirectUrl: 'https://ems-safe-test.who.int',
    postLogoutRedirectUri: 'https://ems-safe-test.who.int/auth',
    frontOfficeUri: 'https://ems-safe-test.who.int/',
    backOfficeUri: 'https://ems-safe-test.who.int/backoffice/',
    module: 'frontoffice'
};
