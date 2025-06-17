/**
 * Format data as JSON
 */
export const formatAsJson = (data: any): string => {
  return JSON.stringify(data, null, 2);
}; 