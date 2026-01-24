import * as esprima from 'esprima';
import * as acorn from 'acorn';
import * as babel from '@babel/parser';
import { traverse } from './ast-traverse';
import type { ASTNode, ParsedAST, ParserType, ParserInfo } from '../types';

export interface ParseResult {
  success: true;
  ast: ParsedAST;
  parserUsed: ParserType;
}

export interface ParseError {
  success: false;
  error: {
    message: string;
    line?: number;
    column?: number;
  };
  parserUsed: ParserType;
}

export type ParseOutcome = ParseResult | ParseError;

export const PARSERS: ParserInfo[] = [
  {
    id: 'esprima',
    name: 'Esprima',
    description: 'Fast, standard-compliant ECMAScript parser',
  },
  {
    id: 'acorn',
    name: 'Acorn',
    description: 'Small, fast JavaScript parser with plugin support',
  },
  {
    id: 'babel',
    name: 'Babel',
    description: 'Supports JSX, TypeScript, and latest ECMAScript features',
  },
];

function addChildrenToAst(ast: ASTNode): void {
  traverse(ast, {
    pre: (node: ASTNode) => {
      if (node.body && !Array.isArray(node.body)) {
        node.body = [node.body];
      }
      node.children = (node.body as ASTNode[]) ?? [];
    },
  });
}

function parseWithEsprima(code: string): ParseOutcome {
  try {
    const ast = esprima.parseScript(code, {
      loc: true,
      range: true,
    }) as unknown as ParsedAST;

    addChildrenToAst(ast);
    return { success: true, ast, parserUsed: 'esprima' };
  } catch (err) {
    const error = err as {
      message?: string;
      lineNumber?: number;
      column?: number;
    };
    return {
      success: false,
      error: {
        message: error.message ?? 'Unknown parse error',
        line: error.lineNumber,
        column: error.column,
      },
      parserUsed: 'esprima',
    };
  }
}

function parseWithAcorn(code: string): ParseOutcome {
  try {
    const ast = acorn.parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'script',
      locations: true,
      ranges: true,
    }) as unknown as ParsedAST;

    addChildrenToAst(ast);
    return { success: true, ast, parserUsed: 'acorn' };
  } catch (err) {
    const error = err as {
      message?: string;
      loc?: { line: number; column: number };
    };
    return {
      success: false,
      error: {
        message: error.message ?? 'Unknown parse error',
        line: error.loc?.line,
        column: error.loc?.column,
      },
      parserUsed: 'acorn',
    };
  }
}

function parseWithBabel(code: string): ParseOutcome {
  try {
    const ast = babel.parse(code, {
      sourceType: 'script',
      plugins: ['jsx', 'typescript'],
      ranges: true,
    }) as unknown as ParsedAST;

    addChildrenToAst(ast);
    return { success: true, ast, parserUsed: 'babel' };
  } catch (err) {
    const error = err as {
      message?: string;
      loc?: { line: number; column: number };
    };
    return {
      success: false,
      error: {
        message: error.message ?? 'Unknown parse error',
        line: error.loc?.line,
        column: error.loc?.column,
      },
      parserUsed: 'babel',
    };
  }
}

export function parseCode(
  code: string,
  parser: ParserType = 'esprima'
): ParseOutcome {
  switch (parser) {
    case 'acorn':
      return parseWithAcorn(code);
    case 'babel':
      return parseWithBabel(code);
    case 'esprima':
    default:
      return parseWithEsprima(code);
  }
}

export function getParserInfo(parser: ParserType): ParserInfo | undefined {
  return PARSERS.find((p) => p.id === parser);
}
