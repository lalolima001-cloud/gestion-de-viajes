import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ShieldAlert, CheckCircle, ArrowLeft, Loader2, Plane,
  AlertCircle, Users, UserPlus, Mail, BadgeCheck, Clock, Trash2,
  Eye, X, FileText, Calendar, MapPin, Upload,
  UserX, UserCheck, DollarSign
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const AEROPUERTOS: Record<string, string> = {
  LIM: 'Lima (Chavez)', AQP: 'Arequipa (Rodríguez Ballón)', CUZ: 'Cusco (Velasco Astete)',
  PIU: 'Piura (Concha Iberico)', TPP: 'Tarapoto', IQT: 'Iquitos (Secada Vignetta)',
  CIX: 'Chiclayo (Quiñones)', TRU: 'Trujillo (Martínez de Pinillos)', PCL: 'Pucallpa (David Abensur)',
  JUL: 'Juliaca (Manco Cápac)', TCQ: 'Tacna (Carlos Ciriani)', CJA: 'Cajamarca',
  AYP: 'Ayacucho', JAU: 'Jauja (Francisco Carlé)', PEM: 'Puerto Maldonado (Padre Aldamiz)',
  TBP: 'Tumbes', TYL: 'Talara', CHH: 'Chachapoyas', HUU: 'Huánuco', ATA: 'Anta / Huaraz'
};

interface Solicitud {
  id_solicitud: string;
  origen: string;
  destino: string;
  fecha_viaje_ida: string;
  fecha_viaje_vuelta: string | null;
  estado_solicitud: string;
  tipo_solicitud: string;
  incluye_hospedaje: boolean;
  justificacion_negocio: string | null;
  fecha_creacion: string;
  empleados: { nombres: string; ap_paterno: string; };
}

interface Empleado {
  id_empleado: string;
  nombres: string;
  ap_paterno: string;
  email_corporativo: string;
  dni: string | null;
  auth_user_id: string | null;
  activo: boolean;
}

interface CsvRow {
  nombres: string;
  ap_paterno: string;
  ap_materno: string;
  email_corporativo: string;
  dni: string;
  cargo: string;
  valid: boolean;
  error: string;
}

interface CotizacionVuelo {
  id_cotizacion: string;
  aerolinea: string;
  tarifa_usd: number;
  nro_vuelo_ida: string;
  nro_vuelo_vuelta: string | null;
}

type Tab = 'solicitudes' | 'compra' | 'empleados';

const ID_EMPRESA = '518b4493-3dd5-4980-b016-a55ee88114c0';

