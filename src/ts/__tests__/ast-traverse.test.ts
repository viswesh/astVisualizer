import { describe, it, expect, vi } from 'vitest';
import { traverse } from '../ast-traverse';
import type { ASTNode } from '../../types';

describe('traverse', () => {
  it('should call pre callback for each node', () => {
    const ast: ASTNode = {
      type: 'Program',
      body: [{ type: 'ExpressionStatement', expression: { type: 'Literal' } }],
    };

    const pre = vi.fn();
    traverse(ast, { pre });

    expect(pre).toHaveBeenCalledTimes(3);
    expect(pre).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'Program' }),
      null,
      undefined,
      undefined
    );
  });

  it('should call post callback for each node', () => {
    const ast: ASTNode = {
      type: 'Program',
      body: [{ type: 'ExpressionStatement' }],
    };

    const post = vi.fn();
    traverse(ast, { post });

    expect(post).toHaveBeenCalledTimes(2);
  });

  it('should skip traversal when pre returns false', () => {
    const ast: ASTNode = {
      type: 'Program',
      body: [{ type: 'ExpressionStatement', expression: { type: 'Literal' } }],
    };

    const pre = vi.fn().mockReturnValue(false);
    const post = vi.fn();

    traverse(ast, { pre, post });

    // Pre called once for root, but children not traversed
    expect(pre).toHaveBeenCalledTimes(1);
    // Post still called for root
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('should skip properties starting with $', () => {
    const ast: ASTNode = {
      type: 'Program',
      $metadata: { type: 'ShouldSkip' },
      body: [{ type: 'Statement' }],
    };

    const pre = vi.fn();
    traverse(ast, { pre });

    // Should visit Program and Statement, not $metadata
    expect(pre).toHaveBeenCalledTimes(2);
    expect(pre).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ShouldSkip' }),
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });

  it('should use custom skipProperty function', () => {
    const ast: ASTNode = {
      type: 'Program',
      loc: { type: 'Location' },
      body: [{ type: 'Statement' }],
    };

    const pre = vi.fn();
    const skipProperty = vi.fn((prop: string) => prop === 'loc');

    traverse(ast, { pre, skipProperty });

    expect(pre).toHaveBeenCalledTimes(2);
    expect(skipProperty).toHaveBeenCalledWith('loc', expect.anything());
  });

  it('should traverse arrays correctly', () => {
    const ast: ASTNode = {
      type: 'Program',
      body: [
        { type: 'Statement1' },
        { type: 'Statement2' },
        { type: 'Statement3' },
      ],
    };

    const types: string[] = [];
    traverse(ast, {
      pre: (node) => {
        types.push(node.type);
      },
    });

    expect(types).toEqual([
      'Program',
      'Statement1',
      'Statement2',
      'Statement3',
    ]);
  });

  it('should handle empty body', () => {
    const ast: ASTNode = {
      type: 'Program',
      body: [],
    };

    const pre = vi.fn();
    traverse(ast, { pre });

    expect(pre).toHaveBeenCalledTimes(1);
  });

  it('should handle deeply nested structures', () => {
    const ast: ASTNode = {
      type: 'Program',
      body: [
        {
          type: 'Function',
          body: [
            {
              type: 'Block',
              body: [{ type: 'Statement' }],
            },
          ],
        },
      ],
    };

    const depth: number[] = [];
    let currentDepth = 0;

    traverse(ast, {
      pre: () => {
        depth.push(currentDepth);
        currentDepth++;
      },
      post: () => {
        currentDepth--;
      },
    });

    expect(depth).toEqual([0, 1, 2, 3]);
  });

  it('should not crash on non-object nodes', () => {
    const ast: ASTNode = {
      type: 'Program',
      value: 'string value',
      count: 42,
      flag: true,
      nothing: null,
    };

    expect(() => traverse(ast, { pre: vi.fn() })).not.toThrow();
  });

  it('should pass correct parent and property info', () => {
    const ast: ASTNode = {
      type: 'Program',
      body: [{ type: 'Statement' }],
    };

    const calls: Array<{
      type: string;
      parentType: string | null;
      prop?: string;
    }> = [];

    traverse(ast, {
      pre: (node, parent, prop) => {
        calls.push({
          type: node.type,
          parentType: parent?.type ?? null,
          prop,
        });
      },
    });

    expect(calls).toEqual([
      { type: 'Program', parentType: null, prop: undefined },
      { type: 'Statement', parentType: 'Program', prop: 'body' },
    ]);
  });
});
