'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AppraisalAssistantSaaS() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeMenu, setActiveMenu] = useState('matriz'); // 'matriz' o 'config'
  const [loading, setLoading] = useState(true);

  // Datos del Core
  const [categories, setCategories] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [criterios, setCriterios] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);

  // Formulario de Configuración (Altas)
  const [formCatId, setFormCatId] = useState('');
  const [formModNombre, setFormModNombre] = useState('');
  const [formCritDesc, setFormCritDesc] = useState('');

  // Modal de Evaluación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCriterio, setActiveCriterio] = useState(null);
  const [modalOu, setModalOu] = useState('Matriz_Norte');
  const [evDirecta, setEvDirecta] = useState('');
  const [evIndirecta, setEvIndirecta] = useState('');
  const [statusScampi, setStatusScampi] = useState('NONE');
  const [afirmaciones, setAfirmaciones] = useState([]);
  const [newAfirmacion, setNewAfirmacion] = useState('');

  // 1. CARGA DINÁMICA DE DATOS
  async function refreshData() {
    setLoading(true);
    const [resCats, resMods, resCrits, resEvals] = await Promise.all([
      supabase.from('categorias').select('*'),
      supabase.from('modulos').select('*'),
      supabase.from('criterios').select('*'),
      supabase.from('evaluaciones').select('*')
    ]);
    setCategories(resCats.data || []);
    setModulos(resMods.data || []);
    setCriterios(resCrits.data || []);
    setEvaluaciones(resEvals.data || []);
    if (resCats.data?.length > 0) setFormCatId(resCats.data[0].id);
    setLoading(false);
  }

  useEffect(() => { refreshData(); }, []);

  // 2. FUNCIÓN DE ALTA (Construcción del Módulo)
  const handleCreateModule = async (e) => {
    e.preventDefault();
    if (!formModNombre || !formCritDesc) return alert("Complete los campos");

    // Paso A: Insertar el Módulo
    const { data: newMod, error: errMod } = await supabase
      .from('modulos')
      .insert({ categoria_id: formCatId, nombre: formModNombre.toUpperCase() })
      .select().single();

    if (errMod) return alert("Error al crear módulo");

    // Paso B: Insertar el primer Criterio de ese módulo (La estructura de evaluación)
    const { error: errCrit } = await supabase
      .from('criterios')
      .insert({ modulo_id: newMod.id, descripcion: formCritDesc });

    if (errCrit) return alert("Error al crear estructura de evaluación");

    // Limpiar y Refrescar
    setFormModNombre('');
    setFormCritDesc('');
    await refreshData();
    setActiveMenu('matriz'); // Te lleva a ver tu nueva creación
  };

  // 3. GUARDADO DE EVALUACIÓN
  const handleSaveAppraisal = async () => {
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
      await refreshData();
      setIsModalOpen(false);
    }
  };

  // Sincronizar datos del modal
  useEffect(() => {
    if (activeCriterio) {
      const ev = evaluaciones.find(e => e.criterio_id === activeCriterio.id && e.organizational_unit === modalOu);
      setEvDirecta(ev ? ev.evidencia_directa : '');
      setEvIndirecta(ev ? ev.evidencia_indirecta : '');
      setStatusScampi(ev ? ev.status_scampi : 'NONE');
      setAfirmaciones(ev?.afirmaciones || []);
    }
  }, [modalOu, activeCriterio, evaluaciones]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm text-center border border-slate-200">
          <div className="bg-[#0f172a] text-white text-[10px] font-black px-4 py-2 rounded-xl inline-block mb-6 tracking-widest">ONE</div>
          <h2 className="text-xl font-bold text-slate-800">Appraisal Assistant</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">Inicie sesión para configurar o auditar</p>
          <button onClick={() => setIsAuthenticated(true)} className="w-full bg-[#f27405] text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition shadow-lg shadow-orange-500/30">Acceder al Sistema →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex antialiased">
      
      {/* SIDEBAR CORPORATIVA */}
      <aside className="w-64 bg-[#0f172a] text-slate-400 flex flex-col border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
          <div className="h-8 w-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-black text-xs">ONE</div>
          <p className="text-xs font-black text-white tracking-wider">ADVAN ONE</p>
        </div>

        <nav className="p-4 space-y-2 flex-1">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-2 mb-2">Operaciones</p>
          <button 
            onClick={() => setActiveMenu('matriz')}
            className={`w-full flex items-center space-x-3 p-3 rounded-xl text-xs font-bold transition ${activeMenu === 'matriz' ? 'bg-slate-800 text-white border-l-4 border-orange-500' : 'hover:bg-slate-900'}`}
          >
            <span>📊</span> <span>Matriz de Evaluación</span>
          </button>
          <button 
            onClick={() => setActiveMenu('config')}
            className={`w-full flex items-center space-x-3 p-3 rounded-xl text-xs font-bold transition ${activeMenu === 'config' ? 'bg-slate-800 text-white border-l-4 border-orange-500' : 'hover:bg-slate-900'}`}
          >
            <span>⚙️</span> <span>Configurar Módulos</span>
          </button>
        </nav>
      </aside>

      {/* ÁREA DE TRABAJO */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 shadow-sm">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
            {activeMenu === 'matriz' ? 'Ejecución de Auditoría' : 'Configuración de Estructura'}
          </h2>
          <div className="flex items-center space-x-2">
             <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
             <span className="text-[10px] font-bold text-slate-500 uppercase">Cloud Sync Active</span>
          </div>
        </header>

        <div className="p-8">
          
          {/* VISTA 1: CONFIGURACIÓN (EL "GENERADOR") */}
          {activeMenu === 'config' && (
            <div className="max-w-2xl bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Generador de Módulos de Evaluación</h3>
              <p className="text-xs text-slate-500 mb-6 font-medium">Al dar de alta un módulo, se creará automáticamente la fila correspondiente en la matriz de evaluación para todas las unidades operativas.</p>
              
              <form onSubmit={handleCreateModule} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Categoría del Modelo</label>
                    <select 
                      value={formCatId} onChange={(e) => setFormCatId(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nombre del Nuevo Módulo</label>
                    <input 
                      type="text" value={formModNombre} onChange={(e) => setFormModNombre(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-3 text-xs uppercase font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Ej: CONTROL-INVENTARIOS" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Práctica Inicial a Evaluar (Criterio Técnico)</label>
                  <textarea 
                    value={formCritDesc} onChange={(e) => setFormCritDesc(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs h-24 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Describa qué se debe validar en este módulo..."
                  />
                </div>
                <button type="submit" className="bg-slate-900 text-white font-bold text-xs px-6 py-3 rounded-xl hover:bg-orange-600 transition shadow-lg">
                  🚀 Construir Módulo de Evaluación
                </button>
              </form>
            </div>
          )}

          {/* VISTA 2: MATRIZ (EL "REFLEJO") */}
          {activeMenu === 'matriz' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-black uppercase tracking-tighter text-[9px]">
                  <tr>
                    <th className="p-4 w-1/4">Estructura / Módulo</th>
                    <th className="p-4 w-2/5">Criterio de Auditoría</th>
                    <th className="p-4 text-center">OU 1 (Norte)</th>
                    <th className="p-4 text-center">OU 2 (Sur)</th>
                    <th className="p-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="5" className="p-10 text-center font-bold text-slate-300">Actualizando estructura dinámica...</td></tr>
                  ) : criterios.length === 0 ? (
                    <tr><td colSpan="5" className="p-10 text-center font-bold text-slate-400 uppercase tracking-widest text-[10px]">No hay módulos configurados. Use el generador.</td></tr>
                  ) : (
                    criterios.map(crit => {
                      const mod = modulos.find(m => m.id === crit.modulo_id);
                      const cat = categories.find(c => c.id === mod?.categoria_id);
                      const ev1 = evaluaciones.find(e => e.criterio_id === crit.id && e.organizational_unit === 'Matriz_Norte');
                      const ev2 = evaluaciones.find(e => e.criterio_id === crit.id && e.organizational_unit === 'Sucursal_Sur');
                      
                      return (
                        <tr key={crit.id} className="hover:bg-slate-50 transition">
                          <td className="p-4 font-bold text-slate-900">
                            <span className="block text-[8px] text-orange-500 uppercase tracking-widest mb-1">{cat?.nombre}</span>
                            {mod?.nombre}
                          </td>
                          <td className="p-4 text-slate-500 font-medium leading-relaxed">{crit.descripcion}</td>
                          <td className="p-4 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-md font-black text-[9px] border status-${ev1?.status_scampi?.toLowerCase() || 'none'}`}>
                              {ev1?.status_scampi || 'NONE'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                             <span className={`inline-block px-2.5 py-1 rounded-md font-black text-[9px] border status-${ev2?.status_scampi?.toLowerCase() || 'none'}`}>
                              {ev2?.status_scampi || 'NONE'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button 
                              onClick={() => { setActiveCriterio(crit); setIsModalOpen(true); }}
                              className="bg-[#0f172a] text-white font-bold px-3 py-1.5 rounded-lg text-[10px] hover:bg-orange-500 transition"
                            >
                              AUDITAR
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

        </div>
      </main>

      {/* MODAL DE AUDITORÍA SCAMPI */}
      {isModalOpen && activeCriterio && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col border border-slate-200 overflow-hidden">
            <div className="bg-[#0f172a] text-white p-5 flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Panel de Evidencias</p>
                <h4 className="font-bold text-sm">Auditando: {modulos.find(m => m.id === activeCriterio.modulo_id)?.nombre}</h4>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-2xl">&times;</button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-500 uppercase">Unidad Operativa:</p>
                <select value={modalOu} onChange={(e) => setModalOu(e.target.value)} className="bg-white border text-[10px] font-bold rounded-lg px-2 py-1">
                  <option value="Matriz_Norte">OU 1: NORTE</option>
                  <option value="Sucursal_Sur">OU 2: SUR</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">📁 Evidencia Directa</label>
                  <textarea value={evDirecta} onChange={(e) => setEvDirecta(e.target.value)} className="w-full border rounded-xl p-3 text-xs h-20 bg-slate-50/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase">💻 Evidencia Indirecta</label>
                  <textarea value={evIndirecta} onChange={(e) => setEvIndirecta(e.target.value)} className="w-full border rounded-xl p-3 text-xs h-20 bg-slate-50/50" />
                </div>
              </div>

              <div>
                 <label className="text-[9px] font-black text-slate-400 uppercase block mb-2">🚦 Calificación SCAMPI</label>
                 <div className="grid grid-cols-4 gap-2">
                    {['FI', 'LI', 'PI', 'NI'].map(st => (
                      <button 
                        key={st} onClick={() => setStatusScampi(st)}
                        className={`py-2 rounded-xl font-black text-[10px] border transition-all ${statusScampi === st ? `status-${st.toLowerCase()} border-2 border-slate-900 scale-105 shadow-md` : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                      >
                        {st}
                      </button>
                    ))}
                 </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t flex justify-end space-x-3">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase">Cancelar</button>
              <button onClick={handleSaveAppraisal} className="bg-orange-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition">Sincronizar Cloud</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
