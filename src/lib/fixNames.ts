/** Corrects known name misspellings in any string from the DB */
export function fixName(value: string): string {
  return value.replace(/Constantito/g, 'Constantino');
}
