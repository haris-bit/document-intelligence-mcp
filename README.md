# Document Intelligence MCP

A small MCP (Model Context Protocol) server that extracts text and structured data from documents (PDF, Word, Excel) and exposes a small set of tools over the MCP protocol.

## What this is

This repository implements `document-intelligence-mcp`, a lightweight MCP server written in TypeScript that runs over stdio. It provides tools to:

- Extract text from PDF files
- Extract raw text from Word (.docx) files
- Parse Excel (.xlsx, .xls) files into JSON sheets
- Provide a simple contract-analysis prompt wrapper for PDFs
- List files in a directory

The server is built with the @modelcontextprotocol SDK and uses `pdf2json`, `mammoth`, and `xlsx` for document parsing.

## Quick facts

- Language: TypeScript (ES Modules)
- Entry point (compiled): `dist/index.js`
- Dev/test documents: `test-documents/` (example files included)

## Prerequisites

- Node.js 18+ (for ESM and stable support)
- npm (or yarn)

## Install

Open a terminal in the project root and run:

```powershell
npm install
```

## Build

Compile TypeScript to JavaScript:

```powershell
npm run build
```

This produces `dist/index.js` which is the runnable server used by the package `bin` entry.

## Run

Run the compiled server (production):

```powershell
npm start
```

Run in development without building (requires `ts-node`):

```powershell
npx ts-node src/index.ts
```

When started the server connects to stdio and logs a message to stderr:

```
Document Intelligence MCP Server running on stdio
```

Note: The server is an MCP/stdio server. It expects MCP-compliant requests on stdin and writes responses to stdout. To exercise the tools programmatically, use an MCP client (for example using the `@modelcontextprotocol/sdk` client) or wire it into an environment that speaks MCP.

## Tools (available via MCP)

The server exposes the following tools (tool names and descriptions):

- `extract_document` — Extract text and structured content from a file. Supports `.pdf`, `.docx`, `.xlsx`, `.xls`.
- `analyze_contract` — Extract a PDF and append a contract analysis prompt (parties, dates, obligations, payment, termination, risks).
- `list_directory` — Return a list of files in a directory.

Input schemas for tools are available through the MCP `ListTools` request. Example input for `extract_document`:

```json
{
  "file_path": "C:\\path\\to\\file.pdf"
}
```

## Example: quick smoke test (local files)

1. Build and run the server:

```powershell
npm install; npm run build; npm start
```

2. The server listens on stdio. To test the extraction locally without an MCP client you can either write a small Node script that connects to the server via stdio and sends MCP `CallTool` messages, or run the server and use an MCP-capable client to call the `extract_document` tool with `test-documents/Udemy Introduces New MCP Server to Bring AI-Powered Learning Directly Into the Flow of Work.pdf` as the `file_path`.

If you want, I can add a small `scripts/test-client.ts` that sends a `CallTool` request over stdio (dev-only) — say the word and I'll add it.

## Install as CLI

To install the compiled project as a global CLI (uses the `bin` entry in package.json):

```powershell
npm install -g .
document-intelligence-mcp
```

## Git / GitHub — add README and push

If your local repo is already connected to a GitHub remote, run:

```powershell
git add README.md
git commit -m "chore: add README"
git push origin main
```

If you need to create a new GitHub remote first (example):

```powershell
git remote add origin https://github.com/<your-user>/document-intelligence-mcp.git
git branch -M main
git push -u origin main
```

Alternatively, you can use the GitHub CLI (`gh`) to create a repo and push:

```powershell
gh repo create <your-user>/document-intelligence-mcp --public --source=. --remote=origin
git push -u origin main
```

## Contribution

Contributions are welcome. Suggested small improvements:

- Add a tiny MCP client script for quick smoke tests
- Add unit tests for extractors (pdf, docx, xlsx)
- Add GitHub Actions to run TypeScript compile check on PRs

## License

This project is provided under the MIT license. See `package.json` for the license field.

---

If you'd like, I can also:

- add a small `scripts/test-client.ts` to send a `CallTool` request over stdio for quick testing
- create a GitHub Actions workflow to build on push

Tell me which next step you want and I will add it.
