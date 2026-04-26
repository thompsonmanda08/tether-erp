-- +goose Up
-- Add procurement flow support
-- Goods-First flow: PV references the approved GRN that preceded it
-- Payment-First flow: GRN references the approved PV that preceded it

-- Cross-link columns
ALTER TABLE payment_vouchers ADD COLUMN IF NOT EXISTS linked_grn VARCHAR(100) DEFAULT '';
ALTER TABLE goods_received_notes ADD COLUMN IF NOT EXISTS linked_pv VARCHAR(100) DEFAULT '';

-- Per-PO override (empty = inherit from org setting)
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS procurement_flow VARCHAR(20) DEFAULT '';

-- Org-level default
ALTER TABLE organization_settings ADD COLUMN IF NOT EXISTS procurement_flow VARCHAR(20) DEFAULT 'goods_first';

-- +goose Down
ALTER TABLE payment_vouchers DROP COLUMN IF EXISTS linked_grn;
ALTER TABLE goods_received_notes DROP COLUMN IF EXISTS linked_pv;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS procurement_flow;
ALTER TABLE organization_settings DROP COLUMN IF EXISTS procurement_flow;
