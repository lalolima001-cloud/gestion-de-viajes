import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plane, ArrowRight, Mail, Lock, KeyRound, ArrowLeft, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type View = 'login' | 'signup' | 'forgot';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState<View>('login');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const navigate = useNavigate();

  const resetMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/dashboard');
    } catch (error: any) {
      setErrorMsg(error.message || 'Credenciales incorrectas.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();
    try {
      // 1. Verificar que el email esté registrado en el sistema por el admin
      const { data: empCheck, error: empError } = await supabase
        .from('empleados')
        .select('auth_user_id, email_corporativo')
        .eq('email_corporativo', email)
        .maybeSingle();

      if (empError || !empCheck) {
        setErrorMsg('Este correo no está registrado en el sistema. Contacta al administrador de FARMEX TMS para habilitar tu acceso.');
        setLoading(false);
        return;
      }

      if (empCheck.auth_user_id) {
        setErrorMsg('Este correo ya tiene una cuenta activa. Inicia sesión o usa "¿Olvidaste tu contraseña?" para recuperar el acceso.');
        setLoading(false);
        return;
      }

      // 2. Email válido y sin cuenta previa → crear cuenta
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      setSuccessMsg('¡Registro exitoso! Revisa tu correo para confirmar la cuenta. Luego podrás iniciar sesión.');
      setPassword('');
    } catch (error: any) {
      const msg: string = error.message ?? '';
      if (msg.includes('Password should be')) {
        setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setErrorMsg(msg || 'Error al registrarse. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // En producción, apunta a tu dominio real
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSuccessMsg(`Se envió un enlace para restablecer la contraseña a ${email}. Revisa tu bandeja de entrada (y spam).`);
    } catch (error: any) {
      setErrorMsg(error.message || 'Error al enviar el correo de recuperación.');
    } finally {
      setLoading(false);
    }
  };

  const switchView = (newView: View) => {
    resetMessages();
    setPassword('');
    setView(newView);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="p-8 text-center bg-gradient-to-b from-blue-50 to-white">
          <div className="mx-auto bg-blue-600 w-16 h-16 flex items-center justify-center rounded-2xl shadow-lg shadow-blue-200 mb-6 transform -rotate-6 transition hover:rotate-0">
            <Plane className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">FARMEX TMS</h1>
          <p className="text-slate-500">
            {view === 'forgot' ? 'Recuperar contraseña' : 'Sistema de Gestión de Viajes'}
          </p>
        </div>

        <div className="p-8 pt-0">

          {/* Mensajes de error / éxito */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-100 flex items-start">
              <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              {successMsg}
            </div>
          )}

          {/* ===== VISTA: LOGIN ===== */}
          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="ejemplo@farmex.com.pe" required
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-700">Contraseña</label>
                  <button
                    type="button"
                    onClick={() => switchView('forgot')}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="••••••••" required
                  />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center transition-all shadow-md mt-2 group"
              >
                {loading ? 'Verificando...' : 'Ingresar al Portal'}
                {!loading && <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>
          )}

          {/* ===== VISTA: REGISTRO ===== */}
          {view === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Correo Corporativo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="tu.nombre@farmex.com.pe" required
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Usa el email con el que el administrador te registró en el sistema.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Crea una Contraseña</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Mínimo 6 caracteres" minLength={6} required
                  />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center transition-all shadow-md mt-2"
              >
                {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </button>
            </form>
          )}

          {/* ===== VISTA: RECUPERAR CONTRASEÑA ===== */}
          {view === 'forgot' && !successMsg && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-700">
                <p className="font-medium mb-1 flex items-center"><KeyRound className="w-4 h-4 mr-1.5"/>Recuperar acceso</p>
                <p>Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="tu.correo@dominio.com" required
                  />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center transition-all shadow-md"
              >
                {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </button>
            </form>
          )}

          {/* Links de navegación entre vistas */}
          <div className="mt-6 text-center space-y-2">
            {view !== 'login' && (
              <button type="button" onClick={() => switchView('login')}
                className="flex items-center mx-auto text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Volver al inicio de sesión
              </button>
            )}
            {view === 'login' && (
              <button type="button" onClick={() => switchView('signup')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                ¿No tienes cuenta? Regístrate aquí
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
