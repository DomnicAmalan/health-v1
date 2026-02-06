-- Migration: Extend lab_orders with anatomy context
-- Links lab orders to body systems and anatomy findings for context-aware ordering

ALTER TABLE lab_orders
    ADD COLUMN IF NOT EXISTS body_system_id UUID, -- References body_systems(id) when that table exists
    ADD COLUMN IF NOT EXISTS anatomy_finding_id UUID, -- References anatomy_findings(id) when that table exists
    ADD COLUMN IF NOT EXISTS order_context VARCHAR(50) CHECK (order_context IN ('anatomy_based', 'routine', 'follow_up', 'protocol'));

CREATE INDEX idx_lab_orders_body_system_id ON lab_orders(body_system_id) WHERE body_system_id IS NOT NULL;
CREATE INDEX idx_lab_orders_anatomy_finding_id ON lab_orders(anatomy_finding_id) WHERE anatomy_finding_id IS NOT NULL;
CREATE INDEX idx_lab_orders_order_context ON lab_orders(order_context) WHERE order_context IS NOT NULL;

COMMENT ON COLUMN lab_orders.body_system_id IS 'Body system that prompted this order (e.g., DIGESTIVE_LIVER → LFTs)';
COMMENT ON COLUMN lab_orders.anatomy_finding_id IS 'Specific anatomical finding that prompted this order';
COMMENT ON COLUMN lab_orders.order_context IS 'Ordering context: anatomy_based (from 3D model), routine, follow_up, protocol';
