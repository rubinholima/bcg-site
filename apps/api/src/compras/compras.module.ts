import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { HelloSignModule } from '../hello-sign/hello-sign.module';
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
import { PurchaseWorkflowController, MyRequisitionsController } from './purchase-workflow.controller';
import { PurchaseWorkflowService } from './purchase-workflow.service';
import { TiSupportController, TiPublicController } from './ti-support.controller';
import { TiSupportService } from './ti-support.service';
import { InventoryCategoriesController } from './inventory-categories.controller';
import { InventoryCategoriesService } from './inventory-categories.service';
import { ComprasReportsController } from './compras-reports.controller';
import { ComprasReportsService } from './compras-reports.service';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { MailService } from '../common/mail.service';
import { WorkflowNotifyService } from './workflow-notify.service';

@Module({
  imports: [AuthModule, ModulesModule, HelloSignModule],
  controllers: [
    SuppliersController,
    ProductsController,
    PurchaseRequisitionsController,
    PurchaseOrdersController,
    StockMovementsController,
    PurchaseWorkflowController,
    MyRequisitionsController,
    TiSupportController,
    TiPublicController,
    InventoryCategoriesController,
    ComprasReportsController,
  ],
  providers: [
    SuppliersService,
    ProductsService,
    InventoryCategoriesService,
    PurchaseRequisitionsService,
    PurchaseOrdersService,
    StockMovementsService,
    PurchaseWorkflowService,
    TiSupportService,
    ComprasReportsService,
    ModuleAccessGuard,
    MailService,
    WorkflowNotifyService,
  ],
  exports: [
    SuppliersService,
    ProductsService,
    PurchaseRequisitionsService,
    PurchaseOrdersService,
    StockMovementsService,
    PurchaseWorkflowService,
    TiSupportService,
  ],
})
export class ComprasModule {}
