declare module 'codeflask' {
  interface CodeFlaskOptions {
    language?: string;
    rtl?: boolean;
    tabSize?: number;
    enableAutocorrect?: boolean;
    lineNumbers?: boolean;
    defaultTheme?: boolean;
    areaId?: string;
    ariaLabelledby?: string;
    readonly?: boolean;
  }

  class CodeFlask {
    constructor(selector: string | HTMLElement, options?: CodeFlaskOptions);
    updateCode(code: string): void;
    getCode(): string;
    onUpdate(callback: (code: string) => void): void;
    enableReadonlyMode(): void;
    disableReadonlyMode(): void;
  }

  export default CodeFlask;
}
