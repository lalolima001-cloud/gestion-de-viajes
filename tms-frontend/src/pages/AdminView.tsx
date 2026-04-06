import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ShieldAlert, CheckCircle, ArrowLeft, Loader2, Plane, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Type definitions
interface Solicitud {
  id_solicitud: string;
  origen: string;
  destino: string;
  fecha_viaje_ida: string;
  estado_solicitud: string;
  tipo_solicitud: string;
  empleados: {
    nombres: string;
    ap_paterno: string;
  }
}

export default function AdminView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Parse direct action from URL (e.g. from n8n email click)
  useEffect(() => {
    const action = searchParams.get('action');
    const id = searchParams.get('id');

    if (action && id) {
      if (action === 'approve') {
        handleDecision(id, 'aprobado', true);
      } else if (action === 'reject') {
        handleDecision(id, 'rechazado', true);
      }
      // Remove params to avoid re-triggering
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPendientes = async () => {
    setLoading(true);
    // Fetch directly from view/join or specific state
    const { data, error } = await supabase
      .from('solicitudes_viaje')
      .select('id_solicitud, origen, destino, fecha_viaje_ida, estado_solicitud, tipo_solicitud, empleados (nombres, ap_paterno)')
      .eq('estado_solicitud', 'enviado');

    if (error) {
      console.error(error);
      setErrorMsg('No se pudieron cargar las solicitudes pendientes.');
    } else {
      setSolicitudes(data as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPendientes();
  }, []);

  const handleDecision = async (id_solicitud: string, decision: string, fromUrl: boolean = false) => {
    setProcessingId(id_solicitud);
    setErrorMsg(null);
    setSuccessMsg(null);

    const { error } = await supabase
      .from('solicitudes_viaje')
      .update({ estado_solicitud: decision })
      .eq('id_solicitud', id_solicitud);

    setProcessingId(null);

    if (error) {
      console.error(error);
      setErrorMsg(`Error al ${decision === 'aprobado' ? 'aprobar' : 'rechazar'} la solicitud. Asegúrate de tener permisos de Admin.`);
    } else {
      setSuccessMsg(`Solicitud marcada como ${decision} exitosamente.`);
      if (!fromUrl) {
        setSolicitudes(prev => prev.filter(s => s.id_solicitud !== id_solicitud));
      } else {
        // Delay fetch slightly to ensure DB consistency
        setTimeout(() => fetchPendientes(), 500);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 pt-12">
      <Link to="/dashboard" className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-blue-600 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Volver
      </Link>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mb-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Panel de Administración de Viajes</h1>
        <p className="text-slate-500">Gestión de aprobaciones en curso enviadas desde la PWA o n8n.</p>
      </div>

      {errorMsg && (
        <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-xl flex items-center border border-red-100">
          <ShieldAlert className="w-5 h-5 mr-2 flex-shrink-0" />
          <p className="font-medium text-sm">{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-xl flex items-center border border-green-100">
          <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <p className="font-medium text-sm">{successMsg}</p>
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
             <div className="flex justify-center p-12 text-slate-400">
               <Loader2 className="w-8 h-8 animate-spin" />
             </div>
          ) : solicitudes.length === 0 ? (
             <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                 <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3 opacity-50" />
                 <p className="text-slate-500 font-medium">No hay ninguna solicitud esperando tu aprobación en este momento.</p>
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
                        <span className="text-xs bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          {sol.tipo_solicitud}
                        </span>
                        <p className="text-sm font-semibold text-slate-700 mt-2">Salida: {sol.fecha_viaje_ida}</p>
                      </div>
                    </div>
                    
                    <hr className="border-slate-100 my-4" />

                    <div className="flex grid grid-cols-2 md:flex md:flex-row gap-4 mt-2">
                       <button 
                         onClick={() => handleDecision(sol.id_solicitud, 'aprobado')}
                         disabled={processingId === sol.id_solicitud}
                         className="flex-1 md:flex-none uppercase tracking-wide text-sm bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center">
                         {processingId === sol.id_solicitud ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <CheckCircle className="w-4 h-4 mr-2"/>}
                         Aprobar
                       </button>
                       <button 
                         onClick={() => handleDecision(sol.id_solicitud, 'rechazado')}
                         disabled={processingId === sol.id_solicitud}
                         className="flex-1 md:flex-none uppercase tracking-wide text-sm bg-red-100 hover:bg-red-200 text-red-700 font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center">
                         {processingId === sol.id_solicitud ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <AlertCircle className="w-4 h-4 mr-2"/>}
                         Denegar
                       </button>
                    </div>
                 </div>
               ))}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
