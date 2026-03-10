export interface PurchaseRequisitionItem {
  productId?: string;
  description: string;
  quantity: number;
  unit?: string;
  estimatedUnitPrice?: number;
}
