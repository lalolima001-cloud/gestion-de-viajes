import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  CheckCircle, AlertCircle, Loader2, Plane, 
  Hash, Send
} from 'lucide-react';

interface Cotizacion {
  id_cotizacion: string;
  id_solicitud: string;
  aerolinea: string;
  nro_vuelo_ida: string;
  nro_vuelo_vuelta: string | null;
  fecha_hora_salida: string;
  fecha_hora_salida_vuelta: string | null;
  tarifa_usd: number;
  solicitudes_viaje: {
    origen: string;
    destino: string;
    fecha_viaje_ida: string;
    fecha_viaje_vuelta: string | null;
    empleados: { nombres: string; ap_paterno: string; email_corporativo: string };
  };
}

const AEROPUERTOS: Record<string, string> = {
  LIM: 'Lima (Chavez)', AQP: 'Arequipa (Rodríguez Ballón)', CUZ: 'Cusco (Velasco Astete)',
  PIU: 'Piura (Concha Iberico)', TPP: 'Tarapoto', IQT: 'Iquitos (Secada Vignetta)',
  CIX: 'Chiclayo (Quiñones)', TRU: 'Trujillo (Martínez de Pinillos)', PCL: 'Pucallpa (David Abensur)',
  JUL: 'Juliaca (Manco Cápac)', TCQ: 'Tacna (Carlos Ciriani)', CJA: 'Cajamarca',
  AYP: 'Ayacucho', JAU: 'Jauja (Francisco Carlé)', PEM: 'Puerto Maldonado (Padre Aldamiz)',
  TBP: 'Tumbes', TYL: 'Talara', CHH: 'Chachapoyas', HUU: 'Huánuco', ATA: 'Anta / Huaraz'
};

const formatearFechaLarga = (fechaHoraStr: string | null | undefined) => {
  if (!fechaHoraStr) return '';
  const [datePart, timePart] = fechaHoraStr.split('T');
  if(!datePart) return fechaHoraStr;
  const parts = datePart.split('-');
  if(parts.length !== 3) return fechaHoraStr;
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  return `${parts[2]} de ${meses[parseInt(parts[1], 10) - 1]} del ${parts[0]}` + (timePart ? ` a las ${timePart.substring(0,5)}` : '');
};

