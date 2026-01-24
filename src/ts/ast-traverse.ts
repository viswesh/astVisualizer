import type { ASTNode, TraverseOptions } from '../types';

export function traverse(root: ASTNode, options: TraverseOptions = {}): void {
  const { pre, post, skipProperty } = options;

  function visit(
    node: unknown,
    parent: ASTNode | null,
    prop?: string,
    idx?: number
  ): void {
    if (
      !node ||
      typeof node !== 'object' ||
      typeof (node as ASTNode).type !== 'string'
    ) {
      return;
    }

    const astNode = node as ASTNode;
    let res: boolean | void = undefined;

    if (pre) {
      res = pre(astNode, parent, prop, idx);
    }

    if (res !== false) {
      for (const key in astNode) {
        if (skipProperty ? skipProperty(key, astNode) : key[0] === '$') {
          continue;
        }

        const child = astNode[key];

        if (Array.isArray(child)) {
          for (let i = 0; i < child.length; i++) {
            visit(child[i], astNode, key, i);
          }
        } else {
          visit(child, astNode, key);
        }
      }
    }

    if (post) {
      post(astNode, parent, prop, idx);
    }
  }

  visit(root, null);
}
