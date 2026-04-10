-- ============================================================
-- 04_trigger_vinculacion_automatica.sql
-- Automatización de la vinculación entre auth.users y empleados
-- ============================================================

-- 1. Función que realiza la vinculación
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    target_id_empleado UUID;
BEGIN
    -- Buscar si existe un empleado con ese correo que sea ACTIVO
    -- y que aún no tenga un auth_user_id asignado.
    UPDATE public.empleados
    SET auth_user_id = NEW.id
    WHERE email_corporativo = NEW.email
    AND activo = true
    AND auth_user_id IS NULL;

    -- Si se desea loguear algo o realizar alguna acción adicional
    -- se puede hacer aquí.

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger que se ejecuta después de que un usuario se registra/crea en Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- NOTAS:
-- - "SECURITY DEFINER" permite que la función se ejecute con los permisos
--   del creador (dueño), lo cual es necesario para que el usuario anónimo
--   que se está registrando pueda actualizar la tabla 'empleados'.
-- - El trigger actúa sobre 'auth.users', que es una tabla interna de Supabase.
-- - Esto soluciona de raíz el problema de "Usuario no vinculado a nómina".
