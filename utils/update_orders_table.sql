-- Actualización: Agregar medio_pago_id a pedido
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS medio_pago_id INT REFERENCES mediopago(id) ON DELETE SET NULL;
