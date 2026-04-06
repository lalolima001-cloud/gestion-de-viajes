import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plane, Clock, MapPin, Plus, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchViajes = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('solicitudes_viaje')
        .select('*')
        .order('fecha_creacion', { ascending: false });

      if (!error && data) {
        setViajes(data);
      }
      setLoading(false);
    };

    fetchViajes();
  }, []);

  const viajesActivos = viajes.filter(v => v.estado_solicitud !== 'completado' && v.estado_solicitud !== 'cancelado').length;
  const aprobados = viajes.filter(v => v.estado_solicitud === 'aprobado' || v.estado_solicitud === 'confirmado').length;

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
            <p className="text-2xl font-bold text-slate-800">{loading ? '-' : aprobados}</p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-slate-800 mb-4">Próximos Itinerarios</h2>
      
      {loading ? (
        <div className="flex justify-center p-12 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : viajes.length === 0 ? (
        <div className="text-center p-10 bg-slate-100 rounded-2xl border border-slate-200">
          <Plane className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-50" />
          <p className="text-slate-500">No tienes viajes programados todavía.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {viajes.map(viaje => {
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
