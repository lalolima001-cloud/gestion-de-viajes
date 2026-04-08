import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PlaneTakeoff, Calendar, MapPin, Building, FileText, ArrowLeft, Save, Clock, AlertCircle } from 'lucide-react';

const AEROPUERTOS_PERU = [
  { code: 'LIM', name: 'Lima (Chavez)' },
  { code: 'AQP', name: 'Arequipa (Rodríguez Ballón)' },
  { code: 'CUZ', name: 'Cusco (Velasco Astete)' },
  { code: 'PIU', name: 'Piura (Concha Iberico)' },
  { code: 'TPP', name: 'Tarapoto (Cad. FAP Guillermo del Castillo)' },
  { code: 'IQT', name: 'Iquitos (Secada Vignetta)' },
  { code: 'CIX', name: 'Chiclayo (Quiñones Gonzales)' },
  { code: 'TRU', name: 'Trujillo (Martínez de Pinillos)' },
  { code: 'PCL', name: 'Pucallpa (David Abensur)' },
  { code: 'JUL', name: 'Juliaca (Inca Manco Cápac)' },
  { code: 'TCQ', name: 'Tacna (Carlos Ciriani)' },
  { code: 'CJA', name: 'Cajamarca (Mayor General FAP Armando Revoredo)' },
  { code: 'AYP', name: 'Ayacucho (Coronel FAP Alfredo Mendívil)' },
  { code: 'JAU', name: 'Jauja (Francisco Carlé)' },
  { code: 'PEM', name: 'Puerto Maldonado (Padre Aldamiz)' },
  { code: 'TBP', name: 'Tumbes (Pedro Canga Rodríguez)' },
  { code: 'TYL', name: 'Talara (Víctor Montes Arias)' },
  { code: 'CHH', name: 'Chachapoyas' },
  { code: 'HUU', name: 'Huánuco (David Figueroa Fernandini)' },
  { code: 'ATA', name: 'Anta / Huaraz (Arias Graziani)' }
].sort((a, b) => a.name.localeCompare(b.name));

const RANGOS_HORA = [
  { id: 'CUALQUIERA', label: 'Cualquier hora' },
  { id: 'MANANA', label: 'Mañana (06:00 - 12:00)' },
  { id: 'TARDE', label: 'Tarde (12:00 - 18:00)' },
  { id: 'NOCHE', label: 'Noche (18:00 - 23:59)' }
];

