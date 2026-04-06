import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plane, ArrowRight, Mail, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const navigate = useNavigate();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccessMsg('Revisa tu correo para confirmar el registro.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/dashboard');
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Ocurrió un error en la autenticación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="p-8 text-center bg-gradient-to-b from-blue-50 to-white">
          <div className="mx-auto bg-blue-600 w-16 h-16 flex items-center justify-center rounded-2xl shadow-lg shadow-blue-200 mb-6 transform -rotate-6 transition hover:rotate-0">
            <Plane className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">FARMEX TMS</h1>
          <p className="text-slate-500">Sistema de Gestión de Viajes</p>
        </div>
        
        <div className="p-8 pt-0">
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm font-medium border border-green-100">
                {successMsg}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="ejemplo@farmex.com.pe"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center transition-all shadow-md mt-2 group"
            >
              {loading ? 'Procesando...' : (isSignUp ? 'Crear Cuenta' : 'Ingresar al Portal')}
              {!loading && <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <button 
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              {isSignUp ? '¿Ya tienes cuenta? Inicia sesión aquí' : '¿No tienes cuenta? Regístrate aquí'}
            </button>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6 font-medium">
            Por el momento, acceso temporal sin Azure configurado.
          </p>
        </div>
      </div>
    </div>
  );
}
