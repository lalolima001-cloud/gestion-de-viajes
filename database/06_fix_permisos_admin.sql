-- 06_fix_permisos_admin.sql
-- Ejecutar en el SQL Editor de Supabase para asegurar privilegios

-- 1. Forzar flag de admin para el usuario actual (basado en el correo logueado)
UPDATE public.empleados
SET is_admin = true, puede_aprobar = true
WHERE email_corporativo = (SELECT email FROM auth.users WHERE id = auth.uid());

-- 2. Simplificar Política de Update para evitar recursión lenta
-- Borramos la anterior si existe
DROP POLICY IF EXISTS "Admin puede actualizar solicitud" ON solicitudes_viaje;

-- Creamos una versión más directa que usa el RPC que ya definimos
CREATE POLICY "Admin puede actualizar solicitud" ON solicitudes_viaje
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM empleados 
        WHERE auth_user_id = auth.uid() 
        AND is_admin = true
    )
);

-- 3. Verificación: ¿Quién soy ahora?
SELECT id_empleado, nombres, is_admin 
FROM empleados 
WHERE auth_user_id = auth.uid();
