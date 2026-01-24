import { describe, it, expect } from 'vitest';
import { parseCode, PARSERS, getParserInfo } from '../parsers';

describe('parseCode', () => {
  describe('with Esprima', () => {
    it('should parse valid JavaScript', () => {
      const result = parseCode('const x = 1;', 'esprima');

      expect(result.success).toBe(true);
      expect(result.parserUsed).toBe('esprima');
      if (result.success) {
        expect(result.ast.type).toBe('Program');
      }
    });

    it('should return error for invalid JavaScript', () => {
      const result = parseCode('const x = ;', 'esprima');

      expect(result.success).toBe(false);
      expect(result.parserUsed).toBe('esprima');
    });

    it('should include location information', () => {
      const result = parseCode('const x = 1;', 'esprima');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.loc).toBeDefined();
        expect(result.ast.range).toBeDefined();
      }
    });
  });

  describe('with Acorn', () => {
    it('should parse valid JavaScript', () => {
      const result = parseCode('const x = 1;', 'acorn');

      expect(result.success).toBe(true);
      expect(result.parserUsed).toBe('acorn');
      if (result.success) {
        expect(result.ast.type).toBe('Program');
      }
    });

    it('should return error for invalid JavaScript', () => {
      const result = parseCode('const x = ;', 'acorn');

      expect(result.success).toBe(false);
      expect(result.parserUsed).toBe('acorn');
    });

    it('should include location information', () => {
      const result = parseCode('const x = 1;', 'acorn');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ast.loc).toBeDefined();
      }
    });
  });

  describe('with Babel', () => {
    it('should parse valid JavaScript', () => {
      const result = parseCode('const x = 1;', 'babel');

      expect(result.success).toBe(true);
      expect(result.parserUsed).toBe('babel');
      if (result.success) {
        expect(result.ast.type).toBe('File');
      }
    });

    it('should return error for invalid JavaScript', () => {
      const result = parseCode('const x = ;', 'babel');

      expect(result.success).toBe(false);
      expect(result.parserUsed).toBe('babel');
    });

    it('should parse JSX syntax', () => {
      const result = parseCode('const el = <div>Hello</div>;', 'babel');

      expect(result.success).toBe(true);
    });

    it('should parse TypeScript syntax', () => {
      const result = parseCode('const x: number = 1;', 'babel');

      expect(result.success).toBe(true);
    });
  });

  describe('default parser', () => {
    it('should use esprima by default', () => {
      const result = parseCode('const x = 1;');

      expect(result.parserUsed).toBe('esprima');
    });
  });
});

describe('PARSERS', () => {
  it('should have three parsers', () => {
    expect(PARSERS).toHaveLength(3);
  });

  it('should have esprima, acorn, and babel', () => {
    const ids = PARSERS.map((p) => p.id);
    expect(ids).toContain('esprima');
    expect(ids).toContain('acorn');
    expect(ids).toContain('babel');
  });

  it('should have name and description for each parser', () => {
    for (const parser of PARSERS) {
      expect(parser.name).toBeTruthy();
      expect(parser.description).toBeTruthy();
    }
  });
});

describe('getParserInfo', () => {
  it('should return parser info for valid parser', () => {
    const info = getParserInfo('esprima');

    expect(info).toBeDefined();
    expect(info?.id).toBe('esprima');
    expect(info?.name).toBe('Esprima');
  });

  it('should return undefined for invalid parser', () => {
    // @ts-expect-error Testing invalid input
    const info = getParserInfo('invalid');

    expect(info).toBeUndefined();
  });
});
