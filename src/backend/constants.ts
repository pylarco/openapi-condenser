export const contentTypeMappings: ReadonlyArray<[string, string]> = [
    ['json', 'json'],
    ['form-data', 'form-data'],
    ['x-www-form-urlencoded', 'form-urlencoded'],
    ['xml', 'xml'],
    ['text/plain', 'text'],
];

export const DEFAULT_CONFIG_PATH = './openapi-condenser.config.ts';
export const TOKEN_CHAR_RATIO = 4;
export const USER_AGENT = 'OpenAPI-Condenser/1.0';