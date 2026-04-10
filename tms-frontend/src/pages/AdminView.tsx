import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ShieldAlert, CheckCircle, ArrowLeft, Loader2, Plane,
  AlertCircle, Users, UserPlus, Mail, BadgeCheck, Clock, Trash2,
  Eye, X, Hotel, FileText, Calendar, MapPin
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
}

type Tab = 'solicitudes' | 'empleados';

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
  const [formEmp, setFormEmp] = useState({ nombres: '', ap_paterno: '', email_corporativo: '', dni: '' });

  // Parse direct action from URL (from n8n email)
  useEffect(() => {
    const action = searchParams.get('action');
    const id = searchParams.get('id');
    if (action && id) {
      if (action === 'approve') handleDecision(id, 'aprobado', true);
      else if (action === 'reject') handleDecision(id, 'rechazado', true);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      .select('id_empleado, nombres, ap_paterno, email_corporativo, dni, auth_user_id')
      .eq('id_empresa', ID_EMPRESA)
      .order('nombres');
    if (!error && data) setEmpleados(data);
    setLoadingEmp(false);
  };

  useEffect(() => { fetchPendientes(); }, []);
  useEffect(() => { if (activeTab === 'empleados') fetchEmpleados(); }, [activeTab]);

  const handleDecision = async (id_solicitud: string, decision: string, fromUrl = false) => {
    setProcessingId(id_solicitud);
    setErrorMsg(null); setSuccessMsg(null);
    const { error } = await supabase
      .from('solicitudes_viaje')
      .update({ estado_solicitud: decision })
      .eq('id_solicitud', id_solicitud);
    setProcessingId(null);
    if (error) {
      setErrorMsg(`Error al ${decision === 'aprobado' ? 'aprobar' : 'rechazar'} la solicitud.`);
    } else {
      setSuccessMsg(`Solicitud marcada como ${decision} exitosamente.`);
      if (!fromUrl) setSolicitudes(prev => prev.filter(s => s.id_solicitud !== id_solicitud));
      else setTimeout(() => fetchPendientes(), 500);
    }
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
      setFormEmp({ nombres: '', ap_paterno: '', email_corporativo: '', dni: '' });
      fetchEmpleados();
    }
    setSavingEmp(false);
  };

  const handleEliminarEmpleado = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar a ${nombre}? Esta acción es irreversible.`)) return;
    const { error } = await supabase.from('empleados').delete().eq('id_empleado', id);
    if (!error) fetchEmpleados();
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
            {/* Header */}
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
              {/* Estado */}
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-500">Estado</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide ${estadoColor[detalle.estado_solicitud] ?? 'bg-slate-100 text-slate-600'}`}>
                  {detalle.estado_solicitud}
                </span>
              </div>

              <hr className="border-slate-100" />

              {/* Pasajero */}
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Pasajero</p>
                  <p className="font-semibold text-slate-800">{detalle.empleados?.nombres} {detalle.empleados?.ap_paterno}</p>
                </div>
              </div>

              {/* Ruta */}
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Ruta</p>
                  <p className="font-semibold text-slate-800">{AEROPUERTOS[detalle.origen] ?? detalle.origen}</p>
                  <p className="text-xs text-slate-400 mt-0.5">→</p>
                  <p className="font-semibold text-slate-800">{AEROPUERTOS[detalle.destino] ?? detalle.destino}</p>
                </div>
              </div>

              {/* Fechas */}
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Fechas</p>
                  <p className="font-semibold text-slate-800">Ida: {detalle.fecha_viaje_ida}</p>
                  {detalle.fecha_viaje_vuelta && (
                    <p className="font-semibold text-slate-800">Retorno: {detalle.fecha_viaje_vuelta}</p>
                  )}
                </div>
              </div>

              {/* Hospedaje */}
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Hotel className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Hospedaje</p>
                  <p className="font-semibold text-slate-800">{detalle.incluye_hospedaje ? '✓ Incluye hospedaje' : 'Sin hospedaje'}</p>
                </div>
              </div>

              {/* Justificación */}
              {detalle.justificacion_negocio && (
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Justificación de negocio</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{detalle.justificacion_negocio}</p>
                  </div>
                </div>
              )}

              {/* Fecha creación */}
              <div className="text-xs text-slate-400 text-right">
                Enviado: {new Date(detalle.fecha_creacion).toLocaleString('es-PE')}
              </div>
            </div>

            {/* Acciones en el modal */}
            {detalle.estado_solicitud === 'enviado' && (
              <div className="px-6 pb-6 grid grid-cols-2 gap-3">
                <button
                  onClick={() => { handleDecision(detalle.id_solicitud, 'aprobado'); setDetalle(null); }}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center text-sm transition-colors"
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" /> Aprobar
                </button>
                <button
                  onClick={() => { handleDecision(detalle.id_solicitud, 'rechazado'); setDetalle(null); }}
                  className="bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2.5 rounded-xl flex items-center justify-center text-sm transition-colors"
                >
                  <AlertCircle className="w-4 h-4 mr-1.5" /> Denegar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Panel de Administración</h1>
        <p className="text-slate-500">Gestión de aprobaciones de viajes y empleados FARMEX TMS.</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setActiveTab('solicitudes')}
          className={`flex items-center px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'solicitudes'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Plane className="w-4 h-4 mr-2" />
          Solicitudes Pendientes
          {!loading && solicitudes.length > 0 && (
            <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${
              activeTab === 'solicitudes' ? 'bg-white text-blue-600' : 'bg-amber-100 text-amber-700'
            }`}>{solicitudes.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('empleados')}
          className={`flex items-center px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'empleados'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4 mr-2" />
          Gestión de Empleados
        </button>
      </div>

      {/* ===== TAB: SOLICITUDES ===== */}
      {activeTab === 'solicitudes' && (
        <>
          {errorMsg && (
            <div className="mb-4 bg-red-50 text-red-700 p-4 rounded-xl flex items-center border border-red-100">
              <ShieldAlert className="w-5 h-5 mr-2 flex-shrink-0" /><p className="font-medium text-sm">{errorMsg}</p>
            </div>
          )}
          {successMsg && (
            <div className="mb-4 bg-green-50 text-green-700 p-4 rounded-xl flex items-center border border-green-100">
              <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" /><p className="font-medium text-sm">{successMsg}</p>
            </div>
          )}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-700">Solicitudes Pendientes de Aprobación</h2>
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-lg">
                {loading ? '...' : `${solicitudes.length} Pendiente(s)`}
              </span>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="flex justify-center p-12 text-slate-400"><Loader2 className="w-8 h-8 animate-spin" /></div>
              ) : solicitudes.length === 0 ? (
                <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3 opacity-50" />
                  <p className="text-slate-500 font-medium">No hay solicitudes pendientes.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {solicitudes.map((sol) => (
                    <div key={sol.id_solicitud} className="border border-slate-100 bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg uppercase flex items-center">
                            <Plane className="w-5 h-5 mr-2 text-blue-500" />
                            {sol.origen} &rarr; {sol.destino}
                          </h3>
                          <p className="text-sm font-medium text-slate-500 mt-1">
                            Pasajero: {sol.empleados?.nombres} {sol.empleados?.ap_paterno}
                          </p>
                        </div>
                        <div className="mt-2 md:mt-0 text-left md:text-right">
                          <span className="text-xs bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-full uppercase tracking-wider">{sol.tipo_solicitud}</span>
                          <p className="text-sm font-semibold text-slate-700 mt-2">Salida: {sol.fecha_viaje_ida}</p>
                        </div>
                      </div>
                      <hr className="border-slate-100 my-4" />
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          onClick={() => setDetalle(sol)}
                          className="col-span-3 md:col-span-1 uppercase tracking-wide text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center"
                        >
                          <Eye className="w-4 h-4 mr-2" /> Ver Detalle
                        </button>
                        <button
                          onClick={() => handleDecision(sol.id_solicitud, 'aprobado')}
                          disabled={processingId === sol.id_solicitud}
                          className="uppercase tracking-wide text-sm bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center"
                        >
                          {processingId === sol.id_solicitud ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleDecision(sol.id_solicitud, 'rechazado')}
                          disabled={processingId === sol.id_solicitud}
                          className="uppercase tracking-wide text-sm bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center"
                        >
                          {processingId === sol.id_solicitud ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AlertCircle className="w-4 h-4 mr-2" />}
                          Denegar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== TAB: EMPLEADOS ===== */}
      {activeTab === 'empleados' && (
        <div className="space-y-6">
          {/* Formulario crear empleado */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="font-bold text-slate-800 mb-1 flex items-center">
              <UserPlus className="w-5 h-5 mr-2 text-blue-500" /> Registrar Nuevo Empleado
            </h2>
            <p className="text-sm text-slate-500 mb-5">El empleado podrá registrarse en la app con este correo y quedará vinculado automáticamente.</p>

            {empError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">{empError}</div>
            )}
            {empSuccess && (
              <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-100 flex items-start">
                <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />{empSuccess}
              </div>
            )}

            <form onSubmit={handleCrearEmpleado} className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombres *</label>
                <input
                  type="text" required value={formEmp.nombres}
                  onChange={e => setFormEmp(p => ({ ...p, nombres: e.target.value }))}
                  placeholder="Eduardo"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Apellido Paterno *</label>
                <input
                  type="text" required value={formEmp.ap_paterno}
                  onChange={e => setFormEmp(p => ({ ...p, ap_paterno: e.target.value }))}
                  placeholder="Aramburu"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Correo Corporativo *</label>
                <input
                  type="email" required value={formEmp.email_corporativo}
                  onChange={e => setFormEmp(p => ({ ...p, email_corporativo: e.target.value }))}
                  placeholder="nombre@farmex.com.pe"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">DNI <span className="text-slate-400 font-normal">(opcional)</span></label>
                <input
                  type="text" value={formEmp.dni}
                  onChange={e => setFormEmp(p => ({ ...p, dni: e.target.value }))}
                  placeholder="12345678" maxLength={8}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit" disabled={savingEmp}
                  className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-8 rounded-xl transition-colors flex items-center justify-center"
                >
                  {savingEmp ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  {savingEmp ? 'Guardando...' : 'Crear Empleado'}
                </button>
              </div>
            </form>
          </div>

          {/* Lista de empleados */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-700 flex items-center"><Users className="w-4 h-4 mr-2" /> Empleados Registrados</h2>
              <span className="text-xs font-bold text-slate-500">{loadingEmp ? '...' : `${empleados.length} empleado(s)`}</span>
            </div>
            <div className="p-4">
              {loadingEmp ? (
                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
              ) : empleados.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No hay empleados registrados aún.</p>
              ) : (
                <div className="space-y-3">
                  {empleados.map(emp => (
                    <div key={emp.id_empleado} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          emp.auth_user_id ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                          {emp.auth_user_id ? <BadgeCheck className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{emp.nombres} {emp.ap_paterno}</p>
                          <p className="text-sm text-slate-500 flex items-center"><Mail className="w-3.5 h-3.5 mr-1" />{emp.email_corporativo}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          emp.auth_user_id
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {emp.auth_user_id ? '✓ Activo' : '⏳ Sin cuenta'}
                        </span>
                        <button
                          onClick={() => handleEliminarEmpleado(emp.id_empleado, `${emp.nombres} ${emp.ap_paterno}`)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar empleado"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
