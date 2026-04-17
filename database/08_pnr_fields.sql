-- 08_pnr_fields.sql
-- Añadir campos para códigos de reserva (PNR) de la agencia

-- 1. Campos en cotizaciones_vuelo
ALTER TABLE cotizaciones_vuelo 
ADD COLUMN IF NOT EXISTS pnr_vuelo_ida VARCHAR(50),
ADD COLUMN IF NOT EXISTS pnr_vuelo_vuelta VARCHAR(50);

-- 2. Permitir que la agencia (anon) actualice sus propios PNRs
-- Nota: La agencia solo debería poder actualizar si conoce el UUID de la cotización
CREATE POLICY "Agencias pueden actualizar PNR" ON cotizaciones_vuelo
FOR UPDATE TO anon
USING (true)
WITH CHECK (true);

-- 3. Asegurar que el portal público pueda actualizar el estado de la solicitud a 'completado'
CREATE POLICY "Portal público puede completar solicitud" ON solicitudes_viaje
FOR UPDATE TO anon
USING (true)
WITH CHECK (true);
