import type { Program } from 'esprima';

export interface SourceLocation {
  start: {
    line: number;
    column: number;
  };
  end: {
    line: number;
    column: number;
  };
}

export interface ASTNode {
  type: string;
  body?: ASTNode | ASTNode[];
  children?: ASTNode[];
  loc?: SourceLocation;
  range?: [number, number];
  [key: string]: unknown;
}

export interface TreeNode extends ASTNode {
  children: TreeNode[];
}

export interface TraverseOptions {
  pre?: (
    node: ASTNode,
    parent: ASTNode | null,
    prop?: string,
    idx?: number
  ) => boolean | void;
  post?: (
    node: ASTNode,
    parent: ASTNode | null,
    prop?: string,
    idx?: number
  ) => void;
  skipProperty?: (prop: string, node: ASTNode) => boolean;
}

export type ParsedAST = Program & TreeNode;

export interface NodeTypeCount {
  [nodeType: string]: number;
}

export type ParserType = 'esprima' | 'acorn' | 'babel';

export interface ParserInfo {
  id: ParserType;
  name: string;
  description: string;
}
