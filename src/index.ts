#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { readdir, access } from 'fs/promises';
import PDFParser from 'pdf2json';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// Create the MCP server
const server = new Server(
  {
    name: 'document-intelligence-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ===== DOCUMENT PROCESSING FUNCTIONS =====

async function extractPDF(filePath: string): Promise<any> {
  return new Promise((resolve) => {
    const pdfParser = new PDFParser();

    pdfParser.on('pdfParser_dataError', (errData: any) => {
      resolve({
        success: false,
        error: `Failed to extract PDF: ${errData.parserError}`,
      });
    });

    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        let fullText = '';
        
        // Extract text from all pages
        if (pdfData.Pages) {
          pdfData.Pages.forEach((page: any) => {
            if (page.Texts) {
              page.Texts.forEach((text: any) => {
                if (text.R) {
                  text.R.forEach((r: any) => {
                    if (r.T) {
                      fullText += decodeURIComponent(r.T) + ' ';
                    }
                  });
                }
              });
              fullText += '\n';
            }
          });
        }

        resolve({
          success: true,
          text: fullText.trim(),
          pages: pdfData.Pages ? pdfData.Pages.length : 0,
        });
      } catch (error: any) {
        resolve({
          success: false,
          error: `Failed to process PDF data: ${error.message}`,
        });
      }
    });

    pdfParser.loadPDF(filePath);
  });
}

async function extractWord(filePath: string): Promise<any> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return {
      success: true,
      text: result.value,
      messages: result.messages,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to extract Word document: ${error.message}`,
    };
  }
}

async function extractExcel(filePath: string): Promise<any> {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheets = workbook.SheetNames.map((name) => ({
      name,
      data: XLSX.utils.sheet_to_json(workbook.Sheets[name]),
    }));
    
    return {
      success: true,
      sheets,
      sheetCount: sheets.length,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to extract Excel: ${error.message}`,
    };
  }
}

// ===== DEFINE AVAILABLE TOOLS =====

const tools: Tool[] = [
  {
    name: 'extract_document',
    description: 'Extract text and data from PDF, Word (.docx), or Excel (.xlsx) files. Returns the full content of the document.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Full path to the document file (e.g., C:\\Users\\name\\Documents\\contract.pdf)',
        },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'analyze_contract',
    description: 'Extracts a document and provides it in a structured format for contract analysis. Best used with legal documents, contracts, and agreements.',
    inputSchema: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to the contract document',
        },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'list_directory',
    description: 'List all files in a directory to help find documents to process',
    inputSchema: {
      type: 'object',
      properties: {
        directory_path: {
          type: 'string',
          description: 'Path to directory to list',
        },
      },
      required: ['directory_path'],
    },
  },
];

// ===== HANDLE TOOL LISTING =====

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// ===== HANDLE TOOL EXECUTION =====

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: No arguments provided',
        },
      ],
    };
  }

  try {
    if (name === 'extract_document') {
      const filePath = args.file_path as string;
      
      // Check if file exists
      try {
        await access(filePath);
      } catch {
        return {
          content: [
            {
              type: 'text',
              text: `Error: File not found at path: ${filePath}\n\nPlease check:\n1. The file exists\n2. The path is correct\n3. You have permission to read it`,
            },
          ],
        };
      }

      // Determine file type and extract
      const extension = filePath.toLowerCase().split('.').pop();
      let result;

      if (extension === 'pdf') {
        result = await extractPDF(filePath);
      } else if (extension === 'docx') {
        result = await extractWord(filePath);
      } else if (extension === 'xlsx' || extension === 'xls') {
        result = await extractExcel(filePath);
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Error: Unsupported file type: .${extension}\n\nSupported types: .pdf, .docx, .xlsx, .xls`,
            },
          ],
        };
      }

      if (result.success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${result.error}`,
            },
          ],
        };
      }
    }

    if (name === 'analyze_contract') {
      const filePath = args.file_path as string;
      const extractResult = await extractPDF(filePath);

      if (extractResult.success) {
        return {
          content: [
            {
              type: 'text',
              text: `CONTRACT DOCUMENT EXTRACTED FOR ANALYSIS\n\n${extractResult.text}\n\n---\nPlease analyze this contract and extract:\n- Parties involved\n- Effective dates and term\n- Key obligations\n- Payment terms\n- Termination clauses\n- Important deadlines\n- Risk factors or unusual clauses`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Error extracting contract: ${extractResult.error}`,
            },
          ],
        };
      }
    }

    if (name === 'list_directory') {
      const dirPath = args.directory_path as string;
      
      try {
        const files = await readdir(dirPath);
        const fileList = files.map(f => `- ${f}`).join('\n');
        
        return {
          content: [
            {
              type: 'text',
              text: `Files in ${dirPath}:\n\n${fileList}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing directory: ${error.message}`,
            },
          ],
        };
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `Unknown tool: ${name}`,
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing tool: ${error.message}`,
        },
      ],
    };
  }
});

// ===== START THE SERVER =====

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Document Intelligence MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});