-- ============================================================
-- 05_rpc_get_mi_empleado.sql
-- Función para obtener los datos del empleado logueado de forma segura
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_mi_empleado()
RETURNS TABLE (
    id_empleado UUID,
    nombres VARCHAR,
    ap_paterno VARCHAR,
    email_corporativo VARCHAR,
    is_admin BOOLEAN,
    puede_aprobar BOOLEAN,
    id_empresa UUID
) AS $$
BEGIN
    -- Retorna el registro de 'empleados' cuyo auth_user_id coincide con el del usuario logueado
    RETURN QUERY
    SELECT 
        e.id_empleado, 
        e.nombres, 
        e.ap_paterno, 
        e.email_corporativo, 
        e.is_admin, 
        e.puede_aprobar,
        e.id_empresa
    FROM public.empleados e
    WHERE e.auth_user_id = auth.uid()
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NOTA: Se usa SECURITY DEFINER para que la función pueda consultar la tabla 
-- 'empleados' incluso si las políticas RLS son estrictas, asegurando que 
-- el filtrado se haga correctamente por auth.uid().
