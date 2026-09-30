import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ModulesService } from './modules.service';
import { CUP360_MODULE_CATALOG_BOOTSTRAP } from './module-catalog.bootstrap';

@Injectable()
export class ModuleCatalogBootstrapService implements OnApplicationBootstrap {
  private readonly log = new Logger(ModuleCatalogBootstrapService.name);

  constructor(private readonly modules: ModulesService) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const result = await this.modules.syncModuleCatalog(CUP360_MODULE_CATALOG_BOOTSTRAP);
      if (result.created > 0) {
        this.log.log(`Catálogo: ${result.created} módulo(s) novo(s) registrado(s).`);
      }
    } catch (e) {
      this.log.warn(`Bootstrap catálogo falhou: ${(e as Error).message}`);
    }
  }
}
