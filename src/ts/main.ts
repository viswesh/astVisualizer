import * as d3 from 'd3';
import CodeFlask from 'codeflask';
import $ from 'jquery';
import 'materialize-css/dist/css/materialize.min.css';
import 'prismjs/themes/prism.css';
import '../styles/main.css';

import { parseCode, PARSERS } from './parsers';
import { countNodeTypes, cleanAstForDisplay } from './ast-utils';
import type { TreeNode, ParserType, SourceLocation } from '../types';
import type { ParseOutcome } from './parsers';

const DEFAULT_CODE = `function init() {
  console.log('hello world');
}
init();`;

// Global state
let currentCode = DEFAULT_CODE;
let currentParser: ParserType = 'esprima';
let currentAst: TreeNode | null = null;
let codeFlaskInstance: CodeFlask | null = null;

// Node click handler type
type NodeClickHandler = (node: TreeNode) => void;

function highlightCodeRange(loc: SourceLocation | undefined): void {
  if (!loc || !codeFlaskInstance) return;

  const wrapper = document.querySelector('#my-code-wrapper');
  if (!wrapper) return;

  // Remove existing highlights
  wrapper.querySelectorAll('.code-highlight').forEach((el) => el.remove());

  const pre = wrapper.querySelector('pre');
  const code = wrapper.querySelector('code');
  if (!pre || !code) return;

  const lines = currentCode.split('\n');
  const startLine = loc.start.line - 1;
  const endLine = loc.end.line - 1;

  // Calculate character positions
  let startOffset = 0;
  for (let i = 0; i < startLine; i++) {
    startOffset += lines[i].length + 1;
  }
  startOffset += loc.start.column;

  let endOffset = 0;
  for (let i = 0; i < endLine; i++) {
    endOffset += lines[i].length + 1;
  }
  endOffset += loc.end.column;

  // Create highlight overlay
  const highlight = document.createElement('div');
  highlight.className = 'code-highlight';
  highlight.style.cssText = `
    position: absolute;
    background: rgba(236, 111, 117, 0.3);
    border: 2px solid #EC6F75;
    border-radius: 3px;
    pointer-events: none;
    z-index: 10;
  `;

  // Position based on line numbers
  const lineHeight = 21; // Approximate line height
  const charWidth = 8.4; // Approximate character width for monospace

  highlight.style.top = `${startLine * lineHeight + 10}px`;
  highlight.style.left = `${loc.start.column * charWidth + 10}px`;

  if (startLine === endLine) {
    highlight.style.width = `${(loc.end.column - loc.start.column) * charWidth}px`;
    highlight.style.height = `${lineHeight}px`;
  } else {
    highlight.style.width = `calc(100% - ${loc.start.column * charWidth + 20}px)`;
    highlight.style.height = `${(endLine - startLine + 1) * lineHeight}px`;
  }

  pre.style.position = 'relative';
  pre.appendChild(highlight);

  // Auto-remove after 3 seconds
  setTimeout(() => highlight.remove(), 3000);
}

function renderTree(
  container: HTMLElement,
  ast: TreeNode,
  onNodeClick?: NodeClickHandler
): void {
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

  // Add links
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
    .attr(
      'class',
      (d) =>
        `node ${d.children ? 'node--internal' : 'node--leaf'} ${d.data.loc ? 'node--clickable' : ''}`
    )
    .attr('transform', (d) => `translate(${d.x},${d.y})`)
    .style('cursor', (d) => (d.data.loc ? 'pointer' : 'default'))
    .on('click', (_event, d) => {
      if (onNodeClick && d.data.loc) {
        onNodeClick(d.data);
      }
    });

  node
    .append('circle')
    .attr('r', 10)
    .on('mouseover', function () {
      d3.select(this).attr('r', 13);
    })
    .on('mouseout', function () {
      d3.select(this).attr('r', 10);
    });

  node
    .append('text')
    .attr('dy', '.35em')
    .attr('y', (d) => (d.children ? -20 : 20))
    .style('text-anchor', 'middle')
    .text((d) => d.data.type);

  // Add tooltip
  node.append('title').text((d) => {
    const loc = d.data.loc;
    if (loc) {
      return `${d.data.type}\nLine ${loc.start.line}:${loc.start.column} - ${loc.end.line}:${loc.end.column}\nClick to highlight in code`;
    }
    return d.data.type;
  });
}

