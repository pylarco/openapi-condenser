export type OutputFormat = 'json' | 'yaml' | 'xml' | 'markdown';

export type FilterOptions = {
  paths?: string[] | RegExp;
  tags?: string[] | RegExp;
  methods?: ('get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head')[];
  includeDeprecated?: boolean;
};

export type TransformOptions = {
  maxDepth?: number;
  removeExamples?: boolean;
  removeDescriptions?: boolean;
  includeServers?: boolean;
  includeInfo?: boolean;
};

export type ExtractorConfig = {
  source: {
    type: 'local' | 'remote';
    path: string;
  };
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
};

export type OpenAPIExtractorResult = {
  success: boolean;
  data?: any;
  warnings?: string[];
  errors?: string[];
};

export type SchemaTransformer = (schema: any) => any; 