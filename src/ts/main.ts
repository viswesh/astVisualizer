import * as d3 from 'd3';
import * as esprima from 'esprima';
import CodeFlask from 'codeflask';
import $ from 'jquery';
import 'materialize-css/dist/css/materialize.min.css';
import 'prismjs/themes/prism.css';
import '../styles/main.css';

import { traverse } from './ast-traverse';
import type { ASTNode, TreeNode, NodeTypeCount, ParsedAST } from '../types';

const DEFAULT_CODE = `function init() {
 console.log('hello world');
}
init();`;

function generateAst(code: string): ParsedAST | null {
  try {
    const ast = esprima.parseScript(code) as unknown as ParsedAST;

    traverse(ast, {
      pre: (node: ASTNode) => {
        if (node.body && !Array.isArray(node.body)) {
          node.body = [node.body];
        }
        node.children = (node.body as ASTNode[]) ?? [];
      },
    });

    return ast;
  } catch (error) {
    console.error('Parse error:', error);
    return null;
  }
}

function renderTree(container: HTMLElement, ast: TreeNode): void {
  const margin = { top: 40, right: 90, bottom: 50, left: 90 };
  const width = 660 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const treemap = d3.tree<TreeNode>().size([width, height]);

  const hierarchy = d3.hierarchy<TreeNode>(ast, (d) => d.children);
  const nodes = treemap(hierarchy);

  const svg = d3
    .select(container)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);

  const g = svg
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Add links between nodes
  g.selectAll('.link')
    .data(nodes.descendants().slice(1))
    .enter()
    .append('path')
    .attr('class', 'link')
    .attr('d', (d) => {
      const parent = d.parent!;
      return `M${d.x},${d.y}C${d.x},${(d.y + parent.y) / 2} ${parent.x},${(d.y + parent.y) / 2} ${parent.x},${parent.y}`;
    });

  // Add nodes
  const node = g
    .selectAll('.node')
    .data(nodes.descendants())
    .enter()
    .append('g')
    .attr('class', (d) =>
      d.children ? 'node node--internal' : 'node node--leaf'
    )
    .attr('transform', (d) => `translate(${d.x},${d.y})`);

  node.append('circle').attr('r', 10);

  node
    .append('text')
    .attr('dy', '.35em')
    .attr('y', (d) => (d.children ? -20 : 20))
    .style('text-anchor', 'middle')
    .text((d) => d.data.type);
}

function renderAnalysis(container: HTMLElement, ast: TreeNode): void {
  const hash: NodeTypeCount = {};

  traverse(ast, {
    post: (node: ASTNode) => {
      if (node.type) {
        hash[node.type] = (hash[node.type] ?? 0) + 1;
      }
    },
  });

  const $table = $('<table class="highlight"/>');
  const $tbody = $table.append('<tbody></tbody>');

  for (const prop in hash) {
    $tbody.append(`<tr><td>${prop}</td><td>${hash[prop]}</td></tr>`);
  }

  $(container).append($table);
}

function renderAst(ast: TreeNode): void {
  const astEditor = new CodeFlask('#ast-wrapper', {
    language: 'js',
    readonly: true,
  });

  const cleanAst = JSON.parse(JSON.stringify(ast));
  removeChildren(cleanAst);

  const code = JSON.stringify(cleanAst, null, 4);
  astEditor.updateCode(code);
}

function removeChildren(node: ASTNode): void {
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

function renderVisuals(ast: ParsedAST | null): void {
  if (!ast) {
    const container = document.getElementById('test1');
    if (container) {
      container.innerHTML = '<p class="red-text">Invalid JavaScript syntax</p>';
    }
    return;
  }

  const treeContainer = document.getElementById('test1');
  const analysisContainer = document.getElementById('test2');

  if (treeContainer) {
    renderTree(treeContainer, ast);
  }

  if (analysisContainer) {
    renderAnalysis(analysisContainer, ast);
  }

  renderAst(ast);
}

function init(): void {
  const flask = new CodeFlask('#my-code-wrapper', {
    language: 'js',
  });

  flask.updateCode(DEFAULT_CODE);
  renderVisuals(generateAst(DEFAULT_CODE));

  flask.onUpdate((code: string) => {
    $('#test1').empty();
    $('#test2').empty();
    $('#ast-wrapper').empty();

    const ast = generateAst(code);
    renderVisuals(ast);
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