function renderAnalysis(container: HTMLElement, ast: TreeNode): void {
  const counts = countNodeTypes(ast);

  const $table = $('<table class="highlight"/>');
  const $thead = $('<thead><tr><th>Node Type</th><th>Count</th></tr></thead>');
  const $tbody = $('<tbody></tbody>');

  $table.append($thead).append($tbody);

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

  const { error, parserUsed } = result;
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
        <span class="grey-text text-darken-1" style="margin-left: 10px;">(${parserUsed})</span>
      </span>
      <p class="red-text text-darken-2" style="margin-top: 8px; font-family: monospace;">
        ${escapeHtml(error.message)}
      </p>
    </div>
  `;

  if (treeContainer) treeContainer.innerHTML = errorHtml;
  if (analysisContainer) analysisContainer.innerHTML = '';
  if (astContainer) astContainer.innerHTML = '';
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderVisuals(result: ParseOutcome): void {
  if (!result.success) {
    renderError(result);
    currentAst = null;
    return;
  }

  const { ast } = result;
  currentAst = ast;

  const treeContainer = document.getElementById('test1');
  const analysisContainer = document.getElementById('test2');

  if (treeContainer) {
    renderTree(treeContainer, ast, (node) => {
      highlightCodeRange(node.loc);
    });
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

// Export functions
function exportAsJson(): void {
  if (!currentAst) return;

  const cleanAst = cleanAstForDisplay(currentAst);
  const json = JSON.stringify(cleanAst, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'ast.json';
  a.click();

  URL.revokeObjectURL(url);
}

function shareAsUrl(): void {
  const encoded = encodeURIComponent(currentCode);
  const url = `${window.location.origin}${window.location.pathname}?code=${encoded}&parser=${currentParser}`;

  if (url.length > 2000) {
    alert('Code is too long to share via URL. Try exporting as JSON instead.');
    return;
  }

  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('share-btn');
    if (btn) {
      const originalText = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    }
  });
}

function loadFromUrl(): { code: string; parser: ParserType } | null {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const parser = params.get('parser') as ParserType | null;

  if (code) {
    return {
      code: decodeURIComponent(code),
      parser:
        parser && PARSERS.some((p) => p.id === parser) ? parser : 'esprima',
    };
  }

  return null;
}

function renderParserSelector(): void {
  const container = document.getElementById('parser-selector');
  if (!container) return;

  const html = `
    <div class="input-field" style="margin: 0;">
      <select id="parser-select">
        ${PARSERS.map(
          (p) =>
            `<option value="${p.id}" ${p.id === currentParser ? 'selected' : ''}>
              ${p.name}
            </option>`
        ).join('')}
      </select>
      <label>Parser</label>
    </div>
  `;

  container.innerHTML = html;

  // Initialize Materialize select
  const selectEl = container.querySelector('select');
  if (selectEl) {
    // @ts-expect-error Materialize global
    M.FormSelect.init(selectEl);

    selectEl.addEventListener('change', (e) => {
      currentParser = (e.target as HTMLSelectElement).value as ParserType;
      clearContainers();
      renderVisuals(parseCode(currentCode, currentParser));
    });
  }
}

function renderExportButtons(): void {
  const container = document.getElementById('export-buttons');
  if (!container) return;

  container.innerHTML = `
    <a id="export-json-btn" class="btn-small waves-effect waves-light" style="margin-right: 8px;">
      <i class="material-icons left">file_download</i>JSON
    </a>
    <a id="share-btn" class="btn-small waves-effect waves-light">
      <i class="material-icons left">share</i>Share
    </a>
  `;

  document
    .getElementById('export-json-btn')
    ?.addEventListener('click', exportAsJson);
  document.getElementById('share-btn')?.addEventListener('click', shareAsUrl);
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function init(): void {
  // Check for URL parameters first
  const urlData = loadFromUrl();
  if (urlData) {
    currentCode = urlData.code;
    currentParser = urlData.parser;
  }

  // Initialize code editor
  const flask = new CodeFlask('#my-code-wrapper', {
    language: 'js',
  });
  codeFlaskInstance = flask;

  flask.updateCode(currentCode);
  renderVisuals(parseCode(currentCode, currentParser));

  // Render UI controls
  renderParserSelector();
  renderExportButtons();

  // Handle code updates
  flask.onUpdate((code: string) => {
    currentCode = code;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      clearContainers();
      renderVisuals(parseCode(code, currentParser));
    }, 150);
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
