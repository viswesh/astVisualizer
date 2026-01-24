# AST Visualizer - Complete Frontend Modernization

**Branch:** `claude/frontend-roadmap-ifUqP` → `master`

This PR represents a comprehensive modernization of the AST Visualizer, transforming it from a vanilla JavaScript application into a production-ready, accessible, and maintainable TypeScript application.

---

## 📊 Architecture Overview

### Block Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AST VISUALIZER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   index.html │    │  about.html  │    │  main.css    │                   │
│  │   (Entry)    │    │  (Info Page) │    │  (Theming)   │                   │
│  └──────┬───────┘    └──────────────┘    └──────────────┘                   │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                           main.ts (Application Core)                  │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐  │   │
│  │  │ Theme Manager  │  │ Event Handlers │  │ UI Initialization      │  │   │
│  │  │ - Toggle       │  │ - Code change  │  │ - CodeFlask editors    │  │   │
│  │  │ - Persistence  │  │ - Node click   │  │ - D3 tree rendering    │  │   │
│  │  │ - System pref  │  │ - Keyboard nav │  │ - Materialize tabs     │  │   │
│  │  └────────────────┘  └────────────────┘  └────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        parsers.ts (Multi-Parser Layer)                │   │
│  │  ┌────────────┐    ┌────────────┐    ┌────────────┐                  │   │
│  │  │  Esprima   │    │   Acorn    │    │   Babel    │                  │   │
│  │  │ (Default)  │    │ (Plugins)  │    │ (JSX/TS)   │                  │   │
│  │  └────────────┘    └────────────┘    └────────────┘                  │   │
│  │         │                 │                 │                         │   │
│  │         └─────────────────┴─────────────────┘                         │   │
│  │                           │                                           │   │
│  │                           ▼                                           │   │
│  │                  ┌─────────────────┐                                  │   │
│  │                  │  ParseOutcome   │                                  │   │
│  │                  │ (Result | Error)│                                  │   │
│  │                  └─────────────────┘                                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    ast-traverse.ts (Generic Traversal)                │   │
│  │                                                                       │   │
│  │  traverse(node, { pre, post, skipProperty }) → visits all AST nodes  │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                      ast-utils.ts (AST Utilities)                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐    │   │
│  │  │ countNodes   │  │  getMaxDepth │  │ cleanAstForExport        │    │   │
│  │  │ countTypes   │  │  parseCode   │  │ removeChildren           │    │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │     │  CodeFlask  │     │   Parser    │     │  D3.js      │
│   Input     │────▶│  Editor     │────▶│  (parse)    │────▶│  Tree       │
│             │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                   │                   │
                           │                   │                   │
                           ▼                   ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
                    │  onChange   │     │  AST with   │     │  Visual     │
                    │  (debounce) │     │  children   │     │  Hierarchy  │
                    └─────────────┘     └─────────────┘     └─────────────┘
                                               │
                           ┌───────────────────┼───────────────────┐
                           ▼                   ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
                    │  Tree Tab   │     │  Usage Tab  │     │  AST Tab    │
                    │  (D3 viz)   │     │  (analysis) │     │  (JSON)     │
                    └─────────────┘     └─────────────┘     └─────────────┘
```

### Bidirectional Code ↔ Tree Linking

```
┌────────────────────────────────────────────────────────────────────────┐
│                     CODE ↔ TREE INTERACTION                            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌─────────────────┐                    ┌─────────────────┐           │
│   │   Code Editor   │                    │   Tree View     │           │
│   │                 │                    │                 │           │
│   │  function add() │◄─── highlight ────│     Program     │           │
│   │    return a + b │      from node    │        │        │           │
│   │  }              │       click       │   ┌────┴────┐   │           │
│   │                 │                    │   │         │   │           │
│   │  [████████████] │                    │ Function  ... │           │
│   │  (highlighted)  │                    │   (click)     │           │
│   │                 │                    │                 │           │
│   └─────────────────┘                    └─────────────────┘           │
│                                                                        │
│   Node.loc = { start: {line, col}, end: {line, col} }                 │
│                           │                                            │
│                           ▼                                            │
│              Calculate highlight position using                        │
│              line height and scroll offset                             │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🎓 Concepts & Patterns You Can Learn

### 1. **Abstract Syntax Trees (AST)**

An AST is a tree representation of source code structure. Each node represents a construct:

```javascript
// Source code
const x = 1 + 2;

// AST representation
{
  "type": "Program",
  "body": [{
    "type": "VariableDeclaration",
    "declarations": [{
      "type": "VariableDeclarator",
      "id": { "type": "Identifier", "name": "x" },
      "init": {
        "type": "BinaryExpression",
        "operator": "+",
        "left": { "type": "Literal", "value": 1 },
        "right": { "type": "Literal", "value": 2 }
      }
    }]
  }]
}
```

**Why it matters**: ASTs power code analysis, transformation (Babel), linting (ESLint), formatting (Prettier), and more.

---

### 2. **Visitor Pattern for Tree Traversal**

The `traverse()` function implements the visitor pattern:

```typescript
// ast-traverse.ts
export function traverse(node: ASTNode, options: TraverseOptions): void {
  const { pre, post, skipProperty } = options;

  pre?.(node, parent, prop);  // Visit before children

  for (const key of Object.keys(node)) {
    if (skipProperty?.(key, node)) continue;
    // Recursively traverse children
    traverse(child, { pre, post, skipProperty });
  }

  post?.(node, parent, prop); // Visit after children
}
```

**Key concepts**:
- **Pre-order**: Visit node before its children (useful for transformation)
- **Post-order**: Visit node after children (useful for aggregation)
- **Skip logic**: Avoid infinite loops by skipping already-visited properties

