ALTER TABLE payments
  ADD COLUMN provider VARCHAR(50) DEFAULT NULL AFTER payment_method,
  ADD COLUMN status ENUM('Pending', 'Completed', 'Failed') NOT NULL DEFAULT 'Completed' AFTER provider,
  ADD COLUMN phone_number VARCHAR(20) DEFAULT NULL AFTER status,
  ADD COLUMN merchant_request_id VARCHAR(100) DEFAULT NULL AFTER phone_number,
  ADD COLUMN checkout_request_id VARCHAR(100) DEFAULT NULL AFTER merchant_request_id,
  ADD COLUMN receipt_number VARCHAR(100) DEFAULT NULL AFTER checkout_request_id,
  ADD COLUMN result_code INT DEFAULT NULL AFTER receipt_number,
  ADD COLUMN result_description VARCHAR(255) DEFAULT NULL AFTER result_code,
  ADD COLUMN transaction_date VARCHAR(20) DEFAULT NULL AFTER result_description,
  ADD COLUMN request_payload JSON DEFAULT NULL AFTER transaction_date,
  ADD COLUMN callback_payload JSON DEFAULT NULL AFTER request_payload;
