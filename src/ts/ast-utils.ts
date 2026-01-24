import * as esprima from 'esprima';
import { traverse } from './ast-traverse';
import type { ASTNode, TreeNode, NodeTypeCount, ParsedAST } from '../types';

export interface ParseResult {
  success: true;
  ast: ParsedAST;
}

export interface ParseError {
  success: false;
  error: {
    message: string;
    line?: number;
    column?: number;
  };
}

export type ParseOutcome = ParseResult | ParseError;

export function parseCode(code: string): ParseOutcome {
  try {
    const ast = esprima.parseScript(code, {
      loc: true,
    }) as unknown as ParsedAST;

    traverse(ast, {
      pre: (node: ASTNode) => {
        if (node.body && !Array.isArray(node.body)) {
          node.body = [node.body];
        }
        node.children = (node.body as ASTNode[]) ?? [];
      },
    });

    return { success: true, ast };
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
    };
  }
}

export function countNodeTypes(ast: TreeNode): NodeTypeCount {
  const counts: NodeTypeCount = {};

  traverse(ast, {
    skipProperty: (prop) => prop === 'children',
    post: (node: ASTNode) => {
      if (node.type) {
        counts[node.type] = (counts[node.type] ?? 0) + 1;
      }
    },
  });

  return counts;
}

export function removeChildren(node: ASTNode): void {
  if (node && typeof node === 'object') {
    delete node.children;
    for (const key in node) {
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((item) => removeChildren(item as ASTNode));
      } else if (typeof value === 'object' && value !== null) {
        removeChildren(value as ASTNode);
      }
    }
  }
}

export function cleanAstForDisplay(ast: TreeNode): object {
  const cleanAst = JSON.parse(JSON.stringify(ast));
  removeChildren(cleanAst);
  return cleanAst;
}

export function getNodeCount(ast: TreeNode): number {
  let count = 0;
  traverse(ast, {
    skipProperty: (prop) => prop === 'children',
    pre: () => {
      count++;
    },
  });
  return count;
}

export function getMaxDepth(ast: TreeNode): number {
  let maxDepth = 0;
  let currentDepth = 0;

  traverse(ast, {
    skipProperty: (prop) => prop === 'children',
    pre: () => {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    },
    post: () => {
      currentDepth--;
    },
  });

  return maxDepth;
}
