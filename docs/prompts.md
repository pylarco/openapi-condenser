
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

-------------------------------

   1. FE: tooltip hover should be on top layer above right side content
   2. FE: performance is so slow and lagging even on changing toggle
   3. FE: should auto fullscreen while user scrolling down at lines more than 100
   4. stats is not accurate like not working at all especially on markdown mode



--------------------------------


   The output of markdown and YAML format should be like this  concise, YAML-like format designed to maximize information density for an LLM's context window. This format removes boilerplate language and uses structure to convey meaning efficiently.

This version uses single-letter keys for brevity and removes redundant keywords.

-   **`METHOD /path`**: The endpoint itself.
-   **`D`**: Description.
-   **`P`**: Parameters (URL path, query).
-   **`B`**: Request Body (`content-type -> SchemaName`).
-   **`R`**: Response (`HTTP_STATUS: content-type -> SchemaName`).
-   Content types are shortened (e.g., `json`, `form-data`).

---

### Endpoint Snippets (Revised Format)

```

GET /health
D: Check health and optionally launch the channel.
P:
  - wakeup: boolean (query, optional) - If false, the channel will not launch.
  - platform: string (query, optional) - e.g., 'Safari,Windows,10.0.19044'.
  - channel_type: string (query, optional) - 'Web' or 'Mobile'.
R:
  200: json -> Health
  500: json -> ResponseError
```

```

PATCH /settings
D: Update channel settings. Fields not present in the request are unchanged.
B: json -> Settings
R:
  200: json -> UpdateSettings
  400: json -> ResponseError
  500: json -> ResponseError
```

```

POST /messages/image
D: Send an image message to a contact or group.
B:
  - json -> SenderImage
  - form-data -> SenderImage
R:
  200: json -> SentMessage
  400, 401, 402, 403, 404, 413, 415, 429, 500: json -> ResponseError
```

---

### Schema Snippets 

Here are examples of how schemas could be represented. This format uses indentation for nested objects to maintain structure clearly and concisely.

```

SCHEMA: ResponseError
PROPS:
  - error: object (required)
    - code: integer (required) - Whapi error code.
    - message: string (required) - Error message.
    - details: string (optional) - Error details.
```

```

SCHEMA: Settings
PROPS:
  - callback_backoff_delay_ms: number - Backoff delay for a failed callback (ms).
  - webhooks: array<Webhook>
  - proxy: string - Socks5 proxy URL for the connection.
  - media: object
    - auto_download: array<string> - Media types to automatically download.
```

```

SCHEMA: Message
PROPS:
  - id: string (required) - Message ID.
  - type: MessageType (required) - e.g., 'text', 'image'.
  - chat_id: string (required) - ID of the chat.
  - from_me: boolean (required) - True if sent by the authenticated user.
  - timestamp: number (required) - UNIX timestamp.
  - text: MessageContentText (optional)
  - image: MessageContentImage (optional)
  - context: object (optional)
    - quoted_id: string - ID of the message being replied to.
  - reactions: array<MessageReaction> (optional)
```



------------------------------

fix bug

1. the program doesnt work when rechanging transformation config from frontend after previous transformation.
2. the fullscreen should be triggered at scroll down of code output. not directly after processed.
3. the condense button is hidden at bottom viewport cannot be scrolled while on long code output.
4. the action button should active after data ready.

--------------------

full
  "include": [
    "src",
    "index.html",
    "tsconfig.json",
    "package.json",
    "vite.config.ts"
  ],

-------------------

1. fullscreen should be real code editor fullscreen. also no overlapping scrollables
2. bug: make the toggle clickable, and animated

------------------

fix test and linter

-------------------

make the algorithm efficient but effective to be running in serverless for cost. do it without features break

-------------------

1. bug: clicking toggle not reacting, also no animation
2. the body panels looks faded, I believe something to do with opacity in motion.reuse.tsx

---------------------

prepare the project so that ready to deploy to wrangler cloudflare worker. along with backend, frontend

------------------


I think, all non cloudflare worker environment apis is not working, here the browser console log
:5173/api/condense:1

Generated code
Failed to load resource: the server responded with a status of 400 (Bad Request)