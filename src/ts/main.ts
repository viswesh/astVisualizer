import * as d3 from 'd3';
import CodeFlask from 'codeflask';
import $ from 'jquery';
import 'materialize-css/dist/css/materialize.min.css';
import 'prismjs/themes/prism.css';
import '../styles/main.css';

import { parseCode, countNodeTypes, cleanAstForDisplay } from './ast-utils';
import type { TreeNode } from '../types';
import type { ParseOutcome } from './ast-utils';

const DEFAULT_CODE = `function init() {
 console.log('hello world');
}
init();`;

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
  const counts = countNodeTypes(ast);

  const $table = $('<table class="highlight"/>');
  const $thead = $('<thead><tr><th>Node Type</th><th>Count</th></tr></thead>');
  const $tbody = $('<tbody></tbody>');

  $table.append($thead);
  $table.append($tbody);

  const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  for (const [nodeType, count] of sortedEntries) {
    $tbody.append(`<tr><td>${nodeType}</td><td>${count}</td></tr>`);
  }

  $(container).append($table);
}

function renderAst(ast: TreeNode): void {
  const astEditor = new CodeFlask('#ast-wrapper', {
    language: 'js',
    readonly: true,
  });

  const cleanAst = cleanAstForDisplay(ast);
  const code = JSON.stringify(cleanAst, null, 2);
  astEditor.updateCode(code);
}

function renderError(result: ParseOutcome): void {
  if (result.success) return;

  const { error } = result;
  const treeContainer = document.getElementById('test1');
  const analysisContainer = document.getElementById('test2');
  const astContainer = document.getElementById('ast-wrapper');

  const locationInfo =
    error.line !== undefined
      ? ` at line ${error.line}, column ${error.column}`
      : '';

  const errorHtml = `
    <div class="card-panel red lighten-4" style="margin: 20px;">
      <span class="red-text text-darken-4">
        <i class="material-icons tiny" style="vertical-align: middle;">error</i>
        <strong>Parse Error${locationInfo}</strong>
      </span>
      <p class="red-text text-darken-2" style="margin-top: 8px; font-family: monospace;">
        ${escapeHtml(error.message)}
      </p>
    </div>
  `;

  if (treeContainer) {
    treeContainer.innerHTML = errorHtml;
  }
  if (analysisContainer) {
    analysisContainer.innerHTML = '';
  }
  if (astContainer) {
    astContainer.innerHTML = '';
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderVisuals(result: ParseOutcome): void {
  if (!result.success) {
    renderError(result);
    return;
  }

  const { ast } = result;
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

function clearContainers(): void {
  $('#test1').empty();
  $('#test2').empty();
  $('#ast-wrapper').empty();
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function init(): void {
  const flask = new CodeFlask('#my-code-wrapper', {
    language: 'js',
  });

  flask.updateCode(DEFAULT_CODE);
  renderVisuals(parseCode(DEFAULT_CODE));

  flask.onUpdate((code: string) => {
    // Debounce parsing to avoid excessive re-renders during typing
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      clearContainers();
      const result = parseCode(code);
      renderVisuals(result);
    }, 150);
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
