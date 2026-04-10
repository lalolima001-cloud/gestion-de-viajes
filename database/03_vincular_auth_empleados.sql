-- ============================================================
-- 03_vincular_auth_empleados.sql
-- Script de apoyo para vincular usuarios de Supabase Auth
-- con sus registros en la tabla 'empleados'
-- ============================================================

-- PASO 0: DIAGNÓSTICO
-- Ver todos los usuarios registrados en Supabase Auth
SELECT 
    id AS auth_user_id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- ============================================================

-- Ver empleados YA vinculados (auth_user_id no es NULL)
SELECT 
    e.id_empleado,
    e.nombres || ' ' || e.ap_paterno AS nombre_completo,
    e.email_corporativo,
    e.auth_user_id,
    u.email AS auth_email
FROM empleados e
JOIN auth.users u ON e.auth_user_id = u.id;

-- ============================================================

-- Ver empleados SIN vincular (auth_user_id es NULL) --> estos son el problema
SELECT 
    id_empleado,
    nombres || ' ' || ap_paterno AS nombre_completo,
    email_corporativo,
    cargo,
    is_admin
FROM empleados
WHERE auth_user_id IS NULL;

-- ============================================================

-- PASO 1: VINCULAR UN EMPLEADO CON SU USUARIO AUTH
-- Ejecutar UNA VEZ por cada empleado que tenga cuenta en Supabase Auth.
-- Reemplaza los valores entre <> con los datos reales.

/*
UPDATE empleados
SET auth_user_id = '<UUID-DEL-USUARIO-EN-AUTH.USERS>'
WHERE email_corporativo = '<email.corporativo@farmex.com.pe>';
*/

-- EJEMPLO REAL (descomenta y modifica):
-- UPDATE empleados
-- SET auth_user_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
-- WHERE email_corporativo = 'eduardo.aramburu@farmex.com.pe';

-- ============================================================

-- PASO 2 (OPCIONAL): Dar permisos de admin a un usuario
/*
UPDATE empleados
SET is_admin = true
WHERE email_corporativo = '<email.admin@farmex.com.pe>';
*/

-- ============================================================

-- VERIFICACIÓN FINAL: Confirmar que la vinculación quedó bien
SELECT 
    e.nombres || ' ' || e.ap_paterno AS nombre_completo,
    e.email_corporativo,
    e.is_admin,
    e.puede_aprobar,
    e.auth_user_id,
    CASE WHEN e.auth_user_id IS NULL THEN '❌ SIN VINCULAR' ELSE '✅ VINCULADO' END AS estado
FROM empleados e
ORDER BY e.is_admin DESC, nombre_completo;

-- ============================================================
-- NOTAS:
-- 1. El auth_user_id en empleados debe coincidir con el campo
--    "id" de la tabla auth.users (NO el email).
-- 2. El RLS de 'empleados' usa auth.uid() == auth_user_id
--    para que cada usuario solo vea su propio registro.
-- 3. Si ves el error "Tu usuario no está vinculado a nómina"
--    en la app, es porque auth_user_id IS NULL para ese usuario.
-- ============================================================
