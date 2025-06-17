export type HttpMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace';

export interface FilterOptions {
  paths?: {
    include?: string[];
    exclude?: string[];
  };
  tags?: {
    include?: string[];
    exclude?: string[];
  };
  methods?: HttpMethod[];
  includeDeprecated?: boolean;
}

export interface TransformOptions {
  removeExamples?: boolean;
  removeDescriptions?: boolean;
  removeSummaries?: boolean;
  includeServers?: boolean;
  includeInfo?: boolean;
  includeSchemas?: boolean;
  includeRequestBodies?: boolean;
  includeResponses?: boolean;
}

export type OutputFormat = 'json' | 'yaml' | 'xml' | 'markdown';

export interface SpecStats {
  paths: number;
  operations: number;
  schemas: number;
  charCount: number;
  lineCount: number;
  tokenCount: number;
}