import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Plane, Send, CheckCircle, AlertCircle, Loader2, 
  MapPin, Calendar, DollarSign, Plus, Trash2, Info,
  Clock, HelpCircle, X
} from 'lucide-react';

interface Solicitud {
  id_solicitud: string;
  origen: string;
  destino: string;
  fecha_viaje_ida: string;
  fecha_viaje_vuelta: string | null;
  estado_solicitud: string;
  incluye_hospedaje: boolean;
  empleados: { nombres: string; ap_paterno: string };
}

interface VueloOption {
  aerolinea: string;
  nro_vuelo_ida: string;
  fecha_hora_salida: string;
  fecha_hora_llegada: string; // We'll keep this in state for DB but it's now simple text/calc
  duracion_ida: string;
  arribo_estimado_ida: string;
  nro_vuelo_vuelta?: string;
  fecha_hora_salida_vuelta?: string;
  fecha_hora_llegada_vuelta?: string;
  duracion_vuelta?: string;
  arribo_estimado_vuelta?: string;
  tarifa_usd: number;
  tarifa_tipo: string;
}

const AEROPUERTOS: Record<string, string> = {
  LIM: 'Lima (Chavez)', AQP: 'Arequipa (Rodríguez Ballón)', CUZ: 'Cusco (Velasco Astete)',
  PIU: 'Piura (Concha Iberico)', TPP: 'Tarapoto', IQT: 'Iquitos (Secada Vignetta)',
  CIX: 'Chiclayo (Quiñones)', TRU: 'Trujillo (Martínez de Pinillos)', PCL: 'Pucallpa (David Abensur)',
  JUL: 'Juliaca (Manco Cápac)', TCQ: 'Tacna (Carlos Ciriani)', CJA: 'Cajamarca',
  AYP: 'Ayacucho', JAU: 'Jauja (Francisco Carlé)', PEM: 'Puerto Maldonado (Padre Aldamiz)',
  TBP: 'Tumbes', TYL: 'Talara', CHH: 'Chachapoyas', HUU: 'Huánuco', ATA: 'Anta / Huaraz'
};

const DURACIONES = [
  '45m', '1h 00m', '1h 15m', '1h 30m', '1h 45m', '2h 00m', '2h 15m', '2h 30m', '2h 45m', '3h 00m', 'Más de 3h'
];

