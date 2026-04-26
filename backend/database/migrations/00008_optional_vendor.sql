-- +goose Up
ALTER TABLE payment_vouchers ALTER COLUMN vendor_id DROP NOT NULL;

-- +goose Down
ALTER TABLE payment_vouchers ALTER COLUMN vendor_id SET NOT NULL;
