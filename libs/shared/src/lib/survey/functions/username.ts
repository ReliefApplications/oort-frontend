import { SurveyModel } from 'survey-core';
import { GlobalOptions } from '../types';

/**
 * Custom function to retrieve a the name of a user from the user id.
 *
 * @param this survey instance
 * @param this.survey survey instance
 * @param params params passed to the function
 * @returns The name of names of any users that match the user id.
 */
function username(this: { survey: SurveyModel }, params: any[]) {
  // If the flag is true-ish, we return the first element of the array
  const [users, flag] = params as [string | string[], boolean];
  const isArray = Array.isArray(users);

  const userIDs = isArray ? users : [users];
  const names = userIDs.map((userID) => {
    return this.survey.getVariable(`__USER_NAME.${userID}__`);
  });

  return !isArray || flag ? names[0] : names;
}

/**
 *  Generator for the custom function username.
 *
 * @param _ Global options
 * @returns The custom function username
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default (_: GlobalOptions) => username;
