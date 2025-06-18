import type { OpenAPI, OpenAPIV3 } from 'openapi-types';

export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head' | 'trace';

export type OutputFormat = 'json' | 'yaml' | 'xml' | 'markdown';

export type FilterPatterns = {
  include?: string[];
  exclude?: string[];
};

export interface FilterOptions {
  paths?: FilterPatterns;
  tags?: FilterPatterns;
  operationIds?: FilterPatterns;
  methods?: HttpMethod[];
  includeDeprecated?: boolean;
}

export interface TransformOptions {
  maxDepth?: number;
  removeExamples?: boolean;
  removeDescriptions?: boolean;
  removeSummaries?: boolean;
  includeServers?: boolean;
  includeInfo?: boolean;
  includeSchemas?: boolean;
  includeRequestBodies?: boolean;
  includeResponses?: boolean;
}

export type Source =
  | {
      type: 'local' | 'remote';
      path: string;
      content?: undefined;
    }
  | {
      type: 'memory';
      path: string; // for determining parser, e.g., 'spec.json'
      content: string;
    };

export interface ExtractorConfig {
  source: Source;
  output: {
    format: OutputFormat;
    destination?: string;
  };
  filter?: FilterOptions;
  transform?: TransformOptions;
  validation?: {
    strict: boolean;
    ignoreErrors?: string[];
  };
}

export interface SpecStats {
  paths: number;
  operations: number;
  schemas: number;
  charCount: number;
  lineCount: number;
  tokenCount: number;
}

export interface OpenAPIExtractorResult {
  success: boolean;
  data?: OpenAPI.Document | string;
  stats?: {
    before: SpecStats;
    after: SpecStats;
  };
  warnings?: string[];
  errors?: string[];
}

export type SchemaTransformer = (
  schema: OpenAPIV3.SchemaObject,
) => OpenAPIV3.SchemaObject;