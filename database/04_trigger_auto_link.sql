-- ============================================================
-- 04_trigger_auto_link.sql
-- Trigger para vincular automáticamente nuevos usuarios de
-- Supabase Auth con su registro en la tabla 'empleados'.
--
-- Requisito: El empleado debe existir previamente en la tabla
-- 'empleados' con el mismo email en 'email_corporativo'.
-- ============================================================

-- Función que ejecuta el trigger
CREATE OR REPLACE FUNCTION auto_link_empleado_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- Se ejecuta con permisos de superadmin
SET search_path = public
AS $$
BEGIN
  -- Buscar un empleado cuyo email coincida con el del nuevo usuario Auth
  -- y que aún no tenga auth_user_id asignado
  UPDATE public.empleados
  SET auth_user_id = NEW.id
  WHERE email_corporativo = NEW.email
    AND auth_user_id IS NULL;

  RETURN NEW;
END;
$$;

-- Crear el trigger en auth.users
-- Se dispara DESPUÉS de cada INSERT (nuevo registro de usuario)
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_empleado_on_signup();

-- ============================================================
-- VERIFICACIÓN: Probar que el trigger existe
SELECT trigger_name, event_manipulation, event_object_schema, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
-- ============================================================
-- NOTAS:
-- 1. El empleado DEBE existir en 'empleados' antes del registro.
--    El proceso correcto es:
--    a) El admin inserta al empleado en 'empleados' con su email corporativo.
--    b) El empleado se registra en la app con ese mismo email.
--    c) El trigger lo vincula automáticamente.
--
-- 2. Si el empleado no existe en la tabla, el UPDATE no hace nada
--    y el usuario quedará sin vincular (mantendrá el comportamiento actual).
--
-- 3. Para administrar el id_empresa, el admin debe asignarlo al
--    crear el registro del empleado en 'empleados'.
-- ============================================================