export default function NuevaSolicitud() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorDate, setErrorDate] = useState('');
  
  // Contexto de Empleado
  const [idEmpleado, setIdEmpleado] = useState('');
  const [idEmpresa, setIdEmpresa] = useState('');

  // States
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [fechaIda, setFechaIda] = useState('');
  const [horaIda, setHoraIda] = useState('CUALQUIERA');
  const [fechaRetorno, setFechaRetorno] = useState('');
  const [horaRetorno, setHoraRetorno] = useState('CUALQUIERA');
  const [motivo, setMotivo] = useState('');
  const [hospedaje, setHospedaje] = useState(false);

  useEffect(() => {
    const fetchEmployeeContext = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data } = await supabase
        .from('empleados')
        .select('id_empleado, id_empresa')
        .eq('auth_user_id', session.user.id)
        .single();
        
      if (data) {
        setIdEmpleado(data.id_empleado);
        setIdEmpresa(data.id_empresa);
      }
    };
    fetchEmployeeContext();
  }, []);

  // Cálculos de fechas mínimas
  const minIdaStr = useMemo(() => {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 2);
    // Para no tener problemas de timezone, forzamos YYYY-MM-DD
    return minDate.toISOString().split('T')[0];
  }, []);

  const minRetornoStr = useMemo(() => {
    if (!fechaIda) return minIdaStr;
    const minDate = new Date(fechaIda + 'T00:00:00'); // Evitar timezone offset
    minDate.setDate(minDate.getDate() + 1); // mínimo un día después
    return minDate.toISOString().split('T')[0];
  }, [fechaIda, minIdaStr]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorDate('');
    
    if (!idEmpleado || !idEmpresa) {
      setErrorDate('Tu usuario no está vinculado a un empleado registrado en Nómina.');
      return;
    }

    if (origen === destino) {
      setErrorDate('El origen y el destino no pueden ser iguales.');
      return;
    }

    if (fechaIda < minIdaStr) {
      setErrorDate('La fecha de ida debe ser por lo menos 2 días a partir de hoy.');
      return;
    }

    if (fechaRetorno && fechaRetorno <= fechaIda) {
      setErrorDate('La fecha de retorno debe ser estrictamente posterior a la de ida.');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('solicitudes_viaje')
        .insert([
          {
            id_empresa: idEmpresa,
            id_empleado: idEmpleado,
            tipo_solicitud: 'individual',
            origen,
            destino,
            fecha_viaje_ida: fechaIda,
            fecha_viaje_vuelta: fechaRetorno || null,
            incluye_hospedaje: hospedaje,
            justificacion_negocio: motivo + ` (Preferencia hora ida: ${horaIda}, retorno: ${horaRetorno})`,
            estado_solicitud: 'enviado'
          }
        ]);

      if (error) {
        console.error('Database Error:', error);
        setErrorDate('Rebote en DB: ' + error.message);
        setLoading(false);
        return;
      }

      setLoading(false);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setErrorDate('Falla de red con Supabase.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 pt-8 md:pt-12 mb-20">
      <Link to="/dashboard" className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-blue-600 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Volver a mis viajes
      </Link>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 p-6 md:p-8 text-white">
          <h1 className="text-xl md:text-2xl font-bold mb-2">Solicitar Nuevo Viaje</h1>
          <p className="text-sm md:text-base text-blue-100/80">Completa los datos del itinerario para iniciar la cotización con la agencia.</p>
        </div>

        <div className="p-5 md:p-8 space-y-6 md:space-y-8">
          
          {errorDate && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-start border border-red-100">
              <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
              <p className="font-medium text-sm">{errorDate}</p>
            </div>
          )}

          {/* Origen y Destino */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center">
                <PlaneTakeoff className="w-4 h-4 mr-1.5 text-blue-500" /> Origen
              </label>
              <select 
                value={origen}
                onChange={e => setOrigen(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring focus:ring-blue-200 outline-none rounded-xl px-4 py-3 font-medium text-slate-800 transition-all appearance-none"
                required
              >
                <option value="" disabled>Seleccione aeropuerto...</option>
                {AEROPUERTOS_PERU.map(a => (
                  <option key={a.code} value={a.code}>{a.name} ({a.code})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center">
                <MapPin className="w-4 h-4 mr-1.5 text-blue-500" /> Destino
              </label>
              <select 
                value={destino}
                onChange={e => setDestino(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring focus:ring-blue-200 outline-none rounded-xl px-4 py-3 font-medium text-slate-800 transition-all appearance-none"
                required
              >
                <option value="" disabled>Seleccione aeropuerto...</option>
                {AEROPUERTOS_PERU.map(a => (
                  <option key={a.code} value={a.code}>{a.name} ({a.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Fechas y Horas de Ida */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-6">
            <h3 className="font-bold text-slate-800 flex items-center text-sm uppercase tracking-wider mb-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span> Trayecto de Ida
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center">
                  <Calendar className="w-4 h-4 mr-1.5 text-blue-500" /> Fecha de Ida
                </label>
                <input 
                  type="date"
                  value={fechaIda}
                  min={minIdaStr}
                  onChange={e => setFechaIda(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring focus:ring-blue-200 outline-none rounded-xl px-4 py-3 font-medium text-slate-800 transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center">
                  <Clock className="w-4 h-4 mr-1.5 text-blue-500" /> Preferencia de Hora
                </label>
                <select 
                  value={horaIda}
                  onChange={e => setHoraIda(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring focus:ring-blue-200 outline-none rounded-xl px-4 py-3 font-medium text-slate-800 transition-all appearance-none"
                  required
                >
                  {RANGOS_HORA.map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Fechas y Horas de Retorno */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-6">
            <h3 className="font-bold text-slate-800 flex items-center text-sm uppercase tracking-wider mb-2">
              <span className="w-2 h-2 bg-slate-400 rounded-full mr-2"></span> Trayecto de Retorno
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center">
                  <Calendar className="w-4 h-4 mr-1.5 text-slate-400" /> Fecha de Retorno
                </label>
                <input 
                  type="date"
                  value={fechaRetorno}
                  min={minRetornoStr}
                  onChange={e => setFechaRetorno(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-slate-400 focus:ring focus:ring-slate-200 outline-none rounded-xl px-4 py-3 font-medium text-slate-800 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center">
                  <Clock className="w-4 h-4 mr-1.5 text-slate-400" /> Preferencia de Hora
                </label>
                <select 
                  value={horaRetorno}
                  onChange={e => setHoraRetorno(e.target.value)}
                  disabled={!fechaRetorno}
                  className="w-full bg-white border border-slate-200 focus:border-slate-400 focus:ring focus:ring-slate-200 outline-none rounded-xl px-4 py-3 font-medium text-slate-800 transition-all appearance-none disabled:opacity-50 disabled:bg-slate-100"
                  required
                >
                  {RANGOS_HORA.map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Justificación */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center">
              <FileText className="w-4 h-4 mr-1.5 text-blue-500" /> Motivo Comercial
            </label>
            <textarea 
              rows={3}
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej. Visita a planta Farmex Norte y revisión de KPI con equipo logístico."
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring focus:ring-blue-200 outline-none rounded-xl px-4 py-3 font-medium text-slate-800 transition-all resize-none"
              required
            ></textarea>
          </div>

          {/* Extra: Hospedaje */}
          <label className="flex items-start p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="flex-shrink-0 mt-1">
              <input 
                type="checkbox" 
                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" 
                checked={hospedaje} 
                onChange={(e) => setHospedaje(e.target.checked)} 
              />
            </div>
            <div className="ml-3">
              <span className="text-sm font-bold text-slate-800 flex items-center">
                <Building className="w-4 h-4 mr-1.5 text-blue-500"/>
                Requiero cotización de hotel
              </span>
              <span className="block text-sm text-slate-500 mt-1 leading-relaxed">
                Activa esta opción si necesitas que también gestionemos hospedaje según las políticas corporativas.
              </span>
            </div>
          </label>

          {/* Submit */}
          <div className="pt-4 flex flex-col-reverse md:flex-row md:justify-end items-center md:space-x-4 gap-4 md:gap-0">
            <button 
              type="button" 
              onClick={() => navigate('/dashboard')}
              className="w-full md:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-8 rounded-xl shadow-md shadow-blue-200 transition-colors flex items-center justify-center"
            >
              {loading ? 'Grabando y notificando...' : (
                <>
                  Grabar <Save className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
