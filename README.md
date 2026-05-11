# Project Documentation System

Reusable Node.js documentation server for project Markdown files and OpenAPI/Swagger specifications.

## Install

```bash
npm install --save-dev project-documentation
```

## Usage

Add a script to the consuming project:

```json
{
  "scripts": {
    "docs": "project-documentation docs/"
  }
}
```

Run:

```bash
npm run docs
```

The server tries port `4201` first. If it is unavailable, it tries ports from `33000` to `33999` and prints the selected URL in the console.

## Documentation layout

```text
docs/
├── md
│   ├── index.md
│   └── introduction.md
└── openapi
    ├── openapi.yaml
    └── users.yaml
```

## Routes

- `/` - Redoc page for `/openapi/openapi.yaml`
- `/swagger.html` - Swagger UI for `/openapi/openapi.yaml`
- `/oauth2-redirect.html` - Swagger OAuth redirect page
- `/md/<file>.md` - renders Markdown files as styled HTML
- `/openapi/<name>` - Redoc page for a spec under `docs/openapi`
- `/openapi/<name>?swagger` - Swagger UI for a spec
- `/openapi/<name>.yaml` - processed OpenAPI YAML output

OpenAPI files can be YAML or JSON. Specifications are processed with `@apidevtools/swagger-parser`, so local `$ref` dependencies are bundled before being returned.

## Development

```bash
npm install
npm test
```
