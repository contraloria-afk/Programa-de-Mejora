'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdvanOneFinalSaaS() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeMenu, setActiveMenu] = useState('inicio'); // inicio, programas, config
  const [activeProgramForAudit, setActiveProgramForAudit] = useState(null); // Auditoría activa (Matriz SCAMPI)

  // CATÁLOGOS Y ESTADOS CORE
  const [categories, setCategories] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [criterios, setCriterios] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [loading, setLoading] = useState(true);

  // FORMULARIOS DE ALTAS (CONFIGURACIÓN DE CATÁLOGOS)
  const [formCatId, setFormCatId] = useState('');
  const [formModNombre, setFormModNombre] = useState('');
  const [formCritDesc, setFormCritDesc] = useState('');
  
  // Catálogo Clientes / Usuarios (Simulado/Base)
  const [newClienteNombre, setNewClienteNombre] = useState('');
  const [newUsuarioEmail, setNewUsuarioEmail] = useState('');
  const [newUsuarioRol, setNewUsuarioRol] = useState('Consultor');

  // MODAL DE EVALUACIÓN (CAMPOS EXACTOS DE TU TABLA EVALUACIONES)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCriterio, setActiveCriterio] = useState(null);
  const [modalOu, setModalOu] = useState('Matriz_Norte'); // organizational_unit
  const [evDirecta, setEvDirecta] = useState('');          // evidencia_directa
  const [evIndirecta, setEvIndirecta] = useState('');      // evidencia_indirecta
  const [statusScampi, setStatusScampi] = useState('NONE');  // status_scampi
  const [afirmaciones, setAfirmaciones] = useState([]);    // afirmaciones (jsonb/array)
  const [newAfirmacion, setNewAfirmacion] = useState('');

  async function refreshSaaSData() {
    setLoading(true);
    try {
      const [resCats, resMods, resCrits, resEvals, resProgs] = await Promise.all([
        supabase.from('categorias').select('*'),
        supabase.from('modulos').select('*'),
        supabase.from('criterios').select('*'),
        supabase.from('evaluaciones').select('*'),
        supabase.from('programas_mejora').select('*').order('created_at', { ascending: false })
      ]);

      setCategories(resCats.data || []);
      setModulos(resMods.data || []);
      setCriterios(resCrits.data || []);
      setEvaluaciones(resEvals.data || []);
      setProgramas(resProgs.data || []);
      
      if (resCats.data?.length > 0) setFormCatId(resCats.data[0].id);
    } catch (e) {
      console.error("Error de sincronización con Supabase:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refreshSaaSData(); }, []);

  // ALTAS DE CATÁLOGOS: MÓDULOS
  const handleConfigModule = async (e) => {
    e.preventDefault();
    if (!formModNombre || !formCritDesc) return;
    const { data: newMod, error: errMod } = await supabase.from('modulos').insert({ categoria_id: formCatId, nombre: formModNombre.toUpperCase() }).select().single();
    if (errMod) return alert("Error al registrar módulo");
    await supabase.from('criterios').insert({ modulo_id: newMod.id, descripcion: formCritDesc });
    setFormModNombre(''); setFormCritDesc('');
    await refreshSaaSData();
    alert("Módulo e Indicador inyectados al catálogo.");
  };

  // PERSISTENCIA EN LA TABLA DE EVALUACIONES (ESTRUCTURA SOLICITADA)
  const handleSaveAppraisal = async () => {
    const payload = {
      criterio_id: activeCriterio.id,
      programa_id: activeProgramForAudit.id,
      organizational_unit: modalOu, // "Matriz_Norte" o "Sucursal_Sur"
      evidencia_directa: evDirecta,
      evidencia_indirecta: evIndirecta,
      status_scampi: statusScampi, // FI, LI, PI, NI
      afirmaciones: afirmaciones,   // Arreglo guardado como jsonb
      updated_at: new Date()
    };

    const { error } = await supabase.from('evaluaciones').upsert(payload, { onConflict: 'criterio_id, organizational_unit, programa_id' });
    if (!error) {
      await refreshSaaSData();
      setIsModalOpen(false);
    } else {
      alert("Error en la sincronización de la matriz.");
    }
  };

  // MANEJO DE AFIRMACIONES (ENTREVISTAS) DENTRO DEL MODAL
  const addAfirmacion = () => {
    if (newAfirmacion.trim() !== '') {
      setAfirmaciones([...afirmaciones, newAfirmacion]);
      setNewAfirmacion('');
    }
  };

  // Sincronizar datos de la Fila SCAMPI al cambiar Unidad Operativa
  useEffect(() => {
    if (activeCriterio && activeProgramForAudit) {
      const ev = evaluaciones.find(e => e.criterio_id === activeCriterio.id && e.organizational_unit === modalOu && e.programa_id === activeProgramForAudit.id);
      setEvDirecta(ev ? ev.evidencia_directa : '');
      setEvIndirecta(ev ? ev.evidencia_indirecta : '');
      setStatusScampi(ev ? ev.status_scampi : 'NONE');
      setAfirmaciones(ev?.afirmaciones || []);
    }
  }, [modalOu, activeCriterio, evaluaciones, activeProgramForAudit]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm text-center border border-slate-200">
          <div className="bg-[#0f172a] text-white text-[10px] font-black px-4 py-2 rounded-xl inline-block mb-6 tracking-widest">ONE</div>
          <h2 className="text-xl font-bold text-slate-800">Appraisal Assistant</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">Plataforma SaaS de Auditoría CMMI</p>
          <button onClick={() => setIsAuthenticated(true)} className="w-full bg-[#f27405] text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition shadow-lg">Ingresar al Sistema →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex antialiased">
      
      {/* SIDEBAR CORPORATIVA */}
      <aside className="w-64 bg-[#0f172a] text-slate-400 flex flex-col border-r border-slate-800">
        <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
          <div className="h-8 w-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-black text-xs">ONE</div>
          <p className="text-xs font-black text-white tracking-wider">ADVAN ONE</p>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          <button onClick={() => { setActiveMenu('inicio'); setActiveProgramForAudit(null); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${activeMenu === 'inicio' ? 'bg-slate-800 text-white' : 'hover:bg-slate-900'}`}>
            <span>🏠</span> <span>Inicio</span>
          </button>
          <button onClick={() => setActiveMenu('programas')} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${activeMenu === 'programas' || activeProgramForAudit ? 'bg-slate-800 text-white' : 'hover:bg-slate-900'}`}>
            <span>📊</span> <span>Programas de Mejora</span>
          </button>
          <button onClick={() => { setActiveMenu('config'); setActiveProgramForAudit(null); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${activeMenu === 'config' ? 'bg-slate-800 text-white' : 'hover:bg-slate-900'}`}>
            <span>⚙️</span> <span>Configuración</span>
          </button>
        </nav>
      </aside>

      {/* CORE WORKSPACE */}
      <main className="flex-1 flex flex-col">
        <header className="h-14 bg-white border-b px-6 flex items-center justify-between shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {activeProgramForAudit ? `Ejecución: ${activeProgramForAudit.nombre}` : activeMenu}
          </span>
          <span className="text-[9px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-md font-bold uppercase">● SCAMPI ENGINE READY</span>
        </header>

        <div className="p-6 md:p-8 space-y-6">

          {/* MENÚ 1: INICIO */}
          {activeMenu === 'inicio' && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border text-center"><p className="text-[10px] text-slate-400 uppercase font-bold">Programas</p><p className="text-2xl font-black mt-1">{programas.length}</p></div>
              <div className="bg-white p-5 rounded-2xl border text-center"><p className="text-[10px] text-slate-400 uppercase font-bold">Módulos ERP</p><p className="text-2xl font-black mt-1 text-indigo-600">{modulos.length}</p></div>
              <div className="bg-white p-5 rounded-2xl border text-center"><p className="text-[10px] text-slate-400 uppercase font-bold">Evaluaciones Cloud</p><p className="text-2xl font-black mt-1 text-orange-500">{evaluaciones.length}</p></div>
            </div>
          )}

          {/* MENÚ 2: LISTADO DE PROGRAMAS */}
          {activeMenu === 'programas' && !activeProgramForAudit && (
            <div className="bg-white rounded-2xl border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold text-slate-400 text-[9px] uppercase tracking-wider border-b">
                  <tr><th className="p-4">Auditoría / Programa de Mejora</th><th className="p-4">Cliente</th><th className="p-4 text-center">Acción</th></tr>
                </thead>
                <tbody className="divide-y font-medium">
                  {programas.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-4 font-bold text-slate-900">{p.nombre}</td>
                      <td className="p-4 text-slate-500">{p.empresa}</td>
                      <td className="p-4 text-center"><button onClick={() => setActiveProgramForAudit(p)} className="bg-slate-900 text-white font-bold px-3 py-1.5 rounded-xl text-[10px] hover:bg-orange-500 transition">EJECUTAR</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* MATRIZ SCAMPI ACTIVA (AL EJECUTAR) */}
          {activeProgramForAudit && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl">
                <p className="text-xs font-bold">Matriz en Tiempo Real: <span className="text-orange-400">{activeProgramForAudit.nombre}</span></p>
                <button onClick={() => setActiveProgramForAudit(null)} className="text-xs bg-slate-800 px-3 py-1 rounded text-slate-400 hover:text-white">✕ Cerrar</button>
              </div>
              <div className="bg-white rounded-2xl border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 text-[9px] uppercase font-bold border-b">
                    <tr><th className="p-4">Módulo ERP</th><th className="p-4">Criterio CMMI</th><th className="p-4 text-center">OU: Norte</th><th className="p-4 text-center">OU: Sur</th><th className="p-4 text-center">Acción</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {criterios.map(crit => {
                      const mod = modulos.find(m => m.id === crit.modulo_id);
                      const ev1 = evaluaciones.find(e => e.criterio_id === crit.id && e.organizational_unit === 'Matriz_Norte' && e.programa_id === activeProgramForAudit.id);
                      const ev2 = evaluaciones.find(e => e.criterio_id === crit.id && e.organizational_unit === 'Sucursal_Sur' && e.programa_id === activeProgramForAudit.id);
                      return (
                        <tr key={crit.id} className="hover:bg-slate-50 text-slate-600 font-medium">
                          <td className="p-4 font-bold text-slate-900">{mod?.nombre}</td>
                          <td className="p-4">{crit.descripcion}</td>
                          <td className="p-4 text-center"><span className="px-2 py-0.5 border font-bold text-[10px] rounded">{ev1?.status_scampi || 'NONE'}</span></td>
                          <td className="p-4 text-center"><span className="px-2 py-0.5 border font-bold text-[10px] rounded">{ev2?.status_scampi || 'NONE'}</span></td>
                          <td className="p-4 text-center"><button onClick={() => { setActiveCriterio(crit); setIsModalOpen(true); }} className="bg-slate-100 hover:bg-orange-500 hover:text-white px-2.5 py-1 rounded-lg font-bold text-[10px]">AUDITAR</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MENÚ 3: CONFIGURACIÓN COMPLETA (LOS 3 CATÁLOGOS SOLICITADOS) */}
          {activeMenu === 'config' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              
              {/* Catálogo A: Módulos */}
              <div className="bg-white p-5 rounded-2xl border space-y-4">
                <h3 className="font-bold text-slate-900 uppercase text-[10px] border-b pb-2">📦 Catálogo de Módulos</h3>
                <form onSubmit={handleConfigModule} className="space-y-3">
                  <select value={formCatId} onChange={(e) => setFormCatId(e.target.value)} className="w-full border rounded-xl p-2 bg-slate-50 font-bold">
                    {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                  <input type="text" value={formModNombre} onChange={(e) => setFormModNombre(e.target.value)} placeholder="Nombre Módulo (Nómina, Inventarios)" className="w-full border rounded-xl p-2 bg-slate-50 uppercase font-bold" required />
                  <textarea value={formCritDesc} onChange={(e) => setFormCritDesc(e.target.value)} placeholder="Descripción de la Práctica CMMI..." className="w-full border rounded-xl p-2 bg-slate-50 h-16" required />
                  <button type="submit" className="w-full bg-slate-900 text-white font-bold py-2 rounded-xl hover:bg-orange-500 transition">Agregar Módulo</button>
                </form>
              </div>

              {/* Catálogo B: Clientes */}
              <div className="bg-white p-5 rounded-2xl border space-y-4">
                <h3 className="font-bold text-slate-900 uppercase text-[10px] border-b pb-2">🏢 Catálogo de Clientes</h3>
                <div className="space-y-2">
                  <input type="text" value={newClienteNombre} onChange={(e) => setNewClienteNombre(e.target.value)} placeholder="Nombre de la Empresa Cliente" className="w-full border rounded-xl p-2 bg-slate-50 font-bold" />
                  <button onClick={() => { alert("Cliente registrado en Catálogo"); setNewClienteNombre(''); }} className="w-full bg-slate-900 text-white font-bold py-2 rounded-xl hover:bg-orange-500 transition">Agregar Cliente</button>
                </div>
              </div>

              {/* Catálogo C: Usuarios */}
              <div className="bg-white p-5 rounded-2xl border space-y-4">
                <h3 className="font-bold text-slate-900 uppercase text-[10px] border-b pb-2">👥 Catálogo de Usuarios</h3>
                <div className="space-y-2">
                  <input type="email" value={newUsuarioEmail} onChange={(e) => setNewUsuarioEmail(e.target.value)} placeholder="correo@advanone.com" className="w-full border rounded-xl p-2 bg-slate-50 font-bold" />
                  <select value={newUsuarioRol} onChange={(e) => setNewUsuarioRol(e.target.value)} className="w-full border rounded-xl p-2 bg-slate-50 font-bold">
                    <option value="Auditor_Lider">Auditor Líder</option>
                    <option value="Consultor">Consultor Capturista</option>
                  </select>
                  <button onClick={() => { alert("Usuario dado de alta"); setNewUsuarioEmail(''); }} className="w-full bg-slate-900 text-white font-bold py-2 rounded-xl hover:bg-orange-500 transition">Dar de Alta Usuario</button>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* MODAL CON CAMPOS RIGUROSOS REQUERIDOS (TABLA EVALUACIONES) */}
      {isModalOpen && activeCriterio && activeProgramForAudit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-xs">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden border">
            <div className="bg-[#0f172a] text-white p-4 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Matriz SCAMPI en Tiempo Real</span>
                <h4 className="font-bold text-sm">Evaluación de Campo</h4>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-xl">&times;</button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {/* CAMPO: organizational_unit */}
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border">
                <span className="font-bold text-slate-500 text-[9px] uppercase">Unidad Organizacional (OU):</span>
                <select value={modalOu} onChange={(e) => setModalOu(e.target.value)} className="bg-white border rounded font-bold px-2 py-1">
                  <option value="Matriz_Norte">Matriz_Norte</option>
                  <option value="Sucursal_Sur">Sucursal_Sur</option>
                </select>
              </div>

              {/* CAMPOS: evidencia_directa / evidencia_indirecta */}
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-400 uppercase text-[9px] mb-1">📁 Evidencia Directa (Rutas, Políticas, Manuales)</label>
                  <textarea value={evDirecta} onChange={(e) => setEvDirecta(e.target.value)} className="w-full border rounded-xl p-2.5 bg-slate-50/50 h-14" />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 uppercase text-[9px] mb-1">💻 Evidencia Indirecta (Capturas, Logs, Queries)</label>
                  <textarea value={evIndirecta} onChange={(e) => setEvIndirecta(e.target.value)} className="w-full border rounded-xl p-2.5 bg-slate-50/50 h-14" />
                </div>
              </div>

              {/* CAMPO: afirmaciones (JSONB / ARRAY) */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-400 uppercase text-[9px]">💬 Afirmaciones (Notas de Entrevistas)</label>
                <div className="flex gap-2">
                  <input type="text" value={newAfirmacion} onChange={(e) => setNewAfirmacion(e.target.value)} placeholder="Añadir comentario de entrevista..." className="flex-1 border rounded-xl p-2 bg-slate-50" />
                  <button onClick={addAfirmacion} className="bg-slate-900 text-white px-3 rounded-xl font-bold">➕</button>
                </div>
                <ul className="bg-slate-50 p-2 rounded-xl border divide-y max-h-20 overflow-y-auto font-medium text-slate-600">
                  {afirmaciones.map((af, i) => <li key={i} className="py-1 px-1">🗣️ {af}</li>)}
                </ul>
              </div>

              {/* CAMPO: status_scampi */}
              <div>
                <label className="block font-bold text-slate-400 uppercase text-[9px] mb-1">🚦 Dictamen Oficial (status_scampi)</label>
                <div className="grid grid-cols-4 gap-2 text-center font-black">
                  {['FI', 'LI', 'PI', 'NI'].map(st => (
                    <button key={st} onClick={() => setStatusScampi(st)} className={`py-2 rounded-xl border text-[11px] transition ${statusScampi === st ? `status-${st.toLowerCase()} border-2 border-slate-900 scale-102` : 'bg-slate-50 text-slate-400'}`}>{st}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end space-x-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-bold text-slate-400 uppercase">Cancelar</button>
              <button onClick={handleSaveAppraisal} className="bg-orange-500 text-white px-5 py-2 rounded-xl font-black uppercase shadow-md hover:bg-orange-600 transition">Sincronizar Cloud</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
