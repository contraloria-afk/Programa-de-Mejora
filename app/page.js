'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inicialización de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdvanOneScampiSaas() {
  // Autenticación
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Control de la aplicación
  const [activeMenu, setActiveMenu] = useState('Matriz de Evaluación');
  const [selectedTenant, setSelectedTenant] = useState('Cliente Corporativo Alfa');

  // Estados de datos (Base de datos real)
  const [categories, setCategories] = useState([]);
  const [criterios, setCriterios] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados del Modal de Captura
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCriterio, setActiveCriterio] = useState(null);
  const [modalOu, setModalOu] = useState('Matriz_Norte');
  const [evDirecta, setEvDirecta] = useState('');
  const [evIndirecta, setEvIndirecta] = useState('');
  const [statusScampi, setStatusScampi] = useState('NONE');
  const [afirmaciones, setAfirmaciones] = useState([]);
  const [newAfirmacion, setNewAfirmacion] = useState('');

  // Formulario de altas
  const [newModCat, setNewModCat] = useState('');
  const [newModNombre, setNewModNombre] = useState('');
  const [newModCriterio, setNewModCriterio] = useState('');

  // Cargar datos reales de Supabase
  async function fetchInitialData() {
    setLoading(true);
    try {
      let { data: cats } = await supabase.from('categorias').select('*');
      let { data: crits } = await supabase.from('criterios').select('id, descripcion, modulos(id, nombre, categoria_id, categorias(nombre))');
      let { data: evals } = await supabase.from('evaluaciones').select('*');

      setCategories(cats || []);
      setCriterios(crits || []);
      setEvaluaciones(evals || []);
      if (cats && cats.length > 0) setNewModCat(cats[0].id);
    } catch (error) {
      console.error("Error sincronizando con base de datos:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Manejo de login simulado
  const handleLogin = (e) => {
    e.preventDefault();
    if (email.trim() !== '' && password.trim() !== '') {
      setIsAuthenticated(true);
    }
  };

  // Cambiar datos del modal según OU seleccionada
  useEffect(() => {
    if (activeCriterio) {
      const ev = evaluaciones.find(e => e.criterio_id === activeCriterio.id && e.organizational_unit === modalOu);
      setEvDirecta(ev ? ev.evidencia_directa : '');
      setEvIndirecta(ev ? ev.evidencia_indirecta : '');
      setStatusScampi(ev ? ev.status_scampi : 'NONE');
      setAfirmaciones(ev && ev.afirmaciones ? ev.afirmaciones : []);
    }
  }, [modalOu, activeCriterio, evaluaciones]);

  // Contadores dinámicos para las tarjetas superiores
  const totalCriterios = criterios.length;
  const evaluadosFI = evaluaciones.filter(e => e.status_scampi === 'FI').length;
  const evaluadosTotal = evaluaciones.filter(e => e.status_scampi !== 'NONE' && e.status_scampi !== '').length;

  const saveEvaluation = async () => {
    const payload = {
      criterio_id: activeCriterio.id,
      organizational_unit: modalOu,
      evidencia_directa: evDirecta,
      evidencia_indirecta: evIndirecta,
      afirmaciones: afirmaciones,
      status_scampi: statusScampi,
      updated_at: new Date()
    };

    const { error } = await supabase.from('evaluaciones').upsert(payload, { onConflict: 'criterio_id, organizational_unit' });
    if (!error) {
      await fetchInitialData();
      setIsModalOpen(false);
    } else {
      alert("Error al guardar en Supabase.");
    }
  };

  const handleAddModulo = async (e) => {
    e.preventDefault();
    const { data: newMod, error: errMod } = await supabase
      .from('modulos')
      .insert({ categoria_id: newModCat, nombre: newModNombre.toUpperCase() })
      .select().single();

    if (errMod) { alert("Error al registrar módulo."); return; }

    const { error: errCrit } = await supabase
      .from('criterios')
      .insert({ modulo_id: newMod.id, descripcion: newModCriterio });

    if (errCrit) { alert("Error al registrar criterio."); return; }

    setNewModNombre('');
    setNewModCriterio('');
    await fetchInitialData();
    setActiveMenu('Matriz de Evaluación');
  };

  // 1. INTERFAZ DE LOGIN (Estilo ADVAN ONE)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 border border-slate-100 flex flex-col items-center">
          <div className="bg-[#0f172a] text-white font-black text-xs px-4 py-2 rounded-xl tracking-widest mb-6">ONE</div>
          <h2 className="text-2xl font-bold text-[#0f172a] tracking-tight text-center">Bienvenido de nuevo</h2>
          <p className="text-xs text-slate-400 font-medium mt-1 text-center mb-8">Ingresa tus credenciales para continuar</p>
          <form onSubmit={handleLogin} className="w-full space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Correo Electrónico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50/50 focus:outline-none focus:border-orange-500 transition" required />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Contraseña</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50/50 focus:outline-none focus:border-orange-500 transition" required />
            </div>
            <button type="submit" className="w-full bg-[#f27405] hover:bg-orange-600 text-white font-bold text-xs p-3.5 rounded-xl transition shadow-md shadow-orange-500/20">Iniciar sesión →</button>
          </form>
          <div className="mt-8 text-center flex items-center space-x-1.5 text-[10px] text-slate-400 font-medium">
            <span>🔒 Conexión segura</span><span>•</span><span>Datos cifrados con SSL</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. APLICACIÓN PRINCIPAL FUSIONADA
  return (
    <div className="min-h-screen bg-[#f8fafc] flex antialiased text-slate-900">
      
      {/* Barra Lateral ADVAN ONE */}
      <aside className="w-64 bg-[#0f172a] text-slate-400 flex flex-col justify-between border-r border-slate-800">
        <div>
          <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
            <div className="h-8 w-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-black text-xs tracking-tighter">ONE</div>
            <div>
              <h1 className="text-xs font-black text-white tracking-wider">ADVAN</h1>
              <p className="text-[9px] text-slate-500 font-bold tracking-widest uppercase">CON-e Platform</p>
            </div>
          </div>

          <nav className="p-3 space-y-1">
            <p className="text-[9px] uppercase tracking-wider font-bold text-slate-600 px-3 pt-2 pb-1">Evaluación de Procesos</p>
            <button 
              onClick={() => setActiveMenu('Matriz de Evaluación')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${activeMenu === 'Matriz de Evaluación' ? 'bg-slate-800 text-white border-l-4 border-orange-500' : 'hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <span>📊</span> <span>Matriz de Caracterización</span>
            </button>
            <button 
              onClick={() => setActiveMenu('Configuración')}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${activeMenu === 'Configuración' ? 'bg-slate-800 text-white border-l-4 border-orange-500' : 'hover:bg-slate-900 hover:text-slate-200'}`}
            >
              <span>⚙️</span> <span>Configuración / Altas</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex flex-col space-y-2">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">U</div>
            <p className="text-xs font-bold text-white">Auditor Especialista</p>
          </div>
          <button onClick={() => setIsAuthenticated(false)} className="text-[10px] text-left text-rose-400 font-bold">Cerrar sesión</button>
        </div>
      </aside>

      {/* Área de Contenido Principal */}
      <main className="flex-1 flex flex-col">
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{activeMenu}</span>
          
          {/* Selector de Cliente Corporativo (Tenant) */}
          <div className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg border flex items-center space-x-2">
            <span className="font-bold text-slate-500">CLIENTE:</span>
            <select value={selectedTenant} onChange={(e) => setSelectedTenant(e.target.value)} className="bg-transparent font-bold text-slate-800 focus:outline-none">
              <option value="Cliente Corporativo Alfa">Cliente Corporativo Alfa</option>
              <option value="Auditoría Interna Beta">Auditoría Interna Beta</option>
            </select>
          </div>
        </header>

        <div className="p-6 md:p-8 space-y-6">
          
          {/* Tarjetas de Contadores con tus métricas reales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-400 tracking-wide uppercase">Criterios en el Modelo</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{totalCriterios}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-400 tracking-wide uppercase">Prácticas Evaluadas</p>
              <p className="text-3xl font-black text-indigo-600 mt-1">{evaluadosTotal}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <p className="text-[11px] font-bold text-slate-400 tracking-wide uppercase">Cumplimiento Pleno (FI)</p>
              <p className="text-3xl font-black text-emerald-600 mt-1">{evaluadosFI}</p>
            </div>
          </div>

          {/* VISTA 1: MATRIZ CON FUNCIONES REALES */}
          {activeMenu === 'Matriz de Evaluación' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Caracterización de Prácticas de Adopción (SCAMPI)</h3>
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5 w-1/4">Módulo / Componente</th>
                    <th className="p-3.5 w-2/5">Criterio Técnico Esperado</th>
                    <th className="p-3.5 text-center">OU 1: Norte</th>
                    <th className="p-3.5 text-center">OU 2: Sur</th>
                    <th className="p-3.5 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr><td colSpan="5" className="p-8 text-center text-slate-400">Sincronizando Cloud...</td></tr>
                  ) : criterios.length === 0 ? (
                    <tr><td colSpan="5" className="p-8 text-center text-slate-400">No hay criterios en la base de datos. Ve a Configuración para agregar uno.</td></tr>
                  ) : (
                    criterios.map(crit => {
                      const ev1 = evaluaciones.find(e => e.criterio_id === crit.id && e.organizational_unit === 'Matriz_Norte');
                      const ev2 = evaluaciones.find(e => e.criterio_id === crit.id && e.organizational_unit === 'Sucursal_Sur');
                      const st1 = ev1 ? ev1.status_scampi : 'NONE';
                      const st2 = ev2 ? ev2.status_scampi : 'NONE';

                      return (
                        <tr key={crit.id} className="hover:bg-slate-50/50">
                          <td className="p-3.5 font-bold text-slate-900">
                            <span className="block text-[9px] uppercase tracking-wider text-orange-500 mb-0.5">{crit.modulos?.categorias?.nombre}</span>
                            {crit.modulos?.nombre}
                          </td>
                          <td className="p-3.5 text-slate-600 leading-relaxed font-medium">{crit.descripcion}</td>
                          <td className="p-3.5 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded font-bold border text-[10px] status-${st1.toLowerCase()}`}>{st1}</span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded font-bold border text-[10px] status-${st2.toLowerCase()}`}>{st2}</span>
                          </td>
                          <td className="p-3.5 text-center">
                            <button 
                              onClick={() => { setActiveCriterio(crit); setIsModalOpen(true); }}
                              className="bg-[#0f172a] text-white font-bold px-3 py-1.5 rounded-lg hover:bg-orange-500 transition text-[11px]"
                            >
                              Evaluar
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* VISTA 2: ALTAS Y CONFIGURACIÓN */}
          {activeMenu === 'Configuración' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-xl">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Inyectar Componente al SaaS</h3>
              <form onSubmit={handleAddModulo} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-500 uppercase mb-1">Categoría</label>
                  <select value={newModCat} onChange={(e) => setNewModCat(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 bg-white font-semibold">
                    {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-500 uppercase mb-1">Nombre del Componente (Siglas)</label>
                  <input type="text" value={newModNombre} onChange={(e) => setNewModNombre(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 uppercase font-mono" placeholder="Ej: LOG-AUDIT" required />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 uppercase mb-1">Criterio / Práctica Esperada</label>
                  <textarea value={newModCriterio} onChange={(e) => setNewModCriterio(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 h-20" placeholder="Escriba el requerimiento de auditoría..." required />
                </div>
                <button type="submit" className="bg-orange-500 text-white font-bold px-4 py-2 rounded-lg hover:bg-orange-600 transition">💾 Guardar Requerimiento</button>
              </form>
            </div>
          )}

        </div>
      </main>

      {/* MODAL DE CAPTURA DE EVIDENCIAS */}
      {isModalOpen && activeCriterio && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full flex flex-col text-xs border border-slate-200">
            <div className="bg-[#0f172a] text-white p-4 rounded-t-xl flex justify-between items-center">
              <div>
                <span className="text-[9px] bg-orange-500 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Evidencias Físicas y Testimonios</span>
                <h4 className="font-bold text-sm mt-1">Módulo: {activeCriterio.modulos?.nombre}</h4>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white font-bold text-lg">&times;</button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                <span className="font-bold text-slate-700">Unidad Operativa (OU) bajo revisión:</span>
                <select value={modalOu} onChange={(e) => setModalOu(e.target.value)} className="border rounded px-2 py-1 bg-white font-bold text-slate-800">
                  <option value="Matriz_Norte">OU 1: Norte (Matriz)</option>
                  <option value="Sucursal_Sur">OU 2: Sur (Sucursal)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-500 uppercase text-[9px]">📁 Evidencias Directas</label>
                  <textarea value={evDirecta} onChange={(e) => setEvDirecta(e.target.value)} className="w-full border rounded-lg p-2 h-16 bg-white" placeholder="Rutas, minutas, manuales..." />
                </div>
                <div className="space-y-1">
                  <label className="block font-bold text-slate-500 uppercase text-[9px]">💻 Evidencias Indirectas</label>
                  <textarea value={evIndirecta} onChange={(e) => setEvIndirecta(e.target.value)} className="w-full border rounded-lg p-2 h-16 bg-white" placeholder="Logs, capturas de pantalla..." />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border space-y-2">
                <label className="block font-bold text-slate-500 uppercase text-[9px]">🗣️ Afirmaciones (Entrevistas de Validación)</label>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {afirmaciones.map((text, i) => (
                    <div key={i} className="bg-white p-1.5 rounded border flex justify-between items-center font-medium">
                      <span>💬 "{text}"</span>
                      <button onClick={() => setAfirmaciones(afirmaciones.filter((_, idx) => idx !== i))} className="text-rose-500 font-bold">&times;</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newAfirmacion} onChange={(e) => setNewAfirmacion(e.target.value)} className="flex-1 border rounded-md p-1 bg-white" placeholder="Agregar testimonio..." />
                  <button onClick={() => { if(newAfirmacion.trim()) { setAfirmaciones([...afirmaciones, newAfirmacion.trim()]); setNewAfirmacion(''); } }} className="bg-slate-800 text-white px-3 rounded-md font-bold">Añadir</button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 uppercase text-[9px] mb-2">🚦 Calacterización SCAMPI</label>
                <div className="grid grid-cols-4 gap-2 text-center font-bold">
                  {['FI', 'LI', 'PI', 'NI'].map(status => (
                    <button 
                      key={status} type="button" onClick={() => setStatusScampi(status)} 
                      className={`p-2 rounded-lg border transition-all ${statusScampi === status ? `border-2 border-slate-900 status-${status.toLowerCase()} scale-102 shadow-inner` : 'border-slate-200 bg-slate-50 text-slate-600'}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end space-x-2 rounded-b-xl">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border bg-white rounded-lg font-semibold">Cancelar</button>
              <button onClick={saveEvaluation} className="px-4 py-2 bg-orange-500 text-white rounded-lg font-bold shadow-sm hover:bg-orange-600">Sincronizar Cloud</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
