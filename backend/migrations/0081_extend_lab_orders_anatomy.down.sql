-- Rollback: Remove anatomy context columns from lab_orders

DROP INDEX IF EXISTS idx_lab_orders_order_context;
DROP INDEX IF EXISTS idx_lab_orders_anatomy_finding_id;
DROP INDEX IF EXISTS idx_lab_orders_body_system_id;

ALTER TABLE lab_orders
    DROP COLUMN IF EXISTS order_context,
    DROP COLUMN IF EXISTS anatomy_finding_id,
    DROP COLUMN IF EXISTS body_system_id;
