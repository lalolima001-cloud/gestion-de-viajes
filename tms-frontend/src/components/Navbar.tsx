import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plane, LogOut, ShieldCheck, LayoutDashboard, ChevronDown } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

interface NavbarProps {
  session: Session;
  isAdmin?: boolean;
}

export default function Navbar({ session, isAdmin }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const userEmail = session.user.email ?? '';
  const userInitial = userEmail.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center space-x-2 text-slate-800 hover:text-blue-600 transition-colors">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Plane className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm hidden sm:block">FARMEX TMS</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center space-x-1">
          <Link
            to="/dashboard"
            className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === '/dashboard'
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mr-1.5" />
            Mis Viajes
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className={`flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === '/admin'
                  ? 'bg-purple-50 text-purple-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4 mr-1.5" />
              Administración
            </Link>
          )}
        </nav>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center space-x-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {userInitial}
            </div>
            <span className="text-sm text-slate-700 font-medium hidden sm:block max-w-[140px] truncate">
              {userEmail}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs text-slate-400 font-medium">Sesión activa</p>
                <p className="text-sm text-slate-700 font-semibold truncate">{userEmail}</p>
              </div>
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 mr-2 text-purple-500" />
                  Panel Admin
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
