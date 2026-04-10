import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NuevaSolicitud from './pages/NuevaSolicitud';
import AdminView from './pages/AdminView';
import ResetPassword from './pages/ResetPassword';
import Navbar from './components/Navbar';

// Wrapper para Rutas Protegidas (incluye Navbar)
const ProtectedRoute = ({
  children,
  session,
  isAdmin,
}: {
  children: React.ReactNode;
  session: Session | null;
  isAdmin: boolean;
}) => {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return (
    <>
      <Navbar session={session} isAdmin={isAdmin} />
      {children}
    </>
  );
};

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Detectar si el usuario logueado es admin
  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      return;
    }
    const checkAdmin = async () => {
      const { data } = await supabase.rpc('get_mi_empleado');
      if (data && data.length > 0) {
        const { data: emp } = await supabase
          .from('empleados')
          .select('is_admin')
          .eq('id_empleado', data[0].id_empleado)
          .single();
        setIsAdmin(emp?.is_admin ?? false);
      }
    };
    checkAdmin();
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        Cargando acceso...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <Routes>
          <Route
            path="/login"
            element={session ? <Navigate to="/dashboard" replace /> : <Login />}
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute session={session} isAdmin={isAdmin}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/nueva-solicitud"
            element={
              <ProtectedRoute session={session} isAdmin={isAdmin}>
                <NuevaSolicitud />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute session={session} isAdmin={isAdmin}>
                <AdminView />
              </ProtectedRoute>
            }
          />

          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
