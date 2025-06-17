
-------------------------------------

for web interface llms

Code changes rules 

1. make sure to isolate every files code block with ```typescript // {filePath} ...{content} ```
2. only write new/affected files changes of a codebase. ignore unnaffected
3. Always write full source code per file
4. if you need to delete file, use ```typescript // {filePath} ↵ //TODO: delete this file ```

------------------------------------

I need to create a Bun program that helps process large OpenAPI specification files (either local or remote openapi.yaml/json) which can be too large for LLMs to handle effectively. The program should:

1. ✅ Extract and transform specific API endpoint metadata including:
   - ✅ Path definitions
   - ✅ Request/response schemas
   - ✅ Parameters
   - ✅ Examples
   - ✅ Security requirements
   - ✅ Tags and descriptions

2. ✅ Provide highly configurable extraction capabilities through:
   - ✅ A TypeScript config file (openapi-extractor.config.ts) with options for:
     * ✅ Filtering by paths/tags/methods/metadata
     * ✅ Custom schema transformations
     * ✅ Output formatting
     * ✅ Depth of extraction
     * ✅ Source location (local file path or remote URL)
   - ✅ Command line arguments that override config file settings
   - ✅ Environment variable support

3. ✅ Support multiple output formats:
   - ✅ XML
   - ✅ Markdown documentation

4. ✅ Include validation and error handling for:
   - ✅ Malformed OpenAPI specs (both local and remote)
   - ✅ Invalid configurations
   - ✅ Missing required fields
   - ✅ Network errors when fetching remote specs



--------------------------------

that tool purpose is to condense large openapi for LLM to digest & understand the whole context. beside the tool can be used by developer. above tool should also can be used by general user. so please create the frontend using react, vite, cdn tailwind, elysiajs + eden treaty. make sure the UI is amazingly beautiful and the UX is so cohesive.

--------------------------------

do @iterate.mdc on fixing `bun tsc -b -noEmit` problems while following rule @elysia.rule.mdc  .. also make sure bun dev runs well

-------------------------------

the project is not production ready yet, as;

1. no useful (before-after stats) both in BE FE
2. FE: no comprehensive state handling like after file selected etc
3. FE: no remote file by url options
4. FE: fullscreenable in input spec and output. and downloadable output
5. FE: no tooltip on each configs to show examples on hover 
6. FE: need cool loading
7. FE BE: need elysia swagger plugin so user from frontend can navigate to the swagger page also.