export default function ConfirmarReserva() {
  const { id_cotizacion } = useParams<{ id_cotizacion: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);

  const [pnrs, setPnrs] = useState({
    ida: '',
    vuelta: ''
  });

  useEffect(() => {
    const fetchCotizacion = async () => {
      if (!id_cotizacion) return;
      const { data, error } = await supabase
        .from('cotizaciones_vuelo')
        .select(`
          id_cotizacion, id_solicitud, aerolinea, nro_vuelo_ida, nro_vuelo_vuelta, tarifa_usd, fecha_hora_salida, fecha_hora_salida_vuelta,
          solicitudes_viaje (
            origen, destino, fecha_viaje_ida, fecha_viaje_vuelta,
            empleados (nombres, ap_paterno, email_corporativo)
          )
        `)
        .eq('id_cotizacion', id_cotizacion)
        .single();

      if (error || !data) {
        setError('No se encontró la cotización seleccionada o el enlace es inválido.');
      } else {
        setCotizacion(data as any);
      }
      setLoading(false);
    };

    fetchCotizacion();
  }, [id_cotizacion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cotizacion || !id_cotizacion) return;
    setSubmitting(true);
    setError(null);

    try {
      // 1. Actualizar PNRs en la cotización
      const { error: updateError } = await supabase
        .from('cotizaciones_vuelo')
        .update({
          pnr_vuelo_ida: pnrs.ida.trim().toUpperCase(),
          pnr_vuelo_vuelta: cotizacion.nro_vuelo_vuelta ? pnrs.vuelta.trim().toUpperCase() : null
        })
        .eq('id_cotizacion', id_cotizacion);

      if (updateError) throw updateError;

      // 2. Marcar solicitud como COMPLETADO
      await supabase
        .from('solicitudes_viaje')
        .update({ estado_solicitud: 'completado' })
        .eq('id_solicitud', cotizacion.id_solicitud);

      // 3. Notificar a n8n para correos finales de forma directa (Bypass)
      const finalUrl = import.meta.env.VITE_N8N_WEBHOOK_BOOKING_URL;
      fetch(finalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record: {
            id_cotizacion: id_cotizacion,
            pnr_vuelo_ida: pnrs.ida.trim().toUpperCase(),
            pnr_vuelo_vuelta: cotizacion.nro_vuelo_vuelta ? pnrs.vuelta.trim().toUpperCase() : null,
            email_pasajero: cotizacion.solicitudes_viaje.empleados.email_corporativo,
            nombre_pasajero: `${cotizacion.solicitudes_viaje.empleados.nombres} ${cotizacion.solicitudes_viaje.empleados.ap_paterno}`,
            origen: AEROPUERTOS[cotizacion.solicitudes_viaje.origen] || cotizacion.solicitudes_viaje.origen,
            destino: AEROPUERTOS[cotizacion.solicitudes_viaje.destino] || cotizacion.solicitudes_viaje.destino,
            fecha_salida: formatearFechaLarga(cotizacion.fecha_hora_salida),
            fecha_retorno: formatearFechaLarga(cotizacion.fecha_hora_salida_vuelta)
          }
        })
      }).catch(err => console.error('Error notifying final booking to n8n:', err));

      setSubmitted(true);
    } catch (err: any) {
      setError('Error al confirmar la reserva: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !cotizacion) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Error</h1>
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
          <h1 className="text-2xl font-bold text-slate-800 mb-2">¡Reserva Confirmada!</h1>
          <p className="text-slate-500 mb-8">Los códigos de reserva han sido registrados y se han enviado las notificaciones finales al viajero y responsable.</p>
          <p className="text-xs text-slate-400">Puede cerrar esta ventana.</p>
        </div>
      </div>
    );
  }

  const { solicitudes_viaje: sol } = cotizacion;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-blue-600 p-8 text-white">
            <h1 className="text-2xl font-bold">Confirmar Emisión de Boletos</h1>
            <p className="text-blue-100 text-sm mt-1">Ingrese los códigos de reserva (PNR) para finalizar el proceso.</p>
          </div>

          <div className="p-8">
            <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4">Detalle del Vuelo Seleccionado</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 font-medium">Pasajero</p>
                  <p className="font-bold text-slate-800">{sol.empleados.nombres} {sol.empleados.ap_paterno}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Ruta</p>
                  <p className="font-bold text-slate-800">{sol.origen} &rarr; {sol.destino}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Aerolínea / Vuelo</p>
                  <p className="font-bold text-slate-800">{cotizacion.aerolinea} - {cotizacion.nro_vuelo_ida}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Tarifa</p>
                  <p className="font-bold text-green-600">${cotizacion.tarifa_usd} USD</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center">
                  <Hash className="w-4 h-4 mr-2 text-blue-600" /> Código de Reserva (PNR) - IDA
                </label>
                <input 
                  required
                  type="text"
                  maxLength={10}
                  placeholder="Ej. ABC123"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-lg uppercase"
                  value={pnrs.ida}
                  onChange={e => setPnrs({...pnrs, ida: e.target.value})}
                />
              </div>

              {cotizacion.nro_vuelo_vuelta && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center">
                    <Hash className="w-4 h-4 mr-2 text-blue-600" /> Código de Reserva (PNR) - VUELTA
                  </label>
                  <input 
                    required
                    type="text"
                    maxLength={10}
                    placeholder="Ej. XYZ789"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-lg uppercase"
                    value={pnrs.vuelta}
                    onChange={e => setPnrs({...pnrs, vuelta: e.target.value})}
                  />
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center text-sm">
                  <AlertCircle className="w-5 h-5 mr-2" /> {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center transition-all"
              >
                {submitting ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" /> Confirmar Emisión y Notificar
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center text-slate-400 space-x-2 text-sm">
          <Plane className="w-4 h-4" />
          <span>FARMEX TMS - Sistema de Operaciones</span>
        </div>
      </div>
    </div>
  );
}