export default function AdminView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('solicitudes');

  // --- Solicitudes ---
  const [loading, setLoading] = useState(true);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [detalle, setDetalle] = useState<Solicitud | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // --- Empleados ---
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loadingEmp, setLoadingEmp] = useState(false);
  const [empError, setEmpError] = useState<string | null>(null);
  const [empSuccess, setEmpSuccess] = useState<string | null>(null);
  const [savingEmp, setSavingEmp] = useState(false);
  const [formEmp, setFormEmp] = useState({ nombres: '', ap_paterno: '', email_corporativo: '', dni: '', is_admin: false });

  // --- CSV carga masiva ---
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvImportResult, setCsvImportResult] = useState<{ ok: number; fail: number } | null>(null);
  // --- Compra (Cotizaciones) ---
  const [solicitudesCompra, setSolicitudesCompra] = useState<Solicitud[]>([]);
  const [loadingCompra, setLoadingCompra] = useState(false);
  const [cotizaciones, setCotizaciones] = useState<CotizacionVuelo[]>([]);
  const [selectedSol, setSelectedSol] = useState<Solicitud | null>(null);
  const [selectingQuote, setSelectingQuote] = useState(false);

  // Parse direct action from URL (from n8n email)
  useEffect(() => {
    const action = searchParams.get('action');
    const id = searchParams.get('id');
    if (action && id) {
      if (action === 'approve') handleDecision(id, 'aprobado', true);
      else if (action === 'reject') handleDecision(id, 'rechazado', true);
      setSearchParams({}, { replace: true });
    }
  }, []);

  // Nuevo: Efecto para selección directa de compra desde email
  useEffect(() => {
    const tab = searchParams.get('tab');
    const selectId = searchParams.get('select');

    if (tab === 'compra') {
      setActiveTab('compra');
      if (selectId && solicitudesCompra.length > 0) {
        const found = solicitudesCompra.find(s => s.id_solicitud === selectId);
        if (found) {
          setSelectedSol(found);
          fetchCotizaciones(found.id_solicitud);
          // Limpiamos los parámetros para que no se abra solo al refrescar
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('tab');
          newParams.delete('select');
          setSearchParams(newParams, { replace: true });
        }
      }
    }
  }, [searchParams, solicitudesCompra]);

  const fetchPendientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('solicitudes_viaje')
      .select('id_solicitud, origen, destino, fecha_viaje_ida, fecha_viaje_vuelta, estado_solicitud, tipo_solicitud, incluye_hospedaje, justificacion_negocio, fecha_creacion, empleados (nombres, ap_paterno)')
      .eq('estado_solicitud', 'enviado');
    if (error) setErrorMsg('No se pudieron cargar las solicitudes pendientes.');
    else setSolicitudes(data as any);
    setLoading(false);
  };

  const fetchEmpleados = async () => {
    setLoadingEmp(true);
    const { data, error } = await supabase
      .from('empleados')
      .select('id_empleado, nombres, ap_paterno, email_corporativo, dni, auth_user_id, activo')
      .eq('id_empresa', ID_EMPRESA)
      .order('nombres');
    if (!error && data) setEmpleados(data);
    setLoadingEmp(false);
  };

  const fetchCompra = async () => {
    setLoadingCompra(true);
    const { data, error } = await supabase
      .from('solicitudes_viaje')
      .select('*, empleados(nombres, ap_paterno)')
      .in('estado_solicitud', ['cotizando', 'aprobado', 'confirmado'])
      .order('fecha_creacion', { ascending: false });
    if (!error && data) setSolicitudesCompra(data);
    setLoadingCompra(false);
  };

  const fetchCotizaciones = async (id_solicitud: string) => {
    setCotizaciones([]);
    const { data, error } = await supabase
      .from('cotizaciones_vuelo')
      .select('*')
      .eq('id_solicitud', id_solicitud);
    
    if (error) {
      console.error('Error fetching quotes:', error);
      alert('Error de base de datos: ' + error.message);
    } else if (data) {
      setCotizaciones(data);
    }
  };

  useEffect(() => { fetchPendientes(); }, []);
  useEffect(() => { 
    if (activeTab === 'empleados') fetchEmpleados(); 
    if (activeTab === 'compra') fetchCompra();
  }, [activeTab]);

  const handleSelectQuote = async (id_cotizacion: string) => {
    if (!selectedSol) return;
    setSelectingQuote(true);
    
    try {
      // 1. Marcar cotización como seleccionada
      const { error: quoteErr } = await supabase.from('cotizaciones_vuelo').update({ seleccionada: true }).eq('id_cotizacion', id_cotizacion);
      if (quoteErr) throw quoteErr;
      
      // 2. Marcar solicitud como confirmada
      const { error: solErr } = await supabase.from('solicitudes_viaje').update({ estado_solicitud: 'confirmado' }).eq('id_solicitud', selectedSol.id_solicitud);
      if (solErr) throw solErr;
      
      // 3. Notificar a n8n directamente (Bypass de Supabase Webhook)
      const purchaseUrl = import.meta.env.VITE_N8N_WEBHOOK_PURCHASE_URL;
      fetch(purchaseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record: {
            id: id_cotizacion,
            id_cotizacion: id_cotizacion,
            seleccionada: true
          }
        })
      }).catch(err => console.error('Error notiying purchase to n8n:', err));
      
      alert('¡Compra registrada exitosamente! Se ha enviado la notificación a la agencia.');

      setSuccessMsg('¡Compra confirmada! El pasaje ha sido seleccionado exitosamente.');
      setSelectedSol(null);
      setCotizaciones([]);
      fetchCompra();
    } catch (err: any) {
      console.error('Error selecting quote:', err);
      alert('Error al procesar la selección: ' + (err.message || 'Error desconocido'));
    } finally {
      setSelectingQuote(false);
    }
  };

  const handleDecision = async (id_solicitud: string, decision: string, fromUrl = false) => {
    if (processingId) return; // Evitar múltiples clics
    setProcessingId(id_solicitud);
    setErrorMsg(null); setSuccessMsg(null);
    
    // 1. Actualizar estado en Supabase
    const { error } = await supabase
      .from('solicitudes_viaje')
      .update({ estado_solicitud: decision })
      .eq('id_solicitud', id_solicitud);
    
    if (error) {
      console.error('Error DB:', error);
      setErrorMsg(`Error al ${decision === 'aprobado' ? 'aprobar' : 'rechazar'}: ${error.message}`);
      setProcessingId(null);
      return; // Detenemos aquí, el modal NO se cierra
    }

    // 2. Si es aprobado, notificar a n8n (SIN AWAIT para no bloquear la UI)
    if (decision === 'aprobado') {
      const sol = solicitudes.find(s => s.id_solicitud === id_solicitud);
      if (sol) {
        const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_QUOTE_URL;
        
        const formatFecha = (fecha: string | null) => {
          if (!fecha) return 'N/A';
          const [y, m, d] = fecha.split('-');
          const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
          return `${parseInt(d)} de ${meses[parseInt(m) - 1]} de ${y}`;
        };
        const nombrePasajero = `${sol.empleados?.nombres} ${sol.empleados?.ap_paterno}`;

        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_solicitud: sol.id_solicitud,
            subject: `Solicitud de Cotización: ${nombrePasajero} | ${AEROPUERTOS[sol.origen] || sol.origen} → ${AEROPUERTOS[sol.destino] || sol.destino} - FARMEX`,
            pasajero: nombrePasajero,
            origen: AEROPUERTOS[sol.origen] || sol.origen,
            destino: AEROPUERTOS[sol.destino] || sol.destino,
            fecha_ida: formatFecha(sol.fecha_viaje_ida),
            fecha_vuelta: formatFecha(sol.fecha_viaje_vuelta),
            hospedaje: sol.incluye_hospedaje ? 'Sí' : 'No',
            justificacion: sol.justificacion_negocio
          })
        }).catch(err => console.error('Error n8n (async):', err));
      }
    }

    setProcessingId(null);
    setDetalle(null); // Ahora sí cerramos el modal, todo salió bien
    setSuccessMsg(`Solicitud marcada como ${decision} exitosamente.`);
    if (!fromUrl) setSolicitudes(prev => prev.filter(s => s.id_solicitud !== id_solicitud));
    else setTimeout(() => fetchPendientes(), 500);
  };

  const handleCrearEmpleado = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmp(true);
    setEmpError(null); setEmpSuccess(null);

    const { error } = await supabase.from('empleados').insert({
      nombres: formEmp.nombres.trim(),
      ap_paterno: formEmp.ap_paterno.trim(),
      email_corporativo: formEmp.email_corporativo.trim().toLowerCase(),
      dni: formEmp.dni.trim() || null,
      is_admin: formEmp.is_admin,
      id_empresa: ID_EMPRESA,
    });

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        setEmpError('Ya existe un empleado con ese correo en el sistema.');
      } else {
        setEmpError('Error al crear el empleado: ' + error.message);
      }
    } else {
      setEmpSuccess(`Empleado ${formEmp.nombres} ${formEmp.ap_paterno} creado. Cuando se registre en la app con ${formEmp.email_corporativo}, quedará vinculado automáticamente.`);
      setFormEmp({ nombres: '', ap_paterno: '', email_corporativo: '', dni: '', is_admin: false });
      fetchEmpleados();
    }
    setSavingEmp(false);
  };

  const handleEliminarEmpleado = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar a ${nombre}? Esta acción es irreversible y borrará todo su historial (solicitudes, cotizaciones, etc).`)) return;
    
    setEmpError(null);
    setEmpSuccess(null);
    
    // Intentar borrar
    const { error } = await supabase.from('empleados').delete().eq('id_empleado', id);
    
    if (error) {
      console.error('Error deleting employee:', error);
      if (error.code === '23503') {
        setEmpError(`No se puede eliminar a "${nombre}" porque tiene historial de viajes. Para restringir su acceso, usa la opción "Dar de baja" en su lugar.`);
      } else {
        setEmpError(`Error al eliminar: ${error.message}`);
      }
    } else {
      setEmpSuccess(`Empleado "${nombre}" eliminado permanentemente.`);
      fetchEmpleados();
    }
  };

  const handleToggleBaja = async (emp: Empleado) => {
    const accion = emp.activo ? 'dar de baja' : 'reactivar';
    if (!confirm(`¿Deseas ${accion} a ${emp.nombres} ${emp.ap_paterno}?`)) return;
    await supabase.from('empleados').update({ activo: !emp.activo }).eq('id_empleado', emp.id_empleado);
    fetchEmpleados();
  };

  const handleVincularManual = async (emp: Empleado) => {
    const authId = prompt(`Ingresa el UUID de Supabase Auth para vincular a ${emp.email_corporativo}:\n(Puedes encontrarlo en el menú Authentication de Supabase)`);
    if (!authId || authId.trim().length < 10) return;

    setLoadingEmp(true);
    const { error } = await supabase
      .from('empleados')
      .update({ auth_user_id: authId.trim() })
      .eq('id_empleado', emp.id_empleado);

    if (error) {
      alert('Error al vincular: ' + error.message);
    } else {
      setEmpSuccess(`¡Vinculación manual exitosa para ${emp.nombres}!`);
      fetchEmpleados();
    }
  };

  // CSV parsing
  const parseCsv = (text: string): CsvRow[] => {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ''));
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim());
      const get = (col: string) => vals[headers.indexOf(col)] ?? '';
      const email = get('email_corporativo').toLowerCase();
      const nombres = get('nombres');
      const ap_paterno = get('ap_paterno');
      const valid = !!(nombres && ap_paterno && email && email.includes('@'));
      return {
        nombres, ap_paterno,
        ap_materno: get('ap_materno'),
        email_corporativo: email,
        dni: get('dni'),
        cargo: get('cargo'),
        valid,
        error: valid ? '' : 'Faltan campos obligatorios (nombres, ap_paterno, email)',
      };
    });
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);
      setCsvRows(rows);
      setShowCsvModal(true);
      setCsvImportResult(null);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleCsvImport = async () => {
    setCsvImporting(true);
    const validRows = csvRows.filter(r => r.valid);
    let ok = 0; let fail = 0;
    for (const row of validRows) {
      const { error } = await supabase.from('empleados').insert({
        nombres: row.nombres, ap_paterno: row.ap_paterno, ap_materno: row.ap_materno || null,
        email_corporativo: row.email_corporativo, dni: row.dni || null, cargo: row.cargo || null,
        id_empresa: ID_EMPRESA,
      });
      if (error) fail++; else ok++;
    }
    setCsvImportResult({ ok, fail });
    setCsvImporting(false);
    if (ok > 0) fetchEmpleados();
  };

  const downloadTemplate = () => {
    const csv = 'nombres,ap_paterno,ap_materno,email_corporativo,dni,cargo\nJuan,García,López,jgarcia@farmex.com.pe,12345678,Analista\nMaría,Torres,,mtorres@farmex.com.pe,,Coordinadora';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'plantilla_empleados.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const estadoColor: Record<string, string> = {
    enviado: 'bg-amber-100 text-amber-700',
    aprobado: 'bg-green-100 text-green-700',
    rechazado: 'bg-red-100 text-red-700',
    confirmado: 'bg-blue-100 text-blue-700',
    completado: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="max-w-6xl mx-auto p-6 pt-12">
      <Link to="/dashboard" className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-blue-600 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Volver
      </Link>

      {/* ===== MODAL DETALLE ===== */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDetalle(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 flex justify-between items-center">
              <div>
                <p className="text-blue-100 text-xs font-medium mb-0.5">Detalle de Solicitud</p>
                <h2 className="text-white font-bold text-xl flex items-center">
                  <Plane className="w-5 h-5 mr-2" />
                  {detalle.origen} → {detalle.destino}
                </h2>
              </div>
              <button onClick={() => setDetalle(null)} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500">Estado</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide ${estadoColor[detalle.estado_solicitud] ?? 'bg-slate-100 text-slate-600'}`}>
                  {detalle.estado_solicitud}
                </span>
              </div>
              <hr className="border-slate-100" />
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Pasajero</p>
                  <p className="font-semibold text-slate-800">{detalle.empleados?.nombres} {detalle.empleados?.ap_paterno}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Ruta</p>
                  <p className="font-semibold text-slate-800">{AEROPUERTOS[detalle.origen] ?? detalle.origen} → {AEROPUERTOS[detalle.destino] ?? detalle.destino}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Fechas</p>
                  <p className="font-semibold text-slate-800">Ida: {detalle.fecha_viaje_ida}</p>
                  {detalle.fecha_viaje_vuelta && <p className="font-semibold text-slate-800">Retorno: {detalle.fecha_viaje_vuelta}</p>}
                </div>
              </div>
              {detalle.justificacion_negocio && (
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Justificación</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{detalle.justificacion_negocio}</p>
                  </div>
                </div>
              )}
            </div>

            {detalle.estado_solicitud === 'enviado' && (
              <div className="px-6 pb-6 grid grid-cols-2 gap-3">
                <button
                  disabled={!!processingId}
                  onClick={() => handleDecision(detalle.id_solicitud, 'aprobado')}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-bold py-2.5 rounded-xl flex items-center justify-center text-sm transition-colors"
                >
                  {processingId === detalle.id_solicitud ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1.5" /> Aprobar</>}
                </button>
                <button
                  disabled={!!processingId}
                  onClick={() => handleDecision(detalle.id_solicitud, 'rechazado')}
                  className="bg-red-100 hover:bg-red-200 disabled:bg-slate-100 disabled:text-slate-400 text-red-700 font-bold py-2.5 rounded-xl flex items-center justify-center text-sm transition-colors"
                >
                  <AlertCircle className="w-4 h-4 mr-1.5" /> Denegar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-100 mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-slate-800 mb-0.5">Panel de Administración</h1>
        <p className="text-sm text-slate-500">Gestión de aprobaciones de viajes y empleados FARMEX TMS.</p>
      </div>

      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setActiveTab('solicitudes')}
          className={`flex items-center px-4 py-2 rounded-xl font-semibold text-xs md:text-sm transition-all ${
            activeTab === 'solicitudes' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Plane className="w-4 h-4 mr-2" /> Solicitudes Pendientes
          {!loading && solicitudes.length > 0 && (
            <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${activeTab === 'solicitudes' ? 'bg-white text-blue-600' : 'bg-amber-100 text-amber-700'}`}>{solicitudes.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('compra')}
          className={`flex items-center px-4 py-2 rounded-xl font-semibold text-xs md:text-sm tracking-tight transition-all ${
            activeTab === 'compra' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <BadgeCheck className="w-4 h-4 mr-2" /> Aprobar Compra
        </button>
        <button
          onClick={() => setActiveTab('empleados')}
          className={`flex items-center px-4 py-2 rounded-xl font-semibold text-xs md:text-sm tracking-tight transition-all ${
            activeTab === 'empleados' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4 mr-2" /> Gestión de Empleados
        </button>
      </div>

      {activeTab === 'solicitudes' && (
        <>
          {errorMsg && <div className="mb-4 bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-center"><ShieldAlert className="w-5 h-5 mr-2" />{errorMsg}</div>}
          {successMsg && <div className="mb-4 bg-green-50 text-green-700 p-4 rounded-xl border border-green-100 flex items-center"><CheckCircle className="w-5 h-5 mr-2" />{successMsg}</div>}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-700">Solicitudes Pendientes</h2>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-lg">{loading ? '...' : `${solicitudes.length} Pendiente(s)`}</span>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="flex justify-center p-12 text-slate-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
              ) : solicitudes.length === 0 ? (
                <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3 opacity-50" />
                  <p className="text-slate-500 font-medium">No hay solicitudes pendientes.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {solicitudes.map((sol) => (
                    <div key={sol.id_solicitud} className="border border-slate-100 bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg uppercase flex items-center">
                            <Plane className="w-4 h-4 mr-2 text-blue-500" /> {sol.origen} &rarr; {sol.destino}
                          </h3>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">Pasajero: {sol.empleados?.nombres} {sol.empleados?.ap_paterno}</p>
                        </div>
                        <div className="mt-2 md:mt-0 text-left md:text-right">
                          <span className="text-xs bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-full uppercase tracking-wider">{sol.tipo_solicitud}</span>
                          <p className="text-sm font-semibold text-slate-700 mt-2">Salida: {sol.fecha_viaje_ida}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <button onClick={() => setDetalle(sol)} className="tracking-wide text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg flex items-center justify-center"><Eye className="w-4 h-4 mr-2" /> Detalle</button>
                        <button onClick={() => handleDecision(sol.id_solicitud, 'aprobado')} disabled={processingId === sol.id_solicitud} className="tracking-wide text-xs bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg flex items-center justify-center">Aprobar</button>
                        <button onClick={() => handleDecision(sol.id_solicitud, 'rechazado')} disabled={processingId === sol.id_solicitud} className="tracking-wide text-xs bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2 rounded-lg flex items-center justify-center">Denegar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'compra' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-700">Solicitudes para Compra</h2>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-lg">
                {loadingCompra ? '...' : `${solicitudesCompra.length} en proceso`}
              </span>
            </div>
            <div className="p-4">
              {loadingCompra ? (
                <div className="flex justify-center p-12 text-slate-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
              ) : solicitudesCompra.length === 0 ? (
                <p className="text-center py-8 text-slate-400">No hay solicitudes esperando cotización o compra.</p>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {solicitudesCompra.map(sol => (
                    <div key={sol.id_solicitud} className="border border-slate-100 rounded-2xl p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${sol.estado_solicitud === 'cotizando' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {sol.estado_solicitud}
                        </span>
                        <span className="text-[10px] text-slate-400">{new Date(sol.fecha_creacion).toLocaleDateString()}</span>
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm truncate uppercase mb-1">{sol.origen} &rarr; {sol.destino}</h3>
                      <p className="text-xs text-slate-500 mb-4">{sol.empleados.nombres} {sol.empleados.ap_paterno}</p>
                      
                      <button 
                        onClick={() => { setSelectedSol(sol); fetchCotizaciones(sol.id_solicitud); }}
                        className="w-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Ver Cotizaciones
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Modal de Selección de Cotización */}
          {selectedSol && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedSol(null)}>
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Seleccionar Opción de Vuelo</h2>
                    <p className="text-sm text-slate-500">{selectedSol.origen} &rarr; {selectedSol.destino} | {selectedSol.empleados.nombres} {selectedSol.empleados.ap_paterno}</p>
                  </div>
                  <button onClick={() => setSelectedSol(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="p-6 overflow-auto flex-1">
                  {cotizaciones.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400">Aún no se han recibido cotizaciones de la agencia para esta solicitud.</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      {cotizaciones.map((cot, i) => (
                        <div key={cot.id_cotizacion} className="border-2 border-slate-100 rounded-2xl p-5 hover:border-blue-400 transition-colors relative bg-white">
                          <div className="absolute -top-3 -left-3 w-8 h-8 bg-blue-600 text-white font-bold rounded-full flex items-center justify-center shadow-lg">
                            {i+1}
                          </div>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="text-lg font-bold text-slate-800">{cot.aerolinea}</p>
                              <p className="text-xs text-slate-400">Vuelo {cot.nro_vuelo_ida}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-black text-blue-600">${cot.tarifa_usd}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tarifa Final</p>
                            </div>
                          </div>
                          
                          <div className="bg-slate-50 rounded-xl p-3 mb-4 space-y-2">
                            <div className="flex items-center text-xs text-slate-600">
                              <Plane className="w-3.5 h-3.5 mr-2 text-slate-400" />
                              <span className="font-medium mr-2">Ida:</span> {cot.nro_vuelo_ida}
                            </div>
                            {cot.nro_vuelo_vuelta && (
                              <div className="flex items-center text-xs text-slate-600">
                                <Plane className="w-3.5 h-3.5 mr-2 text-slate-400 rotate-180" />
                                <span className="font-medium mr-2">Vuelta:</span> {cot.nro_vuelo_vuelta}
                              </div>
                            )}
                          </div>

                          <button 
                            disabled={selectingQuote}
                            onClick={() => handleSelectQuote(cot.id_cotizacion)}
                            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-200 text-white font-bold py-3 rounded-xl shadow-md shadow-green-100 transition-all flex items-center justify-center group"
                          >
                            {selectingQuote ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                              <>
                                <DollarSign className="w-4 h-4 mr-1.5 group-hover:scale-110 transition-transform" />
                                Confirmar y Comprar
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'empleados' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <div>
                <h2 className="font-bold text-slate-800 flex items-center"><UserPlus className="w-5 h-5 mr-2 text-blue-500" /> Registrar Empleado</h2>
                <p className="text-sm text-slate-500 mt-0.5">El empleado se vinculará automáticamente al registrarse.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={downloadTemplate} className="text-xs font-semibold text-slate-600 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50">Plantilla CSV</button>
                <button onClick={() => csvInputRef.current?.click()} className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl hover:bg-blue-100">Carga Masiva</button>
                <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />
              </div>
            </div>

            {empError && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">{empError}</div>}
            {empSuccess && <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg text-sm border border-green-100 flex items-start"><CheckCircle className="w-5 h-5 mr-2 mt-0.5" />{empSuccess}</div>}

            <form onSubmit={handleCrearEmpleado} className="grid md:grid-cols-4 gap-3">
              <input type="text" required placeholder="Nombres" value={formEmp.nombres} onChange={e => setFormEmp(p => ({ ...p, nombres: e.target.value }))} className="px-3 py-2 text-sm border rounded-xl" />
              <input type="text" required placeholder="Apellido Paterno" value={formEmp.ap_paterno} onChange={e => setFormEmp(p => ({ ...p, ap_paterno: e.target.value }))} className="px-3 py-2 text-sm border rounded-xl" />
              <input type="email" required placeholder="Correo @farmex.com.pe" value={formEmp.email_corporativo} onChange={e => setFormEmp(p => ({ ...p, email_corporativo: e.target.value }))} className="px-3 py-2 text-sm border rounded-xl" />
              <input type="text" placeholder="DNI (opcional)" value={formEmp.dni} onChange={e => setFormEmp(p => ({ ...p, dni: e.target.value }))} className="px-3 py-2 text-sm border rounded-xl" />
              
              <div className="md:col-span-3 flex items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <input 
                  type="checkbox" 
                  id="is_admin_toggle"
                  checked={formEmp.is_admin} 
                  onChange={e => setFormEmp(p => ({ ...p, is_admin: e.target.checked }))} 
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer" 
                />
                <label htmlFor="is_admin_toggle" className="ml-3 text-xs font-semibold text-slate-700 cursor-pointer">
                  Asignar Rol de Administrador <span className="text-[10px] font-normal text-slate-400 ml-1">(Podrá gestionar empleados y aprobar solicitudes)</span>
                </label>
              </div>
    
              <button type="submit" disabled={savingEmp} className="md:col-span-1 bg-blue-600 text-white text-sm font-semibold py-2 rounded-xl hover:bg-blue-700 transition-colors">Crear Empleado</button>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-700 flex items-center"><Users className="w-4 h-4 mr-2" /> Empleados Registrados</h2>
              <span className="text-xs font-bold text-slate-500">{loadingEmp ? '...' : `${empleados.length} empleado(s)`}</span>
            </div>
            <div className="p-4">
              {loadingEmp ? (
                <div className="flex justify-center p-8 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : empleados.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No hay empleados registrados aún.</p>
              ) : (
                <>
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start space-x-3 text-xs text-blue-800">
                    <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">Estados:</p>
                      <p>• <b>Activo:</b> Registrado y vinculado.</p>
                      <p>• <b className="text-amber-700">Sin cuenta:</b> Pre-registrado (debe crearse cuenta en la app).</p>
                      <p>• <b className="text-slate-500">Inactivo:</b> Deshabilitado temporalmente.</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {empleados.map(emp => (
                      <div key={emp.id_empleado} className={`flex items-center justify-between p-3 rounded-xl border ${emp.activo ? 'border-slate-100 hover:bg-slate-50' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                        <div className="flex items-center space-x-4">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${!emp.activo ? 'bg-slate-200 text-slate-400' : emp.auth_user_id ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                            {!emp.activo ? <UserX className="w-5 h-5" /> : emp.auth_user_id ? <BadgeCheck className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{emp.nombres} {emp.ap_paterno}</p>
                            <p className="text-sm text-slate-500 flex items-center"><Mail className="w-3.5 h-3.5 mr-1" />{emp.email_corporativo}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full cursor-help ${!emp.activo ? 'bg-slate-200 text-slate-500' : emp.auth_user_id ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`} title={!emp.activo ? 'Deshabilitado' : emp.auth_user_id ? 'Vinculado' : 'Debe registrarse en la app'}>
                            {!emp.activo ? '❌ Inactivo' : emp.auth_user_id ? '✓ Activo' : '⏳ Sin cuenta'}
                          </span>
                          
                          {emp.activo && !emp.auth_user_id && (
                            <button 
                              onClick={() => handleVincularManual(emp)} 
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
                              title="Vincular manualmente con ID de Auth"
                            >
                              <BadgeCheck className="w-4 h-4" />
                            </button>
                          )}

                          <button onClick={() => handleToggleBaja(emp)} className={`p-2 rounded-lg ${!emp.activo ? 'text-green-600 hover:bg-green-50' : 'text-amber-500 hover:bg-amber-50'}`}>
                            {!emp.activo ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleEliminarEmpleado(emp.id_empleado, `${emp.nombres} ${emp.ap_paterno}`)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !csvImporting && setShowCsvModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 flex justify-between items-center text-white">
              <h2 className="font-bold text-lg flex items-center"><Upload className="w-5 h-5 mr-2" /> {csvRows.length} fila(s) detectadas</h2>
              {!csvImporting && <button onClick={() => setShowCsvModal(false)}><X className="w-5 h-5" /></button>}
            </div>
            {csvImportResult ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-lg font-bold">Importación completada</p>
                <p className="text-slate-500"><span className="text-green-600 font-bold">{csvImportResult.ok} exitosos</span>, {csvImportResult.fail} omitidos.</p>
                <button onClick={() => setShowCsvModal(false)} className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-xl">Cerrar</button>
              </div>
            ) : (
              <>
                <div className="overflow-auto flex-1 p-4">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-slate-50"><th>#</th><th>Nombre</th><th>Email</th><th>Estado</th></tr></thead>
                    <tbody>
                      {csvRows.map((row, i) => (
                        <tr key={i} className={row.valid ? '' : 'bg-red-50'}>
                          <td className="p-2">{i+1}</td>
                          <td className="p-2">{row.nombres} {row.ap_paterno}</td>
                          <td className="p-2">{row.email_corporativo}</td>
                          <td className="p-2">{row.valid ? 'OK' : 'Error'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 border-t flex justify-end">
                  <button onClick={handleCsvImport} disabled={csvImporting || csvRows.filter(r => r.valid).length === 0} className="bg-blue-600 text-white px-6 py-2 rounded-xl">Importar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
