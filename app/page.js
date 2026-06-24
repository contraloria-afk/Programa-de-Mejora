'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function SaasProApp() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'matrix', 'admin'
  const [selectedTenant, setSelectedTenant] = useState('Cliente Corporativo Alfa');
  
  // Datos del Modelo
  const [categories, setCategories] = useState([]);
  const [criterios, setCriterios] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCriterio, setActiveCriterio] = useState(null);
  const [modalOu, setModalOu] = useState('Matriz_Norte');
  const [evDirecta, setEvDirecta] = useState('');
  const [evIndirecta, setEvIndirecta] = useState('');
  const [statusScampi, setStatusScampi] = useState('NONE');
  const [afirmaciones, setAfirmaciones] = useState([]);
  const [newAfirmacion, setNewAfirmacion] = useState('');

  // Form States
  const [newModCat, setNewModCat] = useState('');
  const [newModNombre, setNewModNombre] = useState('');
  const [newModCriterio, setNewModCriterio] = useState('');

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
      console.error("SaaS Sync Error:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeCriterio) {
      const ev = evaluaciones.find(e => e.criterio_id === activeCriterio.id && e.organizational_unit === modalOu);
      setEvDirecta(ev ? ev.evidencia_directa : '');
      setEvIndirecta(ev ? ev.evidencia_indirecta : '');
      setStatusScampi(ev ? ev.status_scampi : 'NONE');
      setAfirmaciones(ev && ev.afirmaciones ? ev.afirmaciones : []);
    }
  }, [modalOu, activeCriterio, evaluaciones]);

  // Cálculos de Métricas para el Dashboard SaaS
  const totalCriterios = criterios.length;
  const evaluadosFI = evaluaciones.filter(e => e.status_scampi === 'FI').length;
  const evaluadosLI = evaluaciones.filter(e => e.status_scampi === 'LI').length;
  const totalEvaluados = evaluaciones.filter(e => e.status_scampi !== 'NONE').length;
  const porcentajeProgreso = totalCriterios > 0 ? Math.round((totalEvaluados / (totalCriterios * 2)) * 100) : 0; // *2 por las 2 OUs

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
      alert("Error al sincronizar datos.");
    }
  };

  return (
    <div className="bg-[#f8fafc] text-slate-900 min-h-screen flex flex-col antialiased">
      
      {/* SaaS Top Header */}
      <header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
            A1
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Advan-One Appraisal Suite</h1>
            <p className="text-xs text-slate-500 font-medium">SCAMPI v2.0 Compliance Engine</p>
          </div>
        </div>

        {/* Multi-Tenant Selector */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
            <span className="text-xs font-semibold text-slate-500 uppercase px-2">Organización:</span>
            <select 
              value={selectedTenant} 
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded px-2.5 py-1 focus:outline-none shadow-2xs"
            >
              <option value="Cliente Corporativo Alfa">Cliente Corporativo Alfa</option>
              <option value="Industrias del Norte SA">Industrias del Norte SA</option>
              <option value="Consultoría Global Global">Consultoría Global Global</option>
            </select>
          </div>
          <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-300">
            AU
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        
        {/* Navigation Sidebar */}
        <aside className="w-64 bg-slate-900 text-slate-400 p-4 flex flex-col justify-between hidden md:flex">
          <div className="space-y-6">
            <div>
              <p className="px-3 text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-3">Módulos SaaS</p>
              <nav className="space-y-1">
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  <span>📈</span> <span>Dashboard General</span>
                </button>
                <button 
                  onClick={() => setActiveTab('matrix')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'matrix' ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  <span>📊</span> <span>Matriz de Caracterización</span>
                </button>
                <button 
                  onClick={() => setActiveTab('admin')}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'admin' ? 'bg-indigo-700 text-white shadow-md' : 'hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  <span>⚙️</span> <span>Configuración del Modelo</span>
                </button>
              </nav>
            </div>

            <div>
              <p className="px-3 text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">Estructura Activa</p>
              <div className="space-y-1 px-1">
                {categories.map(c => (
                  <div key={c.id} className="text-xs bg-slate-800/50 text-slate-400 px-3 py-2 rounded-md border border-slate-800 truncate font-mono">
                    📁 {c.nombre}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-600 font-mono">
            SaaS Pro Version • v2.1
          </div>
        </aside>

        {/* Dashboard / Workspace Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          
          {/* TAB 1: DASHBOARD EXECUTIVE VIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Panel de Control General</h2>
                  <p className="text-xs text-slate-500 mt-1">Estatus del cumplimiento de objetivos organizacionales para <strong>{selectedTenant}</strong>.</p>
                </div>
                <div className="flex items-center space-x-2 bg-indigo-50 text-indigo-700 text-xs px-3 py-1.5 rounded-lg font-semibold border border-indigo-100">
                  <span>Sincronizado con Postgres Cloud</span>
                </div>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Progreso Global Auditado</p>
                  <div className="flex items-baseline space-x-2 mt-2">
                    <span className="text-2xl font-black text-slate-900">{porcentajeProgreso}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                    <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${porcentajeProgreso}%` }}></div>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Criterios Registrados</p>
                  <p className="text-2xl font-black text-slate-900 mt-2">{totalCriterios}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Definidos en el Core del Modelo</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Plenamente Implementados (FI)</p>
                  <p className="text-2xl font-black text-emerald-600 mt-2">{evaluadosFI}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Cumplimiento total verificado</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Parcialmente (LI)</p>
                  <p className="text-2xl font-black text-amber-600 mt-2">{evaluadosLI}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Con observaciones menores</p>
                </div>
              </div>

              {/* Welcome Information */}
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-xl text-white shadow-sm">
                <h3 className="text-base font-bold">Bienvenido a su Consola SaaS</h3>
                <p className="text-xs text-indigo-200 mt-1 max-w-2xl leading-relaxed">
                  Para iniciar la captura de evidencias físicas, testimonios verbales e indicadores de logs de ERP, cambie a la pestaña de <strong>Matriz de Caracterización</strong> en el menú lateral.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: MATRIZ DE EVALUACIÓN TRADICIONAL */}
          {activeTab === 'matrix' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div>
                  <h3 className="font-bold text-slate-900">Matriz de Caracterización de Procesos</h3>
                  <p className="text-xs text-slate-500">Evaluación cruzada por Unidades Operativas (OU 1 y OU 2).</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5 w-1/4">Componente</th>
                      <th className="p-3.5 w-2/5">Práctica / Criterio</th>
                      <th className="p-3.5 text-center">OU 1: Norte</th>
                      <th className="p-3.5 text-center">OU 2: Sur</th>
                      <th className="p-3.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loading ? (
                      <tr><td colSpan="5" className="p-8 text-center text-slate-400 font-medium">Sincronizando datos con Supabase...</td></tr>
                    ) : criterios.length === 0 ? (
                      <tr><td colSpan="5" className="p-8 text-center text-slate-400">No hay configuraciones dadas de alta. Ve a la pestaña Configuración.</td></tr>
                    ) : (
                      criterios.map(crit => {
                        const ev1 = evaluaciones.find(e => e.criterio_id === crit.id && e.organizational_unit === 'Matriz_Norte');
                        const ev2 = evaluaciones.find(e => e.criterio_id === crit.id && e.organizational_unit === 'Sucursal_Sur');
                        const st1 = ev1 ? ev1.status_scampi : 'NONE';
                        const st2 = ev2 ? ev2.status_scampi : 'NONE';

                        return (
                          <tr key={crit.id} className="hover:bg-slate-50/70 transition">
                            <td className="p-3.5 align-top font-semibold text-slate-900">
                              <span className="block text-[9px] uppercase tracking-wider text-indigo-600 font-bold mb-0.5">
                                {crit.modulos?.categorias?.nombre || 'General'}
                              </span>
                              {crit.modulos?.nombre}
                            </td>
                            <td className="p-3.5 align-top text-slate-600 font-medium leading-relaxed">{crit.descripcion}</td>
                            <td className="p-3.5 text-center align-top">
                              <span className={`inline-block px-2.5 py-1 rounded-md font-bold border shadow-3xs status-${st1.toLowerCase()}`}>{st1}</span>
                            </td>
                            <td className="p-3.5 text-center align-top">
                              <span className={`inline-block px-2.5 py-1 rounded-md font-bold border shadow-3xs status-${st2.toLowerCase()}`}>{st2}</span>
                            </td>
                            <td className="p-3.5 text-center align-top">
                              <button 
                                onClick={() => openModal(crit)}
                                className="bg-slate-900 text-white text-[11px] font-semibold px-3 py-1.5 rounded-md hover:bg-indigo-600 shadow-sm transition"
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
            </div>
          )}

          {/* TAB 3: ADMIN/CONFIGURACIÓN */}
          {activeTab === 'admin' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs max-w-2xl">
              <h3 className="text-base font-bold text-slate-900 mb-1">Inyección de Componentes al SaaS</h3>
              <p className="text-xs text-slate-500 mb-6">Agregue dinámicamente nuevos requerimientos y módulos de control.</p>
              
              <form onSubmit={handleAddModulo} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Categoría del Framework</label>
                  <select 
                    value={newModCat} 
                    onChange={(e) => setNewModCat(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white font-medium"
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Siglas / Nombre del Componente</label>
                  <input 
                    type="text" 
                    value={newModNombre} 
                    onChange={(e) => setNewModNombre(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs uppercase" 
                    placeholder="Ej: DATA-PRIVACY" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Descripción de la Práctica Esperada</label>
                  <textarea 
                    value={newModCriterio} 
                    onChange={(e) => setNewModCriterio(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs h-24" 
                    placeholder="Escriba el criterio de auditoría..." 
                    required 
                  />
                </div>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow transition">
                  Guardar Requerimiento
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* MODAL INDUSTRIAL DE CAPTURA SCAMPI */}
      {isModalOpen && activeCriterio && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full flex flex-col max-h-[85vh] border border-slate-200">
            
            <div className="bg-slate-900 text-white p-4 rounded-t-xl flex justify-between items-center">
              <div>
                <span className="text-[10px] bg-indigo-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Captura de Evidencias</span>
                <h4 className="font-bold text-sm mt-1">Módulo: {activeCriterio.modulos?.nombre}</h4>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white font-bold text-lg">&times;</button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                <span className="font-bold text-slate-700">Unidad Operativa (OU) bajo revisión:</span>
                <select 
                  value={modalOu} 
                  onChange={(e) => setModalOu(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1 bg-white font-bold text-slate-800"
                >
                  <option value="Matriz_Norte">OU 1: Norte (Matriz)</option>
                  <option value="Sucursal_Sur">OU 2: Sur (Sucursal)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-600 uppercase text-[10px]">📁 Evidencias Directas (Artefactos, Documentación)</label>
                  <textarea value={evDirecta} onChange={(e) => setEvDirecta(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 h-20 bg-white" placeholder="Rutas de sharepoint, minutas, manuales..." />
                </div>
                <div className="space-y-1">
                  <label className="block font-bold text-slate-600 uppercase text-[10px]">💻 Evidencias Indirectas (Capturas, Logs del Sistema)</label>
                  <textarea value={evIndirecta} onChange={(e) => setEvIndirecta(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 h-20 bg-white" placeholder="Registros de auditoría del ERP, capturas de pantalla..." />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-600 uppercase text-[10px]">🗣️ Afirmaciones Obtenidas (Entrevistas de Validación)</label>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {afirmaciones.map((text, i) => (
                    <div key={i} className="bg-white p-2 rounded border border-slate-200 flex justify-between items-center font-medium shadow-2xs">
                      <span>💬 "{text}"</span>
                      <button onClick={() => removeAfirmacion(i)} className="text-rose-500 font-bold hover:text-rose-700">&times;</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newAfirmacion} onChange={(e) => setNewAfirmacion(e.target.value)} className="flex-1 border border-slate-200 rounded-md p-1.5 bg-white" placeholder="Ej: El líder afirma que se usa diariamente..." />
                  <button onClick={addAfirmacion} className="bg-slate-800 text-white px-3 rounded-md font-bold hover:bg-slate-700">Añadir</button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 uppercase text-[10px] mb-2">🚦 Caracterización del Nivel de Adopción (SCAMPI)</label>
                <div className="grid grid-cols-4 gap-2 text-center font-bold">
                  {['FI', 'LI', 'PI', 'NI'].map(status => (
                    <button 
                      key={status}
                      onClick={() => setStatusScampi(status)} 
                      className={`p-2.5 rounded-lg border transition-all ${statusScampi === status ? `border-2 border-slate-900 status-${status.toLowerCase()} scale-102 shadow-inner` : 'border-slate-200 bg-slate-50 text-slate-600'}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-b-xl border-t border-slate-200 flex justify-end space-x-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-200 bg-white rounded-lg text-xs font-semibold">Cancelar</button>
              <button onClick={saveEvaluation} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-700 transition">
                Sincronizar Datos Tenant
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
