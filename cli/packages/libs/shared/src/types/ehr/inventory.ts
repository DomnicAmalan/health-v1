/**
 * Pharmacy Inventory types
 * Stock management, lot tracking, controlled substances
 */

/** Inventory item response */
export interface InventoryItem {
  ien: number;
  drugCode: string;
  drugName: string;
  locationCode: string;
  locationName?: string;
  quantityOnHand: number;
  reorderPoint: number;
  reorderQuantity: number;
  unit: string;
  lastUpdated: string;
  isLowStock: boolean;
  isControlled: boolean;
  schedule?: string;
}

/** Inventory list response */
export interface InventoryResponse {
  items: InventoryItem[];
}

/** Lot/batch information */
export interface InventoryLot {
  ien: number;
  inventoryIen: number;
  lotNumber: string;
  expirationDate: string;
  quantity: number;
  receivedDate: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

/** Lots list response */
export interface LotsResponse {
  lots: InventoryLot[];
}

/** Create inventory item request */
export interface CreateInventoryItemRequest {
  drugCode: string;
  drugName: string;
  locationCode: string;
  locationName?: string;
  quantityOnHand: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  unit?: string;
  isControlled?: boolean;
  schedule?: string;
}

/** Add lot request */
export interface AddLotRequest {
  lotNumber: string;
  expirationDate: string;
  quantity: number;
}

/** Adjust inventory request */
export interface AdjustInventoryRequest {
  quantity: number;
  reason: string;
  adjustedBy?: number;
  lotNumber?: string;
}

/** Inventory transaction record */
export interface InventoryTransaction {
  ien: number;
  inventoryIen: number;
  transactionType: "adjustment" | "receipt" | "dispense" | "return" | "waste";
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  performedBy?: number;
  lotNumber?: string;
  transactionDate: string;
}

/** Inventory transactions response */
export interface InventoryTransactionsResponse {
  transactions: InventoryTransaction[];
}

/** Low stock alert response */
export interface LowStockAlertResponse {
  items: InventoryItem[];
  count: number;
}

/** Expiring lots response */
export interface ExpiringLotsResponse {
  lots: InventoryLot[];
  count: number;
}

/** Inventory action response */
export interface InventoryActionResponse {
  success: boolean;
  ien: number;
}
