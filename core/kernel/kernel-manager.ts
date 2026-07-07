export type KernelModuleStatus = "registered" | "disabled" | "error";

export type KernelModuleDefinition = {
  id: string;
  label: string;
  route: string;
  layer: string;
  owner: string;
  status: KernelModuleStatus;
  dependencies: string[];
};

export type KernelHealthResult = {
  ok: boolean;
  moduleCount: number;
  errors: string[];
};

export class KernelManager {
  private modules = new Map<string, KernelModuleDefinition>();

  register(module: KernelModuleDefinition) {
    if (this.modules.has(module.id)) {
      throw new Error(`Module already registered: ${module.id}`);
    }

    this.modules.set(module.id, module);
  }

  listModules() {
    return Array.from(this.modules.values());
  }

  getModule(id: string) {
    return this.modules.get(id) ?? null;
  }

  validateDependencies(): KernelHealthResult {
    const errors: string[] = [];

    for (const module of this.modules.values()) {
      for (const dependency of module.dependencies) {
        if (!this.modules.has(dependency)) {
          errors.push(`${module.id} missing dependency ${dependency}`);
        }
      }
    }

    return {
      ok: errors.length === 0,
      moduleCount: this.modules.size,
      errors,
    };
  }
}

export const kernelManager = new KernelManager();
