export class Registry {
  private readonly modules = new Map<string, unknown>();

  registerModule(name: string, module: unknown): void {
    this.modules.set(name, module);
  }

  getModule(name: string): unknown {
    return this.modules.get(name);
  }
}
