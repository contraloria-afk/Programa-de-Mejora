'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inicialización segura usando las variables de entorno de Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function SaasApp() {
  const [view, setView] = useState('matrix'); // 'matrix' o 'admin'
  const [categories, setCategories] = useState([]);
  const [criterios, setCriterios] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados del Modal de Evaluación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCriterio, setActiveCriterio] = useState(null);
  const [modalOu, setModalOu] = useState('Matriz_Norte');
  const [evDirecta, setEvDirecta] = useState('');
  const [evIndirecta, setEvIndirecta] = useState('');
  const [statusScampi, setStatusScampi] = useState('NONE');
  const [afirmaciones, setAfirmaciones] = useState([]);
  const [newAfirmacion, setNewAfirmacion] = useState('');

  // Estados para agregar nuevos componentes (Admin)
  const [newModCat, setNewModCat] = useState('');
  const [newModNombre, setNewModNombre] = useState('');
  const [newModCriterio, setNewModCriterio] = useState('');

  // Cargar datos de Supabase al iniciar
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
      console.error("Error sincronizando SaaS con Supabase:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Control del flujo del Modal por Unidad Operativa
  useEffect(() => {
    if (activeCriterio) {
      const ev = evaluaciones.find(e => e.criterio_id === activeCriterio.id && e.organizational_unit === modalOu);
      setEvDirecta(ev ? ev.evidencia_directa : '');
      setEvIndirecta(ev ? ev.evidencia_indirecta : '');
      setStatusScampi(ev ? ev.status_scampi : 'NONE');
      setAfirmaciones(ev && ev.afirmaciones ? ev.afirmaciones : []);
    }
  }, [modalOu, activeCriterio, evaluaciones]);

  const openModal = (crit) => {
    setActiveCriterio(crit);
    setModalOu('Matriz_Norte');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setActiveCriterio(null);
  };

  const addAfirmacion = () => {
    if (!newAfirmacion.trim()) return;
    setAfirmaciones([...afirmaciones, newAfirmacion.trim()]);
    setNewAfirmacion('');
  };

  const removeAfirmacion = (index) => {
    setAfirmaciones(afirmaciones.filter((_, i) => i !== index));
  };

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
    if (error) {
      alert("Error en el guardado Cloud del SaaS.");
    } else {
      await fetchInitialData();
      closeModal();
    }
  };

  const handleAddModulo = async (e) => {
    e.preventDefault();
    const { data: newMod, error: errMod } = await supabase
      .from('modulos')
      .insert({ categoria_id: newModCat, nombre: newModNombre.toUpperCase() })
      .select().single();

    if (errMod) { alert("Error al registrar módulo SaaS."); return; }

    const { error: errCrit } = await supabase
      .from('criterios')
      .insert({ modulo_id: newMod.id, descripcion: newModCriterio });

    if (errCrit) { alert("Error al registrar criterio SaaS."); return; }

    setNewModNombre('');
    setNewModCriterio('');
    await fetchInitialData();
    setView('matrix');
  };

  return (
    <div className="bg-gray-100 text-gray-800 font-sans min-h-screen flex flex-col">
      {/* Top Navbar */}
      <header className="bg-indigo-900 text-white px-6 py-4 flex justify-between items-center shadow-md">
        <div>
          <h1 className="text-xl font-bold tracking-wider uppercase">Advan-One SaaS Appraisal</h1>
          <p className="text-xs text-indigo-200 italic">Entorno Multitenant Cloud Pro</p>
        </div>
        <div className="text-sm bg-indigo-800 px-4 py-2 rounded border border-indigo-700 font-mono">
          Status: Supabase Next.js Activo
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar Component */}
        <aside className="w-64 bg-gray-900 text-gray-300 p-4 flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Vistas</p>
              <nav className="space-y-1">
                <button 
                  onClick={() => setView('matrix')} 
                  className={`w-full text-left px-3 py-2 rounded font-medium text-sm transition ${view === 'matrix' ? 'bg-indigo-700 text-white' : 'hover:bg-gray-800 text-gray-400'}`}
                >
                  📊 Matriz de Evaluación
                </button>
                <button 
                  onClick={() => setView('admin')} 
                  className={`w-full text-left px-3 py-2 rounded font-medium text-sm transition ${view === 'admin' ? 'bg-indigo-700 text-white' : 'hover:bg-gray-800 text-gray-400'}`}
                >
                  ⚙️ Configuración / Altas
                </button>
              </nav>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-2">Estructura del Modelo</p>
              <div className="space-y-1 text-xs font-mono">
                {categories.map(c => (
                  <div key={c.id} className="bg-gray-800 p-2 rounded text-gray-400 border border-gray-700 truncate">
                    📂 {c.nombre}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-800 text-center text-xs text-gray-500">
            SaaS Engine v2.0
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {view === 'matrix' && (
            <section className="space-y-6">
              <div className="bg-white p-4 rounded shadow border border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Caracterización de Prácticas de Adopción</h2>
                <p className="text-sm text-gray-600">Sincronización segura y aislamiento de datos por organización.</p>
              </div>

              <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-gray-800 text-white text-xs uppercase">
                    <tr>
                      <th className="p-3 w-1/4">Componente / Módulo</th>
                      <th className="p-3 w-2/5">Criterio Técnico (Práctica)</th>
                      <th className="p-3 text-center">OU 1: Norte</th>
                      <th className="p-3 text-center">OU 2: Sur</th>
                      <th className="p-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr><td colSpan="5" className="p-4 text-center text-gray-500">Cargando tenant desde la nube...</td></tr>
                    ) : criterios.length === 0 ? (
                      <tr><td colSpan="5" className="p-4 text-center text-gray-500">No hay criterios en la base de datos.</td></tr>
                    ) : (
                      criterios.map(crit => {
                        const ev1 = evaluaciones.find(e => e.criterio_id === crit.id && e.organizational_unit === 'Matriz_Norte');
                        const ev2 = evaluaciones.find(e => e.criterio_id === crit.id && e.organizational_unit === 'Sucursal_Sur');
                        const st1 = ev1 ? ev1.status_scampi : 'NONE';
                        const st2 = ev2 ? ev2.status_scampi : 'NONE';

                        return (
                          <tr key={crit.id} className="hover:bg-gray-50 transition">
                            <td className="p-3 font-semibold text-gray-900 bg-gray-50/50">
                              <span className="block text-[10px] uppercase text-indigo-600 tracking-wider">
                                {crit.modulos?.categorias?.nombre || 'Módulo'}
                              </span>
                              {crit.modulos?.nombre}
                            </td>
                            <td className="p-3 text-xs text-gray-600 leading-relaxed font-medium">{crit.descripcion}</td>
                            <td className="p-3 text-center">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold shadow-sm status-${st1.toLowerCase()}`}>{st1}</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold shadow-sm status-${st2.toLowerCase()}`}>{st2}</span>
                            </td>
                            <td className="p-3 text-center">
                              <button onClick={() => openModal(crit)} className="bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded hover:bg-indigo-700 transition font-medium shadow-sm">✏️ Evaluar</button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {view === 'admin' && (
            <section className="bg-white p-6 rounded shadow border border-gray-200 space-y-4">
              <h2 className="text-lg font-bold text-gray-900">Configuración Dinámica del SaaS</h2>
              <form onSubmit={handleAddModulo} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select value={newModCat} onChange={(e) => setNewModCat(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm bg-white">
                    {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Componente</label>
                  <input type="text" value={newModNombre} onChange={(e) => setNewModNombre(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm px-3 uppercase" placeholder="Ej: SECURITYLOG" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Criterio Técnico Inicial</label>
                  <textarea value={newModCriterio} onChange={(e) => setNewModCriterio(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm h-20 px-3" placeholder="Defina la práctica esperada..." required></textarea>
                </div>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded transition shadow">
                  💾 Inyectar Componente al SaaS
                </button>
              </form>
            </section>
          )}
        </main>
      </div>

      {/* Evaluation Modal */}
      {isModalOpen && activeCriterio && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full flex flex-col max-h-[90vh]">
            <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">Módulo: {activeCriterio.modulos?.nombre}</h3>
                <p className="text-xs text-gray-400">{activeCriterio.descripcion}</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-white font-bold text-xl">&times;</button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="bg-indigo-50 p-3 rounded border border-indigo-100 flex justify-between items-center">
                <span className="text-sm font-bold text-indigo-900">Unidad Operativa (OU):</span>
                <select value={modalOu} onChange={(e) => setModalOu(e.target.value)} className="border border-indigo-300 rounded p-1 text-xs bg-white text-indigo-900 font-bold">
                  <option value="Matriz_Norte">OU 1: Norte</option>
                  <option value="Sucursal_Sur">OU 2: Sur</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 p-3 rounded bg-gray-50">
                  <h4 className="font-bold text-xs uppercase text-gray-600 mb-1">📁 Evidencia Directa</h4>
                  <textarea value={evDirecta} onChange={(e) => setEvDirecta(e.target.value)} className="w-full text-xs border border-gray-300 rounded p-2 h-20 bg-white px-3"></textarea>
                </div>
                <div className="border border-gray-200 p-3 rounded bg-gray-50">
                  <h4 className="font-bold text-xs uppercase text-gray-600 mb-1">💻 Evidencia Indirecta</h4>
                  <textarea value={evIndirecta} onChange={(e) => setEvIndirecta(e.target.value)} className="w-full text-xs border border-gray-300 rounded p-2 h-20 bg-white px-3"></textarea>
                </div>
              </div>

              <div className="border border-gray-200 p-3 rounded bg-gray-50">
                <h4 className="font-bold text-xs uppercase text-gray-600 mb-2">🗣️ Afirmaciones (Entrevistas)</h4>
                <div className="space-y-1.5 mb-2 max-h-24 overflow-y-auto">
                  {afirmaciones.map((text, i) => (
                    <div key={i} className="text-xs bg-white border border-gray-200 p-2 rounded flex justify-between items-center font-medium shadow-sm">
                      <span>💬 "{text}"</span>
                      <button onClick={() => removeAfirmacion(i)} className="text-red-500 font-bold ml-2">&times;</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newAfirmacion} onChange={(e) => setNewAfirmacion(e.target.value)} className="flex-1 text-xs border border-gray-300 rounded p-2 bg-white px-3" placeholder="Agregar testimonio..." />
                  <button onClick={addAfirmacion} className="bg-gray-800 text-white text-xs px-3 py-1.5 rounded hover:bg-gray-700">Añadir</button>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase text-gray-600 mb-2">🚦 Caracterización SCAMPI</h4>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {['FI', 'LI', 'PI', 'NI'].map(status => (
                    <button 
                      key={status}
                      onClick={() => setStatusScampi(status)} 
                      className={`p-2 rounded font-bold text-xs border transition ${statusScampi === status ? `border-2 border-black status-${status.toLowerCase()} scale-105 shadow-inner` : 'border-gray-300 bg-gray-100 text-gray-700'}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end space-x-2">
              <button onClick={closeModal} className="px-4 py-2 text-xs border border-gray-300 bg-white rounded">Cancelar</button>
              <button onClick={saveEvaluation} className="px-4 py-2 text-xs bg-indigo-600 text-white rounded font-medium shadow hover:bg-indigo-700">💾 Sincronizar Nube SaaS</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
