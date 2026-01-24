import { describe, it, expect } from 'vitest';
import {
  parseCode,
  countNodeTypes,
  removeChildren,
  cleanAstForDisplay,
  getNodeCount,
  getMaxDepth,
} from '../ast-utils';
import type { ASTNode, TreeNode } from '../../types';

describe('parseCode', () => {
  it('should parse valid JavaScript code', () => {
    const result = parseCode('const x = 1;');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.ast.type).toBe('Program');
      expect(result.ast.body).toHaveLength(1);
    }
  });

  it('should return error for invalid JavaScript', () => {
    const result = parseCode('const x = ;');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('Unexpected');
    }
  });

  it('should add children property to nodes', () => {
    const result = parseCode('function foo() {}');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.ast.children).toBeDefined();
      expect(Array.isArray(result.ast.children)).toBe(true);
    }
  });

  it('should handle empty code', () => {
    const result = parseCode('');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.ast.body).toHaveLength(0);
    }
  });

  it('should parse complex code with multiple statements', () => {
    const code = `
      const a = 1;
      function test() {
        return a + 2;
      }
      test();
    `;
    const result = parseCode(code);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.ast.body.length).toBeGreaterThan(1);
    }
  });

  it('should handle arrow functions', () => {
    const result = parseCode('const fn = () => 42;');

    expect(result.success).toBe(true);
  });

  it('should handle template literals', () => {
    const result = parseCode('const str = `hello ${name}`;');

    expect(result.success).toBe(true);
  });

  it('should include line info in errors', () => {
    const result = parseCode('const x = ;\nconst y = 2;');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.line).toBeDefined();
    }
  });
});

describe('countNodeTypes', () => {
  it('should count node types correctly', () => {
    const result = parseCode('const x = 1; const y = 2;');

    expect(result.success).toBe(true);
    if (result.success) {
      const counts = countNodeTypes(result.ast);

      expect(counts['Program']).toBe(1);
      expect(counts['VariableDeclaration']).toBe(2);
      expect(counts['Literal']).toBe(2);
    }
  });

  it('should handle empty program', () => {
    const result = parseCode('');

    expect(result.success).toBe(true);
    if (result.success) {
      const counts = countNodeTypes(result.ast);
      expect(counts['Program']).toBe(1);
    }
  });

  it('should count function declarations', () => {
    const result = parseCode('function a() {} function b() {}');

    expect(result.success).toBe(true);
    if (result.success) {
      const counts = countNodeTypes(result.ast);
      expect(counts['FunctionDeclaration']).toBe(2);
    }
  });
});

describe('removeChildren', () => {
  it('should remove children property from node', () => {
    const node: ASTNode = {
      type: 'Program',
      children: [],
      body: [],
    };

    removeChildren(node);

    expect(node.children).toBeUndefined();
  });

  it('should remove children recursively', () => {
    const node: ASTNode = {
      type: 'Program',
      children: [],
      body: [
        {
          type: 'Statement',
          children: [],
        },
      ],
    };

    removeChildren(node);

    expect(node.children).toBeUndefined();
    expect((node.body as ASTNode[])[0].children).toBeUndefined();
  });

  it('should handle null and undefined values', () => {
    const node: ASTNode = {
      type: 'Program',
      value: null,
      other: undefined,
    };

    expect(() => removeChildren(node)).not.toThrow();
  });
});

describe('cleanAstForDisplay', () => {
  it('should return a clean copy without children', () => {
    const result = parseCode('const x = 1;');

    expect(result.success).toBe(true);
    if (result.success) {
      const clean = cleanAstForDisplay(result.ast) as TreeNode;

      expect(clean.children).toBeUndefined();
      expect(clean.type).toBe('Program');
      // Original should still have children
      expect(result.ast.children).toBeDefined();
    }
  });

  it('should not modify the original AST', () => {
    const result = parseCode('const x = 1;');

    expect(result.success).toBe(true);
    if (result.success) {
      const originalChildren = result.ast.children;
      cleanAstForDisplay(result.ast);

      expect(result.ast.children).toBe(originalChildren);
    }
  });
});

describe('getNodeCount', () => {
  it('should count total nodes in AST', () => {
    const result = parseCode('const x = 1;');

    expect(result.success).toBe(true);
    if (result.success) {
      const count = getNodeCount(result.ast);
      // Program > VariableDeclaration > VariableDeclarator > Identifier, Literal
      expect(count).toBeGreaterThan(1);
    }
  });

  it('should return 1 for empty program', () => {
    const result = parseCode('');

    expect(result.success).toBe(true);
    if (result.success) {
      const count = getNodeCount(result.ast);
      expect(count).toBe(1); // Just the Program node
    }
  });

  it('should count nested nodes', () => {
    const result = parseCode('function test() { return 1 + 2; }');

    expect(result.success).toBe(true);
    if (result.success) {
      const count = getNodeCount(result.ast);
      expect(count).toBeGreaterThan(5);
    }
  });
});

describe('getMaxDepth', () => {
  it('should return depth of 1 for empty program', () => {
    const result = parseCode('');

    expect(result.success).toBe(true);
    if (result.success) {
      const depth = getMaxDepth(result.ast);
      expect(depth).toBe(1);
    }
  });

  it('should calculate correct depth for nested code', () => {
    const result = parseCode('const x = 1;');

    expect(result.success).toBe(true);
    if (result.success) {
      const depth = getMaxDepth(result.ast);
      expect(depth).toBeGreaterThan(1);
    }
  });

  it('should handle deeply nested functions', () => {
    const code = `
      function a() {
        function b() {
          function c() {
            return 1;
          }
        }
      }
    `;
    const result = parseCode(code);

    expect(result.success).toBe(true);
    if (result.success) {
      const depth = getMaxDepth(result.ast);
      expect(depth).toBeGreaterThan(5);
    }
  });
});
