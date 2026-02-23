// Joplin Plugin API — type stubs for compilation.
// The real implementation is injected by the Joplin runtime.

declare const joplin: {
  plugins: {
    register(plugin: { onStart: () => Promise<void> }): Promise<void>;
  };
  commands: {
    register(cmd: {
      name: string;
      label: string;
      iconName?: string;
      execute: () => Promise<void>;
    }): Promise<void>;
    execute(name: string, ...args: any[]): Promise<any>;
  };
  views: {
    panels: {
      create(id: string): Promise<string>;
      setHtml(handle: string, html: string): Promise<void>;
      show(handle: string): Promise<void>;
      hide(handle: string): Promise<void>;
      onMessage(handle: string, cb: (msg: any) => Promise<any>): Promise<void>;
    };
    menuItems: {
      create(
        id: string,
        commandName: string,
        location: any,
        options?: any
      ): Promise<void>;
    };
  };
  data: {
    get(
      path: string[],
      query?: Record<string, any>
    ): Promise<{ items: any[]; has_more: boolean }>;
  };
};

export default joplin;