---

### 3. **Discriminated Unions for Type Safety**

TypeScript discriminated unions ensure exhaustive handling:

```typescript
// Either success or failure, never both
export type ParseOutcome = ParseResult | ParseError;

interface ParseResult {
  success: true;        // Discriminant
  ast: ParsedAST;
  parserUsed: ParserType;
}

interface ParseError {
  success: false;       // Discriminant
  error: { message: string; line?: number };
  parserUsed: ParserType;
}

// Type narrows automatically
if (result.success) {
  console.log(result.ast);  // TypeScript knows ast exists
} else {
  console.log(result.error); // TypeScript knows error exists
}
```

---

### 4. **CSS Custom Properties (Variables) for Theming**

CSS variables enable runtime theming without JavaScript:

```css
:root {
  --bg-primary: #ffffff;
  --text-primary: #212121;
  --accent-color: #ec6f75;
}

[data-theme='dark'] {
  --bg-primary: #1e1e1e;
  --text-primary: #e0e0e0;
  --accent-color: #ff8a80;
}

/* Components use variables */
body {
  background: var(--bg-primary);
  color: var(--text-primary);
}
```

**Theme toggle in JS**:
```typescript
document.documentElement.setAttribute('data-theme', 'dark');
```

---

### 5. **Accessibility (a11y) Patterns**

#### ARIA Roles and Labels
```html
<ul class="tabs" role="tablist" aria-label="AST views">
  <li role="presentation">
    <a role="tab" aria-selected="true" aria-controls="tree-panel">Tree</a>
  </li>
</ul>
<div id="tree-panel" role="tabpanel" aria-labelledby="tab-tree">
```

#### Keyboard Navigation
```typescript
// Arrow key navigation for tree nodes
node.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') focusNextNode();
  if (e.key === 'ArrowUp') focusPreviousNode();
  if (e.key === 'ArrowRight') expandNode();
  if (e.key === 'ArrowLeft') collapseNode();
});
```

#### Screen Reader Announcements
```typescript
function announce(message: string) {
  const el = document.createElement('div');
  el.setAttribute('aria-live', 'polite');
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}
```

#### Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

### 6. **Module Bundling with Vite**

Vite provides lightning-fast development with native ESM:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
      },
    },
  },
});
```

**Key benefits**:
- No bundling during dev (native ESM)
- Hot Module Replacement (HMR)
- Optimized production builds with Rollup

---

### 7. **Testing with Vitest**

Vitest provides Jest-compatible testing with Vite integration:

```typescript
describe('parseCode', () => {
  it('should parse valid JavaScript', () => {
    const result = parseCode('const x = 1;', 'esprima');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.ast.type).toBe('Program');
    }
  });

  it('should handle parse errors gracefully', () => {
    const result = parseCode('const x = ;', 'esprima');

    expect(result.success).toBe(false);
    expect(result.error.message).toBeDefined();
  });
});
```

---

## 📈 What Changed (4 Phases)

### Phase 1: Build Infrastructure
- ✅ Vite build system with HMR
- ✅ TypeScript with strict mode
- ✅ ESLint 9 flat config + Prettier
- ✅ Proper type definitions

### Phase 2: Testing & CI/CD
- ✅ Vitest testing framework
- ✅ 48 comprehensive tests
- ✅ GitHub Actions for CI
- ✅ Automated deployment workflow

### Phase 3: Features
- ✅ Multi-parser support (Esprima, Acorn, Babel)
- ✅ Bidirectional code ↔ tree linking
- ✅ Export to JSON / Share via URL
- ✅ Parser selection UI

### Phase 4: Polish & Accessibility
- ✅ Dark mode with system preference detection
- ✅ localStorage theme persistence
- ✅ ARIA labels throughout
- ✅ Keyboard navigation for tree
- ✅ Screen reader support
- ✅ Reduced motion & high contrast support

---

## 📁 New File Structure

```
astVisualizer/
├── .github/workflows/
│   ├── ci.yml              # Lint, test, build on PR
│   └── deploy.yml          # Deploy to GitHub Pages
├── src/
│   ├── styles/
│   │   └── main.css        # CSS with theming variables
│   ├── ts/
│   │   ├── __tests__/
│   │   │   ├── ast-traverse.test.ts
│   │   │   ├── ast-utils.test.ts
│   │   │   └── parsers.test.ts
│   │   ├── ast-traverse.ts # Generic tree traversal
│   │   ├── ast-utils.ts    # AST utility functions
│   │   ├── main.ts         # Application entry point
│   │   └── parsers.ts      # Multi-parser abstraction
│   └── types/
│       ├── ast.ts          # AST type definitions
│       ├── codeflask.d.ts  # CodeFlask declarations
│       └── index.ts        # Type exports
├── eslint.config.js        # ESLint 9 flat config
├── package.json            # Dependencies & scripts
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Vite build config
└── vitest.config.ts        # Test config
```

---

## 🧪 Test Plan

- [x] All 48 unit tests pass (`npm run test:run`)
- [x] TypeScript compilation succeeds (`npm run typecheck`)
- [x] Production build completes (`npm run build`)
- [x] ESLint passes (`npm run lint`)
- [ ] Manual testing: Dark mode toggle works
- [ ] Manual testing: Theme persists across reload
- [ ] Manual testing: Keyboard navigation in tree
- [ ] Manual testing: All three parsers produce output
- [ ] Manual testing: Export JSON downloads file
- [ ] Manual testing: Share URL encodes code
- [ ] Manual testing: Code highlights on node click

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```
