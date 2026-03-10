import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PurchaseRequisitionsController } from './purchase-requisitions.controller';
import { PurchaseRequisitionsService } from './purchase-requisitions.service';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import { StockMovementsController } from './stock-movements.controller';
import { StockMovementsService } from './stock-movements.service';
import { ModuleAccessGuard } from '../auth/module-access.guard';

@Module({
  imports: [AuthModule, ModulesModule],
  controllers: [
    SuppliersController,
    ProductsController,
    PurchaseRequisitionsController,
    PurchaseOrdersController,
    StockMovementsController,
  ],
  providers: [
    SuppliersService,
    ProductsService,
    PurchaseRequisitionsService,
    PurchaseOrdersService,
    StockMovementsService,
    ModuleAccessGuard,
  ],
  exports: [SuppliersService, ProductsService, PurchaseRequisitionsService, PurchaseOrdersService, StockMovementsService],
})
export class ComprasModule {}
