-- 02_politicas_rls.sql
-- Habilitar RLS (Row Level Security) en cada tabla para operar con Supabase
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes_viaje ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones_vuelo ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones_hotel ENABLE ROW LEVEL SECURITY;
ALTER TABLE aprobaciones ENABLE ROW LEVEL SECURITY;

-------------------------------------------------------------------------------
-- 1. Políticas de EMPRESAS y PROVEEDORES (Solo lectura para todos los autenticados)
-------------------------------------------------------------------------------
CREATE POLICY "Lectura global de empresas" ON empresas
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Lectura global de proveedores" ON proveedores
FOR SELECT USING (auth.role() = 'authenticated');

-------------------------------------------------------------------------------
-- 2. Políticas de EMPLEADOS
-------------------------------------------------------------------------------
-- El usuario autenticado (auth.uid()) puede ver su propio registro de empleado,
-- el registro de quienes le reportan directamente (él es su id_jefe_directo),
-- o bien, sí él es 'admin', ve todo.
CREATE POLICY "Visibilidad de perfiles empleados" ON empleados
FOR SELECT USING (
    auth_user_id = auth.uid() OR 
    id_jefe_directo = (SELECT id_empleado FROM empleados WHERE auth_user_id = auth.uid()) OR
    (SELECT is_admin FROM empleados WHERE auth_user_id = auth.uid()) = true
);

-------------------------------------------------------------------------------
-- 3. Políticas de SOLICITUDES DE VIAJE
-------------------------------------------------------------------------------
-- Inserción: Solo pueden insertar viajes para su propio ID
CREATE POLICY "Empleado inserta sus propios viajes" ON solicitudes_viaje
FOR INSERT WITH CHECK (
    id_empleado = (SELECT id_empleado FROM empleados WHERE auth_user_id = auth.uid())
);

-- Lectura: Pueden leer sus propios viajes, o si son sus jefes, o si es el admin
CREATE POLICY "Visibilidad de solicitudes de viaje" ON solicitudes_viaje
FOR SELECT USING (
    id_empleado = (SELECT id_empleado FROM empleados WHERE auth_user_id = auth.uid()) OR
    id_empleado IN (SELECT id_empleado FROM empleados WHERE id_jefe_directo = (SELECT id_empleado FROM empleados WHERE auth_user_id = auth.uid())) OR
    (SELECT is_admin FROM empleados WHERE auth_user_id = auth.uid()) = true
);

-- Edición: Solo pueden modificar el estado del viaje si son el admin (y el sistema es manejado por el admin)
CREATE POLICY "Admin puede actualizar solicitud" ON solicitudes_viaje
FOR UPDATE USING (
    (SELECT is_admin FROM empleados WHERE auth_user_id = auth.uid()) = true
);

-------------------------------------------------------------------------------
-- 4. Políticas de COTIZACIONES (Vuelo y Hotel)
-------------------------------------------------------------------------------
-- Lectura: Igual que sus solicitudes de viaje (solo si pueden ver la solicitud, pueden ver la cotización)
CREATE POLICY "Visibilidad cotizaciones de vuelo" ON cotizaciones_vuelo
FOR SELECT USING (
    id_solicitud IN (
        SELECT id_solicitud FROM solicitudes_viaje 
        WHERE 
            id_empleado = (SELECT id_empleado FROM empleados WHERE auth_user_id = auth.uid()) OR
            id_empleado IN (SELECT id_empleado FROM empleados WHERE id_jefe_directo = (SELECT id_empleado FROM empleados WHERE auth_user_id = auth.uid())) OR
            (SELECT is_admin FROM empleados WHERE auth_user_id = auth.uid()) = true
    )
);

CREATE POLICY "Visibilidad cotizaciones de hotel" ON cotizaciones_hotel
FOR SELECT USING (
    id_solicitud IN (
        SELECT id_solicitud FROM solicitudes_viaje 
        WHERE 
            id_empleado = (SELECT id_empleado FROM empleados WHERE auth_user_id = auth.uid()) OR
            id_empleado IN (SELECT id_empleado FROM empleados WHERE id_jefe_directo = (SELECT id_empleado FROM empleados WHERE auth_user_id = auth.uid())) OR
            (SELECT is_admin FROM empleados WHERE auth_user_id = auth.uid()) = true
    )
);

-------------------------------------------------------------------------------
-- 5. Políticas de APROBACIONES
-------------------------------------------------------------------------------
-- Lectura: El aprobador asignado puede verla, o el creador de la solicitud, o admin.
CREATE POLICY "Visibilidad de aprobaciones" ON aprobaciones
FOR SELECT USING (
    id_aprobador = (SELECT id_empleado FROM empleados WHERE auth_user_id = auth.uid()) OR
    id_solicitud IN (SELECT id_solicitud FROM solicitudes_viaje WHERE id_empleado = (SELECT id_empleado FROM empleados WHERE auth_user_id = auth.uid())) OR
    (SELECT is_admin FROM empleados WHERE auth_user_id = auth.uid()) = true
);

-- Edición (Actualización): Sólo el `id_aprobador` designado puede modificar el campo 'decision' y 'motivo_rechazo'
CREATE POLICY "Aprobador puede actualizar su decisión" ON aprobaciones
FOR UPDATE USING (
    id_aprobador = (SELECT id_empleado FROM empleados WHERE auth_user_id = auth.uid())
);
