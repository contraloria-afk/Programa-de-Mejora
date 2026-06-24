'use client';

import { useState } from 'react';

export default function AdvanOnePlatform() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeMenu, setActiveMenu] = useState('Inicio');

  const handleLogin = (e) => {
    e.preventDefault();
    // Validación de simulación para entorno SaaS
    if (email.trim() !== '' && password.trim() !== '') {
      setIsAuthenticated(true);
    }
  };

  // 1. VISTA DE LOGIN (Imagen 3: image_cf49f6.png)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 border border-slate-100 flex flex-col items-center">
          
          {/* Logo Identical to image_cf49f6.png */}
          <div className="bg-[#0f172a] text-white font-black text-xs px-4 py-2 rounded-xl tracking-widest mb-6">
            ONE
          </div>

          <h2 className="text-2xl font-bold text-[#0f172a] tracking-tight text-center">Bienvenido de nuevo</h2>
          <p className="text-xs text-slate-400 font-medium mt-1 text-center mb-8">Ingresa tus credenciales para continuar</p>

          <form onSubmit={handleLogin} className="w-full space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com" 
                className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50/50 focus:outline-none focus:border-orange-500 transition"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contraseña</label>
              </div>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50/50 focus:outline-none focus:border-orange-500 transition"
                  required
                />
              </div>
              <div className="text-right mt-2">
                <a href="#" className="text-[11px] text-orange-500 font-bold hover:underline">¿Olvidaste tu contraseña?</a>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-[#f27405] hover:bg-orange-600 text-white font-bold text-xs p-3.5 rounded-xl transition shadow-md shadow-orange-500/20 flex items-center justify-center space-x-1"
            >
              <span>Iniciar sesión</span> <span>➔</span>
            </button>
          </form>

          <div className="mt-8 text-center flex items-center space-x-1.5 text-[10px] text-slate-400 font-medium">
            <span>🔒 Conexión segura</span>
            <span>•</span>
            <span>Datos cifrados con SSL</span>
          </div>

        </div>
      </div>
    );
  }

  // 2. VISTA DASHBOARD PRINCIPAL (Imagen 2: image_cf4997.png)
  return (
    <div className="min-h-screen bg-[#f8fafc] flex antialiased">
      
      {/* Sidebar - Identical to image_cf4997.png */}
      <aside className="w-64 bg-[#0f172a] text-slate-400 flex flex-col justify-between border-r border-slate-800">
        <div>
          {/* Header Sidebar Brand */}
          <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
            <div className="h-8 w-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-black text-xs tracking-tighter">
              ONE
            </div>
            <div>
              <h1 className="text-xs font-black text-white tracking-wider">ADVAN</h1>
              <p className="text-[9px] text-slate-500 font-bold tracking-widest uppercase">CON-e Platform</p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="p-3 space-y-1">
            {[
              { name: 'Inicio', icon: '🏠' },
              { name: 'Proyectos', icon: '⚃' },
              { name: 'Servicios', icon: '⚙️' },
              { name: 'Ventas Consultivas', icon: '💼', isLabel: true },
              { name: 'Cotizador', icon: '📋' },
              { name: 'Gobernanza', icon: '🛡️' },
              { name: 'Asig. Recursos', icon: '👥' },
              { name: 'Tickets', icon: '🎫' },
              { name: 'E-learning', icon: '🎓' },
              { name: 'Reportes', icon: '📊' },
              { name: 'Administración', icon: '⚙️' }
            ].map((item, idx) => (
              item.isLabel ? (
                <p key={idx} className="text-[9px] uppercase tracking-wider font-bold text-slate-600 px-3 pt-3 pb-1">{item.name}</p>
              ) : (
                <button
                  key={idx}
                  onClick={() => setActiveMenu(item.name)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${activeMenu === item.name ? 'bg-slate-800 text-white border-l-4 border-orange-500' : 'hover:bg-slate-900 hover:text-slate-200'}`}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </button>
              )
            ))}
          </nav>
        </div>

        {/* User Footer Account */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex flex-col space-y-2">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs border border-indigo-500">
              U
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white">Usuario</p>
            </div>
          </div>
          <button 
            onClick={() => setIsAuthenticated(false)} 
            className="text-[10px] text-left text-rose-400 hover:text-rose-300 font-bold px-1 transition"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 flex flex-col">
        {/* Top Minimal Bar */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{activeMenu}</span>
        </header>

        {/* Workspace Dashboard View */}
        <div className="p-6 md:p-8 space-y-6">
          
          {/* Counters Grid - Identical to image_cf4997.png */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {[
              { title: 'Proyectos activos', count: 0, color: 'text-teal-600', bg: 'bg-teal-50' },
              { title: 'En ejecución', count: 0, color: 'text-amber-600', bg: 'bg-amber-50' },
              { title: 'Completados', count: 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { title: 'Firmas pendientes', count: 0, color: 'text-rose-600', bg: 'bg-rose-50' },
            ].map((card, i) => (
              <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 tracking-wide">{card.title}</p>
                  <p className="text-3xl font-black text-slate-900 mt-2">{card.count}</p>
                </div>
                <div className={`h-6 w-6 rounded-md ${card.bg} flex items-center justify-center text-xs`}>
                  ◽
                </div>
              </div>
            ))}
          </div>

          {/* Main Empty State Canvas */}
          <div className="bg-white rounded-2xl border border-slate-200 p-12 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">Mi proyecto</h3>
            <p className="text-xs text-slate-400">Sin proyectos asignados</p>

            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-4xl text-slate-300 mb-3">📋</div>
              <p className="text-xs font-bold text-slate-400">No hay proyectos activos aún</p>
            </div>
          </div>

        </div>
      </main>

    </div>
  );
}
