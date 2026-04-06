import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log('--- DIAGNOSTICO DE SUPABASE ---');
  console.log('Verificando empleados...');
  const { data: emp, error: errEmp } = await supabase.from('empleados').select('*');
  console.log('Empleados encontrados:', emp ? emp.length : 0);
  if (errEmp) console.error('Error leyendo empleados:', errEmp);

  console.log('Intentando insertar solicitud...');
  const { data, error } = await supabase
    .from('solicitudes_viaje')
    .insert([
      {
        id_empresa: '11111111-1111-1111-1111-111111111111',
        id_empleado: '22222222-2222-2222-2222-222222222222',
        tipo_solicitud: 'individual',
        origen: 'LIM',
        destino: 'CUZ',
        fecha_viaje_ida: '2026-05-01',
        justificacion_negocio: 'Test Manual Backend',
        estado_solicitud: 'enviado'
      }
    ])
    .select();
    
  if (error) {
    console.error('❌ Error al insertar:', error);
  } else {
    console.log('✅ Insertado correctamente. ID:', data[0].id_solicitud);
  }
}

testInsert();