export default function CotizarSolicitud() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);

  // States for the form
  const [vuelos, setVuelos] = useState<VueloOption[]>([
    { 
      aerolinea: '', 
      nro_vuelo_ida: '', 
      fecha_hora_salida: '', 
      fecha_hora_llegada: '', 
      duracion_ida: '1h 30m',
      arribo_estimado_ida: '',
      tarifa_usd: 0,
      tarifa_tipo: 'Light'
    }
  ]);

  const [showTarifaHelp, setShowTarifaHelp] = useState(false);

  useEffect(() => {
    const fetchSolicitud = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from('solicitudes_viaje')
        .select('*, empleados(nombres, ap_paterno)')
        .eq('id_solicitud', id)
        .single();

      if (error || !data) {
        setError('No se encontró la solicitud o el link ha expirado.');
      } else if (['borrador', 'rechazado', 'confirmado', 'completado'].includes(data.estado_solicitud)) {
        setError(`Esta solicitud ya no requiere cotización (Estado: ${data.estado_solicitud}).`);
      } else {
        setSolicitud(data);
        // Pre-fill first flight with requested dates
        setVuelos([{
          aerolinea: '',
          nro_vuelo_ida: '',
          fecha_hora_salida: `${data.fecha_viaje_ida}T09:00`,
          fecha_hora_llegada: '',
          duracion_ida: '1h 30m',
          arribo_estimado_ida: '',
          nro_vuelo_vuelta: data.fecha_viaje_vuelta ? '' : undefined,
          fecha_hora_salida_vuelta: data.fecha_viaje_vuelta ? `${data.fecha_viaje_vuelta}T18:00` : undefined,
          fecha_hora_llegada_vuelta: data.fecha_viaje_vuelta ? '' : undefined,
          duracion_vuelta: '1h 30m',
          arribo_estimado_vuelta: '',
          tarifa_usd: 0,
          tarifa_tipo: 'Light'
        }]);
      }
      setLoading(false);
    };

    fetchSolicitud();
  }, [id]);

  const addVuelo = () => {
    setVuelos([...vuelos, { 
      aerolinea: '', 
      nro_vuelo_ida: '', 
      fecha_hora_salida: solicitud?.fecha_viaje_ida ? `${solicitud.fecha_viaje_ida}T09:00` : '', 
      fecha_hora_llegada: '', 
      duracion_ida: '1h 30m',
      arribo_estimado_ida: '',
      tarifa_usd: 0,
      tarifa_tipo: 'Light'
    }]);
  };

  const removeVuelo = (index: number) => {
    if (vuelos.length > 1) {
      setVuelos(vuelos.filter((_, i) => i !== index));
    }
  };

  const updateVuelo = (index: number, field: keyof VueloOption, value: any) => {
    const newVuelos = [...vuelos];
    newVuelos[index] = { ...newVuelos[index], [field]: value };
    setVuelos(newVuelos);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !solicitud) return;
    setSubmitting(true);
    setError(null);

    try {
      // 1. Insert Flight Quotes
      const flightsToInsert = vuelos.map((v, i) => ({
        id_solicitud: id,
        opcion_numero: i + 1,
        aerolinea: v.aerolinea,
        nro_vuelo_ida: v.nro_vuelo_ida,
        nro_vuelo_vuelta: v.nro_vuelo_vuelta || null,
        fecha_hora_salida: v.fecha_hora_salida,
        fecha_hora_llegada: v.fecha_hora_salida, // Placeholder as we use textual arribo
        fecha_hora_salida_vuelta: v.fecha_hora_salida_vuelta || null,
        fecha_hora_llegada_vuelta: v.fecha_hora_salida_vuelta || null,
        tarifa_tipo: v.tarifa_tipo,
        tarifa_usd: v.tarifa_usd,
        pros: `Duración: ${v.duracion_ida}${v.duracion_vuelta ? ` | Retorno Duración: ${v.duracion_vuelta}` : ''}`
      }));

      const { error: fError } = await supabase.from('cotizaciones_vuelo').insert(flightsToInsert);
      if (fError) throw fError;

      // 3. Update Request Status to 'cotizando'
      await supabase.from('solicitudes_viaje').update({ estado_solicitud: 'cotizando' }).eq('id_solicitud', id);

      // 4. Trigger Confirmation Email (Webhook) - ASYNC
      const webhookUrl = 'https://n8n-farmex.duckdns.org/webhook/quote-confirmation';
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_solicitud: id,
          pasajero: `${solicitud.empleados.nombres} ${solicitud.empleados.ap_paterno}`,
          vuelos: vuelos.map((v, i) => ({
            opcion: i + 1,
            aerolinea: v.aerolinea,
            itinerario: `${v.nro_vuelo_ida}${v.nro_vuelo_vuelta ? ' / ' + v.nro_vuelo_vuelta : ''}`,
            precio: v.tarifa_usd
          })),
          hospedaje: null
        })
      }).catch(err => console.error('Error triggering sustento:', err));

      setSubmitted(true);
    } catch (err: any) {
      setError('Error al enviar cotización: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Cargando solicitud...</p>
        </div>
      </div>
    );
  }

  if (error && !solicitud) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Enlace no válido</h1>
          <p className="text-slate-500 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-100 max-w-md">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">¡Cotización Enviada!</h1>
          <p className="text-slate-500 mb-8">Gracias por su respuesta. El administrador de FARMEX revisará las opciones y se pondrá en contacto pronto.</p>
          <p className="text-xs text-slate-400">Ya puede cerrar esta ventana.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1 tracking-wider uppercase">Portal de Agencia de Viajes</p>
                <h1 className="text-3xl font-bold">Solicitud de Cotización</h1>
              </div>
              <img src="https://farmex.com.pe/wp-content/uploads/2021/04/logo-farmex.png" alt="Farmex" className="h-10 brightness-0 invert opacity-90" />
            </div>
          </div>

          <div className="p-8 bg-blue-50/50 border-b border-blue-100 grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-blue-600 font-bold uppercase tracking-widest mb-3">Resumen del Viaje</p>
              <div className="space-y-3">
                <p className="flex items-center text-slate-700 font-semibold group">
                  <span className="w-8 h-8 rounded-lg bg-white shadow-sm border border-blue-100 flex items-center justify-center mr-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <MapPin className="w-4 h-4" />
                  </span>
                  {AEROPUERTOS[solicitud!.origen] || solicitud!.origen} &rarr; {AEROPUERTOS[solicitud!.destino] || solicitud!.destino}
                </p>
                <p className="flex items-center text-slate-600 text-sm">
                  <span className="w-8 h-8 rounded-lg bg-white shadow-sm border border-blue-100 flex items-center justify-center mr-3">
                    <Calendar className="w-4 h-4" />
                  </span>
                  Salida: <b className="ml-1 text-slate-800">{solicitud!.fecha_viaje_ida}</b>
                  {solicitud!.fecha_viaje_vuelta && (
                    <span className="ml-3">Retorno: <b className="text-slate-800">{solicitud!.fecha_viaje_vuelta}</b></span>
                  )}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-blue-600 font-bold uppercase tracking-widest mb-3">Pasajero</p>
              <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex items-center">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mr-4 text-lg">
                  {solicitud!.empleados.nombres[0]}
                </div>
                <div>
                  <p className="font-bold text-slate-800 leading-tight">{solicitud!.empleados.nombres} {solicitud!.empleados.ap_paterno}</p>
                  <p className="text-xs text-slate-500 mt-0.5">FARMEX S.A.</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center">
                <Plane className="w-6 h-6 mr-2 text-blue-600" /> Opciones de Vuelo
              </h2>
              <button 
                type="button" 
                onClick={addVuelo}
                className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Añadir Opción
              </button>
            </div>

            <div className="space-y-6">
              {vuelos.map((v, i) => (
                <div key={i} className="group relative bg-slate-50/50 p-6 rounded-2xl border border-slate-200 hover:border-blue-200 hover:bg-white transition-all">
                  <div className="absolute -left-3 top-6 w-6 h-6 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {i+1}
                  </div>
                  
                  {vuelos.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeVuelo(i)}
                      className="absolute -right-2 -top-2 w-8 h-8 bg-white text-red-500 border border-red-100 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center px-1">
                        Aerolínea
                      </label>
                      <input 
                        required
                        type="text" 
                        value={v.aerolinea}
                        onChange={e => updateVuelo(i, 'aerolinea', e.target.value)}
                        placeholder="Ej. LATAM"
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase px-1">Vuelo Ida</label>
                      <input 
                        required
                        type="text" 
                        value={v.nro_vuelo_ida}
                        onChange={e => updateVuelo(i, 'nro_vuelo_ida', e.target.value)}
                        placeholder="Nro. (Ej: LA2050)"
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase px-1">Hora Salida</label>
                      <input 
                        required
                        type="datetime-local" 
                        value={v.fecha_hora_salida}
                        onChange={e => updateVuelo(i, 'fecha_hora_salida', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase px-1 flex items-center justify-between">
                        Tipo Tarifa
                        <button type="button" onClick={() => setShowTarifaHelp(true)} className="text-blue-600 hover:text-blue-700">
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </label>
                      <select 
                        value={v.tarifa_tipo}
                        onChange={e => updateVuelo(i, 'tarifa_tipo', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      >
                        <option value="Basic">Basic (Solo mochila)</option>
                        <option value="Light">Light (Equipaje mano)</option>
                        <option value="Plus">Plus (Equipaje bodega)</option>
                        <option value="Top">Top (Todo incluido / Cambios)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase px-1">Tarifa (USD)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          required
                          type="number" 
                          step="0.01"
                          value={v.tarifa_usd}
                          onChange={e => updateVuelo(i, 'tarifa_usd', parseFloat(e.target.value))}
                          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-blue-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-1 gap-4 mt-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase px-1 flex items-center">
                        <Clock className="w-3 h-3 mr-1" /> Duración de Vuelo (Ida)
                      </label>
                      <select 
                        value={v.duracion_ida}
                        onChange={e => updateVuelo(i, 'duracion_ida', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      >
                        {DURACIONES.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  {solicitud!.fecha_viaje_vuelta && (
                    <div className="grid md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase px-1">Vuelo Retorno</label>
                        <input 
                          required
                          type="text" 
                          value={v.nro_vuelo_vuelta}
                          onChange={e => updateVuelo(i, 'nro_vuelo_vuelta', e.target.value)}
                          placeholder="Nro. (Ej: LA2051)"
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase px-1">Salida Retorno</label>
                        <input 
                          required
                          type="datetime-local" 
                          value={v.fecha_hora_salida_vuelta}
                          onChange={e => updateVuelo(i, 'fecha_hora_salida_vuelta', e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase px-1">Duración (Retorno)</label>
                        <select 
                          value={v.duracion_vuelta}
                          onChange={e => updateVuelo(i, 'duracion_vuelta', e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        >
                          {DURACIONES.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>



            {error && (
              <div className="mt-8 p-4 bg-red-50 text-red-700 border border-red-100 rounded-2xl flex items-center">
                <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <div className="flex items-start space-x-3 max-w-md">
                <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-500">
                  Al enviar la cotización, el administrador recibirá una notificación automática para proceder con la selección y aprobación de compra.
                </p>
              </div>
              <button 
                type="submit" 
                disabled={submitting}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold px-10 py-4 rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {submitting ? (
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Enviar Cotización Final
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      {/* Modal Helo Tarifa */}
      {showTarifaHelp && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <Info className="w-5 h-5 mr-2 text-blue-600" /> Guía de Tarifas
              </h3>
              <button onClick={() => setShowTarifaHelp(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="font-bold text-blue-700 text-sm mb-1 uppercase tracking-wider">Basic / Promo</p>
                <p className="text-sm text-slate-600">Solo artículo personal (mochila). No incluye maleta de mano ni bodega. No permite cambios.</p>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                <p className="font-bold text-blue-700 text-sm mb-1 uppercase tracking-wider">Light</p>
                <p className="text-sm text-slate-600">Incluye artículo personal y maleta de mano (10kg). No incluye maleta en bodega.</p>
              </div>
              <div className="p-4 rounded-2xl bg-green-50 border border-green-100">
                <p className="font-bold text-green-700 text-sm mb-1 uppercase tracking-wider">Plus</p>
                <p className="text-sm text-slate-600">Incluye maleta de mano y 1 maleta en bodega (23kg). Selección de asiento estándar.</p>
              </div>
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100">
                <p className="font-bold text-purple-700 text-sm mb-1 uppercase tracking-wider">Top / Flex</p>
                <p className="text-sm text-slate-600">Todo incluido. Maleta de bodega, cambios permitidos sin penalidad (solo diferencia tarifaria) y asiento preferente.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
