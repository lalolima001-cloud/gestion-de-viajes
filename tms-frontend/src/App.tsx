import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NuevaSolicitud from './pages/NuevaSolicitud';
import AdminView from './pages/AdminView';

// Wrapper para Rutas Protegidas
const ProtectedRoute = ({ children, session }: { children: React.ReactNode, session: Session | null }) => {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Al cargar buscar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Suscribirse a cambios (Login/Logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Cargando acceso...</div>;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
        <Routes>
          <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute session={session}>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/nueva-solicitud" element={
            <ProtectedRoute session={session}>
              <NuevaSolicitud />
            </ProtectedRoute>
          } />
          
          <Route path="/admin" element={
            <ProtectedRoute session={session}>
              <AdminView />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
