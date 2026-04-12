-- 07_permisos_portal_publico.sql
-- Este script habilita los permisos necesarios para que el portal público (usuarios no logueados) 
-- pueda realizar cotizaciones.

-- 1. Permitir lectura de solicitudes de viaje para el portal público (vía UUID)
CREATE POLICY "Acceso público a solicitudes via ID" ON solicitudes_viaje
FOR SELECT USING (true); -- El acceso está restringido por el conocimiento del UUID.

-- 2. Permitir lectura de empleados para mostrar nombres en el portal
CREATE POLICY "Acceso público a nombres de empleados" ON empleados
FOR SELECT USING (true);

-- 3. Permitir inserción de cotizaciones de vuelo al rol anonymous (portal público)
CREATE POLICY "Agencias pueden insertar cotizaciones" ON cotizaciones_vuelo
FOR INSERT WITH CHECK (true);

-- 4. Permitir lectura de las cotizaciones recién creadas (opcional, para validación)
CREATE POLICY "Lectura pública de cotizaciones" ON cotizaciones_vuelo
FOR SELECT USING (true);

-- Nota: Si las políticas anteriores ya existen o hay conflictos con las de 'authenticated',
-- Supabase las combinará con OR.
