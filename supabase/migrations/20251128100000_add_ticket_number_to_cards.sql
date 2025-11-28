ALTER TABLE cards ADD COLUMN ticket_number BIGSERIAL;
CREATE INDEX idx_cards_ticket_number ON cards(ticket_number);
