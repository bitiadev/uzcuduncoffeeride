-- Migración: Ruteador de Pagos (Versión robusta)
-- Fecha: 2026-03-18

CREATE TABLE IF NOT EXISTS pasarela (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    habilitada BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mediopago (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    logo_url VARCHAR(255) NULL,
    badge_texto VARCHAR(100) NULL, -- Opcional: Texto de promoción (ej: '6 cuotas sin interés')
    pasarela_id INT NULL REFERENCES pasarela(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed inicial (solo inserta si la tabla está vacía)
INSERT INTO pasarela (nombre, habilitada) 
SELECT 'Payway', TRUE WHERE NOT EXISTS (SELECT 1 FROM pasarela WHERE nombre = 'Payway');

INSERT INTO pasarela (nombre, habilitada) 
SELECT 'Nave', FALSE WHERE NOT EXISTS (SELECT 1 FROM pasarela WHERE nombre = 'Nave');

INSERT INTO mediopago (nombre, logo_url, badge_texto, pasarela_id) 
SELECT 'Visa', '/logos/visa.png', '6 cuotas sin interés', 1 
WHERE NOT EXISTS (SELECT 1 FROM mediopago WHERE nombre = 'Visa');

INSERT INTO mediopago (nombre, logo_url, badge_texto, pasarela_id) 
SELECT 'Mastercard', '/logos/mastercard.png', NULL, 1 
WHERE NOT EXISTS (SELECT 1 FROM mediopago WHERE nombre = 'Mastercard');

INSERT INTO mediopago (nombre, logo_url, badge_texto, pasarela_id) 
SELECT 'AMEX', '/logos/amex.png', NULL, 1 
WHERE NOT EXISTS (SELECT 1 FROM mediopago WHERE nombre = 'AMEX');

INSERT INTO mediopago (nombre, logo_url, badge_texto, pasarela_id) 
SELECT 'Débito Visa', '/logos/visa-debito.png', NULL, 1 
WHERE NOT EXISTS (SELECT 1 FROM mediopago WHERE nombre = 'Débito Visa');
