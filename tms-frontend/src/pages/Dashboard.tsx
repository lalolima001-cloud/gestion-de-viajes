import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plane, Clock, MapPin, Plus, CheckCircle, AlertCircle, Loader2, ShieldAlert } from 'lucide-react';

interface Viaje {
  id_solicitud: string;
  destino: string;
  fecha_viaje_ida: string;
  estado_solicitud: string;
  incluye_hospedaje: boolean;
  tipo_solicitud: string;
}

export default function Dashboard() {
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [filter, setFilter] = useState<'todos' | 'pendiente' | 'aprobado' | 'rechazado'>('todos');
  const [loading, setLoading] = useState(true);
  const [isUnlinked, setIsUnlinked] = useState(false);

  useEffect(() => {
    const fetchViajes = async () => {
      setLoading(true);

      // 1. Obtener el id_empleado del usuario logueado
      const { data: empData } = await supabase.rpc('get_mi_empleado');
      if (!empData || empData.length === 0) {
        setIsUnlinked(true);
        setLoading(false);
        return;
      }
      setIsUnlinked(false);
      const idEmpleado = empData[0].id_empleado;

      // 2. Traer SOLO las solicitudes de ese empleado
      const { data, error } = await supabase
        .from('solicitudes_viaje')
        .select('*')
        .eq('id_empleado', idEmpleado)
        .order('fecha_creacion', { ascending: false });

      if (!error && data) {
        setViajes(data);
      }
      setLoading(false);
    };

    fetchViajes();
  }, []);

  const viajesActivos = viajes.filter(v => v.estado_solicitud !== 'completado' && v.estado_solicitud !== 'cancelado').length;
  const aprobadosCount = viajes.filter(v => ['aprobado', 'confirmado'].includes(v.estado_solicitud)).length;

  const filteredViajes = viajes.filter(v => {
    if (filter === 'todos') return true;
    if (filter === 'pendiente') return !['aprobado', 'confirmado', 'rechazado', 'completado', 'cancelado'].includes(v.estado_solicitud);
    if (filter === 'aprobado') return ['aprobado', 'confirmado'].includes(v.estado_solicitud);
    if (filter === 'rechazado') return v.estado_solicitud === 'rechazado';
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="font-medium">Cargando tu información...</p>
      </div>
    );
  }

  if (isUnlinked) {
    return (
      <div className="max-w-xl mx-auto p-6 pt-20 text-center">
        <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100">
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Registro Incompleto</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Tu cuenta de usuario no está vinculada a ningún registro de empleado en nuestra nómina corporativa.
          </p>
          <div className="bg-slate-50 p-6 rounded-2xl text-left border border-slate-100 mb-8">
            <h3 className="font-bold text-slate-700 text-sm uppercase mb-3">¿Qué debo hacer?</h3>
            <ul className="text-sm text-slate-600 space-y-3">
              <li className="flex items-start"><span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-bold mr-2 border border-slate-200">1</span> Asegúrate de estar usando tu correo corporativo de FARMEX.</li>
              <li className="flex items-start"><span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-bold mr-2 border border-slate-200">2</span> Contacta al Responsable de Viajes para que valide tu registro.</li>
              <li className="flex items-start"><span className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-bold mr-2 border border-slate-200">3</span> Si acabas de registrarte, espera unos minutos y recarga la página.</li>
            </ul>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-[0.98]"
          >
            Actualizar Estado
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 pt-12">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Mis Viajes</h1>
          <p className="text-slate-500 mt-2">Gestiona tus solicitudes corporativas</p>
        </div>
        <Link 
          to="/nueva-solicitud" 
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-xl shadow-md shadow-blue-200 transition-colors flex items-center w-full md:w-auto justify-center md:justify-start"
        >
          <Plus className="w-5 h-5 mr-1.5" />
          Nueva Solicitud
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <Plane className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Viajes Activos</p>
            <p className="text-2xl font-bold text-slate-800">{loading ? '-' : viajesActivos}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Aprobados</p>
            <p className="text-2xl font-bold text-slate-800">{loading ? '-' : aprobadosCount}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h2 className="text-xl font-bold text-slate-800">Mis Solicitudes</h2>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {(['todos', 'pendiente', 'aprobado', 'rechazado'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center p-12 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : filteredViajes.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl border border-slate-100 border-dashed">
          <Plane className="w-12 h-12 text-slate-300 mx-auto mb-3 opacity-50" />
          <p className="text-slate-500 font-medium">No hay viajes que coincidan con el filtro.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredViajes.map(viaje => {
            const fechaParts = viaje.fecha_viaje_ida.split('-'); 
            // fechaParts = [YYYY, MM, DD]
            const mesNombres = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            const mes = mesNombres[parseInt(fechaParts[1]) - 1];
            const dia = fechaParts[2];

            return (
              <div key={viaje.id_solicitud} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex justify-between items-center group cursor-pointer">
                <div className="flex space-x-5 items-center">
                  <div className="w-14 h-14 bg-slate-50 rounded-xl flex flex-col items-center justify-center border border-slate-100">
                    <span className="text-xs text-slate-400 font-bold uppercase">{mes}</span>
                    <span className="text-lg font-black text-slate-700">{dia}</span>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center capitalize">
                      {viaje.destino}
                    </h3>
                    <div className="flex space-x-4 mt-1 text-sm text-slate-500 font-medium">
                      <span className="flex items-center capitalize"><MapPin className="w-4 h-4 mr-1 text-slate-400"/> {viaje.tipo_solicitud || 'Individual'} {viaje.incluye_hospedaje ? '+ Hotel' : ''}</span>
                      <span className="flex items-center"><Clock className="w-4 h-4 mr-1 text-slate-400"/> Directo</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {['aprobado', 'confirmado'].includes(viaje.estado_solicitud) ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700 capitalize">
                      <CheckCircle className="w-4 h-4 mr-1.5" /> {viaje.estado_solicitud}
                    </span>
                  ) : viaje.estado_solicitud === 'rechazado' ? (
                     <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-700 capitalize">
                      <AlertCircle className="w-4 h-4 mr-1.5" /> Rechazado
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-amber-100 text-amber-700 capitalize">
                      <AlertCircle className="w-4 h-4 mr-1.5" /> {viaje.estado_solicitud}
                    </span>
                  )}
                  <div className="mt-2 text-sm text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Ver detalle &rarr;
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
