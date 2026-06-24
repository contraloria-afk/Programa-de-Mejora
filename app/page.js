'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdvanOneSaaS() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Control de Navegación del SaaS
  const [activeMenu, setActiveMenu] = useState('inicio'); // 'inicio', 'programas', 'config'
  const [activeProgramForAudit, setActiveProgramForAudit] = useState(null); // Almacena el programa en ejecución (Matriz)

  // Estados de Datos Reales (Supabase)
  const [categories, setCategories] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [criterios, setCriterios] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [programas, setProgramas] = useState([]); // Tabla de Programas de Mejora (Auditorías)
  const [loading, setLoading] = useState(true);

  // Formularios de Altas (Configuración y Programas)
  const [newProgNombre, setNewProgNombre] = useState('');
  const [newProgEmpresa, setNewProgEmpresa] = useState('');
  const [formCatId, setFormCatId] = useState('');
  const [formModNombre, setFormModNombre] = useState('');
  const [formCritDesc, setFormCritDesc] = useState('');

  // Modal de Evaluación SCAMPI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCriterio, setActiveCriterio] = useState(null);
  const [modalOu, setModalOu] = useState('Matriz_Norte');
  const [evDirecta, setEvDirecta] = useState('');
  const [evIndirecta, setEvIndirecta] = useState('');
  const [statusScampi, setStatusScampi] = useState('NONE');

  // Carga e Inyección Dinámica desde Cloud
  async function refreshAllData() {
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
      console.error("Error sincronizando esquemas:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refreshAllData(); }, []);

  // Crear una nueva Auditoría (Programa de Mejora)
  const handleCreateProgram = async (e) => {
    e.preventDefault();
    if (!newProgNombre || !newProgEmpresa) return;

    const { error } = await supabase.from('programas_mejora').insert({
      nombre: newProgNombre,
      empresa: newProgEmpresa,
      estatus: 'Planificado'
    });

    if (!error) {
      setNewProgNombre('');
      setNewProgEmpresa('');
      await refreshAllData();
    }
  };

  // Configurar e inyectar un nuevo Módulo/Criterio al catálogo ERP
  const handleConfigModule = async (e) => {
    e.preventDefault();
    if (!formModNombre || !formCritDesc) return;

    const { data: newMod, error: errMod } = await supabase
      .from('modulos')
      .insert({ categoria_id: formCatId, nombre: formModNombre.toUpperCase() })
      .select().single();

    if (errMod) return alert("Error al registrar módulo en catálogo");

    const { error: errCrit } = await supabase
      .from('criterios')
      .insert({ modulo_id: newMod.id, descripcion: formCritDesc });

    if (!errCrit) {
      setFormModNombre('');
      setFormCritDesc('');
      await refreshAllData();
      alert("Componente ERP añadido exitosamente al catálogo maestro.");
    }
  };

  // Guardar evaluación SCAMPI vinculada
  const handleSaveAppraisal = async () => {
    const payload = {
      criterio_id: activeCriterio.id,
      programa_id: activeProgramForAudit.id, // Vinculación real a la auditoría actual
      organizational_unit: modalOu,
      evidencia_directa: evDirecta,
      evidencia_indirecta: evIndirecta,
      status_scampi: statusScampi,
      updated_at: new Date()
    };

    const { error } = await supabase.from('evaluaciones').upsert(payload, { onConflict: 'criterio_id, organizational_unit, programa_id' });
    if (!error) {
      await refreshAllData();
      setIsModalOpen(false);
    }
  };

  // Sincronizar inputs del modal al cambiar de Unidad Operativa (OU)
  useEffect(() => {
    if (activeCriterio && activeProgramForAudit) {
      const ev = evaluaciones.find(e => e.criterio_id === activeCriterio.id && e.organizational_unit === modalOu && e.programa_id === activeProgramForAudit.id);
      setEvDirecta(ev ? ev.evidencia_directa : '');
      setEvIndirecta(ev ? ev.evidencia_indirecta : '');
      setStatusScampi(ev ? ev.status_scampi : 'NONE');
    }
  }, [modalOu, activeCriterio, evaluaciones, activeProgramForAudit]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 border border-slate-100 flex flex-col items-center">
          <div className="bg-[#0f172a] text-white font-black text-xs px-4 py-2 rounded-xl tracking-widest mb-6">ONE</div>
          <h2 className="text-2xl font-bold text-[#0f172a] text-center">Appraisal Assistant</h2>
          <p className="text-xs text-slate-400 mt-1 text-center mb-8">Gestión de Programas de Mejora & Auditorías ERP</p>
          <form onSubmit={(e) => { e.preventDefault(); setIsAuthenticated(true); }} className="w-full space-y-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo Electrónico" className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-slate-50" required />
            <button type="submit" className="w-full bg-[#f27405] text-white font-bold text-xs p-3.5 rounded-xl transition shadow-md shadow-orange-500/20">Iniciar sesión →</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex antialiased">
      
      {/* SIDEBAR ADVAN ONE */}
      <aside className="w-64 bg-[#0f172a] text-slate-400 flex flex-col border-r border-slate-800">
        <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
          <div className="h-8 w-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-black text-xs">ONE</div>
          <div>
            <h1 className="text-xs font-black text-white tracking-wider">ADVAN ONE</h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">CON-e SaaS</p>
          </div>
        </div>

        <nav className="p-3 space-y-1 flex-1">
          <p className="text-[9px] uppercase tracking-wider font-bold text-slate-600 px-3 pt-2 pb-1">Módulos</p>
          <button onClick={() => { setActiveMenu('inicio'); setActiveProgramForAudit(null); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${activeMenu === 'inicio' ? 'bg-slate-800 text-white border-l-4 border-orange-500' : 'hover:bg-slate-900'}`}>
            <span>🏠</span> <span>Inicio</span>
          </button>
          <button onClick={() => { setActiveMenu('programas'); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${activeMenu === 'programas' || activeProgramForAudit ? 'bg-slate-800 text-white border-l-4 border-orange-500' : 'hover:bg-slate-900'}`}>
            <span>📊</span> <span>Programas de Mejora</span>
          </button>
          <button onClick={() => { setActiveMenu('config'); setActiveProgramForAudit(null); }} className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${activeMenu === 'config' ? 'bg-slate-800 text-white border-l-4 border-orange-500' : 'hover:bg-slate-900'}`}>
            <span>⚙️</span> <span>Configuración</span>
          </button>
        </nav>
      </aside>

      {/* WORKSPACE */}
      <main className="flex-1 flex flex-col">
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {activeProgramForAudit ? `Ejecutando: ${activeProgramForAudit.nombre}` : activeMenu}
          </span>
          <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-1 rounded-md font-bold uppercase">● Sincronizado a Supabase</span>
        </header>

        <div className="p-6 md:p-8 space-y-6">

          {/* MÓDULO 1: INICIO (DASHBOARD) */}
          {activeMenu === 'inicio' && !activeProgramForAudit && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-[11px] font-bold text-slate-400 tracking-wide uppercase">Auditorías Totales</p>
                  <p className="text-3xl font-black text-slate-900 mt-2">{programas.length}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-[11px] font-bold text-slate-400 tracking-wide uppercase">Módulos en Catálogo</p>
                  <p className="text-3xl font-black text-indigo-600 mt-2">{modulos.length}</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-[11px] font-bold text-slate-400 tracking-wide uppercase">Prácticas Totales CMMI</p>
                  <p className="text-3xl font-black text-emerald-600 mt-2">{criterios.length}</p>
                </div>
              </div>
              <div className="bg-white border p-6 rounded-2xl">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Resumen Ejecutivo</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">Seleccione el módulo de <b>Programas de Mejora</b> para visualizar las auditorías en curso o ejecutar la matriz de caracterización SCAMPI correspondiente.</p>
              </div>
            </div>
          )}

          {/* MÓDULO 2: PROGRAMAS DE MEJORA (LISTADO / REGISTRO) */}
          {activeMenu === 'programas' && !activeProgramForAudit && (
            <div className="space-y-6">
              {/* Formulario para Agregar Nueva Auditoría */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs max-w-xl">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Aperturar Programa de Mejora (Auditoría)</h3>
                <form onSubmit={handleCreateProgram} className="flex gap-3 text-xs">
                  <input type="text" value={newProgNombre} onChange={(e) => setNewProgNombre(e.target.value)} placeholder="Nombre del Programa (Ej: Auditoría Anual ERP 2026)" className="flex-1 border rounded-xl p-2.5 bg-slate-50" required />
                  <input type="text" value={newProgEmpresa} onChange={(e) => setNewProgEmpresa(e.target.value)} placeholder="Cliente / Empresa" className="w-1/3 border rounded-xl p-2.5 bg-slate-50" required />
                  <button type="submit" className="bg-orange-500 text-white font-bold px-4 rounded-xl hover:bg-orange-600 transition">Crear</button>
                </form>
              </div>

              {/* Tabla del Historial de Programas */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="p-4">ID / Fecha</th>
                      <th className="p-4">Programa de Mejora</th>
                      <th className="p-4">Cliente / Empresa</th>
                      <th className="p-4">Estatus</th>
                      <th className="p-4 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {programas.map(prog => (
                      <tr key={prog.id} className="hover:bg-slate-50/50">
                        <td className="p-4 text-slate-400 font-mono text-[10px]">{prog.id.substring(0,8)}</td>
                        <td className="p-4 font-bold text-slate-900">{prog.nombre}</td>
                        <td className="p-4 text-slate-600">{prog.empresa}</td>
                        <td className="p-4"><span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">{prog.estatus}</span></td>
                        <td className="p-4 text-center">
                          <button onClick={() => { setActiveProgramForAudit(prog); }} className="bg-[#0f172a] text-white text-[10px] font-black px-4 py-2 rounded-xl hover:bg-orange-500 transition">
                            EJECUTAR AUDITORÍA
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MATRIZ DINÁMICA SCAMPI (DESPLEGADA AL DAR CLIC EN "EJECUTAR") */}
          {activeProgramForAudit && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-2xl">
                <div className="text-xs">
                  <p className="text-orange-500 font-bold uppercase text-[9px]">Matriz Activa de Caracterización</p>
                  <h3 className="font-bold text-sm">{activeProgramForAudit.nombre} ({activeProgramForAudit.empresa})</h3>
                </div>
                <button onClick={() => setActiveProgramForAudit(null)} className="bg-slate-800 text-slate-300 font-bold text-xs px-3 py-1.5 rounded-lg hover:text-white">✕ Cerrar Ejecución</button>
              </div>

              <div className="bg-white rounded-2xl border overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b font-bold text-slate-400 text-[9px] uppercase tracking-wider">
                    <tr>
                      <th className="p-4 w-1/4">Estructura / Módulo</th>
                      <th className="p-4 w-2/5">Criterio Técnico (CMMI)</th>
                      <th className="p-4 text-center">OU 1 (Norte)</th>
                      <th className="p-4 text-center">OU 2 (Sur)</th>
                      <th className="p-4 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {criterios.map(crit => {
                      const mod = modulos.find(m => m.id === crit.modulo_id);
                      const cat = categories.find(c => c.id === mod?.categoria_id);
                      
                      // Filtrado triple: criterio, unidad operativa y ID de la auditoría específica
                      const ev1 = evaluaciones.find(e => e.criterio_id === crit.id && e.organizational_unit === 'Matriz_Norte' && e.programa_id === activeProgramForAudit.id);
                      const ev2 = evaluaciones.find(e => e.criterio_id === crit.id && e.organizational_unit === 'Sucursal_Sur' && e.programa_id === activeProgramForAudit.id);

                      return (
                        <tr key={crit.id} className="hover:bg-slate-50/50">
                          <td className="p-4 font-bold text-slate-900">
                            <span className="block text-[8px] text-orange-500 uppercase tracking-widest mb-1">{cat?.nombre}</span>
                            {mod?.nombre}
                          </td>
                          <td className="p-4 text-slate-500 font-medium leading-relaxed">{crit.descripcion}</td>
                          <td className="p-4 text-center"><span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black border status-${ev1?.status_scampi?.toLowerCase() || 'none'}`}>{ev1?.status_scampi || 'NONE'}</span></td>
                          <td className="p-4 text-center"><span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black border status-${ev2?.status_scampi?.toLowerCase() || 'none'}`}>{ev2?.status_scampi || 'NONE'}</span></td>
                          <td className="p-4 text-center">
                            <button onClick={() => { setActiveCriterio(crit); setIsModalOpen(true); }} className="bg-slate-100 hover:bg-orange-500 hover:text-white text-slate-700 font-bold px-3 py-1.5 rounded-lg text-[10px] transition">EVALUAR</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MÓDULO 3: CONFIGURACIÓN (CATÁLOGOS, USUARIOS, PERMISOS) */}
          {activeMenu === 'config' && !activeProgramForAudit && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sección de Catálogos Maestros (Inyección ERP) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Catálogo Maestro de Módulos ERP</h3>
                <p className="text-xs text-slate-400 mb-4 font-medium">Al agregar componentes aquí, se construirán de forma automatizada las estructuras dentro de futuras auditorías.</p>
                <form onSubmit={handleConfigModule} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Categoría CMMI</label>
                    <select value={formCatId} onChange={(e) => setFormCatId(e.target.value)} className="w-full border rounded-xl p-2.5 bg-slate-50 font-bold">
                      {categories.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Siglas / Nombre del Módulo ERP</label>
                    <input type="text" value={formModNombre} onChange={(e) => setFormModNombre(e.target.value)} placeholder="Ej: GL-FINANCE" className="w-full border rounded-xl p-2.5 bg-slate-50 uppercase font-bold" required />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Criterio Técnico Esperado</label>
                    <textarea value={formCritDesc} onChange={(e) => setFormCritDesc(e.target.value)} placeholder="Escriba la directiva o requerimiento de adopción a auditar..." className="w-full border rounded-xl p-2.5 bg-slate-50 h-20" required />
                  </div>
                  <button type="submit" className="bg-slate-900 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-orange-500 transition">Inyectar a Catálogo</button>
                </form>
              </div>

              {/* Sección de Usuarios y Roles Simulado */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">Control de Accesos & Permisos (SoD)</h3>
                  <p className="text-xs text-slate-400 font-medium">Usuarios autorizados en el Tenant corporativo.</p>
                </div>
                <div className="divide-y border rounded-xl bg-slate-50/50 overflow-hidden">
                  <div className="p-3 flex justify-between items-center font-medium">
                    <div><p className="text-slate-900 font-bold">Auditor Líder</p><p className="text-[10px] text-slate-400">{email}</p></div>
                    <span className="bg-orange-50 text-orange-700 border border-orange-200 text-[9px] font-black px-2 py-0.5 rounded uppercase">Administrador</span>
                  </div>
                  <div className="p-3 flex justify-between items-center font-medium">
                    <div><p className="text-slate-900 font-bold">Consultor Soporte</p><p className="text-[10px] text-slate-400">consultor@advanone.com</p></div>
                    <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-black px-2 py-0.5 rounded uppercase">Capturista</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* MODAL PANEL DE EVALUACIÓN SCAMPI */}
      {isModalOpen && activeCriterio && activeProgramForAudit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full flex flex-col border border-slate-200 overflow-hidden text-xs">
            <div className="bg-[#0f172a] text-white p-4 flex justify-between items-center">
              <div>
                <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Evidencias Cloud</p>
                <h4 className="font-bold text-sm">Módulo: {modulos.find(m => m.id === activeCriterio.modulo_id)?.nombre}</h4>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-xl">&times;</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border">
                <span className="font-bold text-slate-500 uppercase text-[9px]">Unidad Operativa (OU):</span>
                <select value={modalOu} onChange={(e) => setModalOu(e.target.value)} className="bg-white border rounded px-2 py-1 font-bold">
                  <option value="Matriz_Norte">OU 1: NORTE</option>
                  <option value="Sucursal_Sur">OU 2: SUR</option>
                </select>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-400 uppercase text-[9px] mb-1">📁 Evidencias Directas</label>
                  <textarea value={evDirecta} onChange={(e) => setEvDirecta(e.target.value)} className="w-full border rounded-xl p-2.5 bg-slate-50/50 h-16" placeholder="Documentos, políticas, configuraciones..." />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 uppercase text-[9px] mb-1">💻 Evidencias Indirectas</label>
                  <textarea value={evIndirecta} onChange={(e) => setEvIndirecta(e.target.value)} className="w-full border rounded-xl p-2.5 bg-slate-50/50 h-16" placeholder="Capturas de pantalla, logs, queries..." />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-400 uppercase text-[9px] mb-2">🚦 Calificación SCAMPI</label>
                <div className="grid grid-cols-4 gap-2 text-center font-black">
                  {['FI', 'LI', 'PI', 'NI'].map(st => (
                    <button key={st} onClick={() => setStatusScampi(st)} className={`py-2 rounded-xl border transition ${statusScampi === st ? `status-${st.toLowerCase()} border-2 border-slate-900 scale-102` : 'bg-slate-50 text-slate-400'}`}>{st}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end space-x-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-bold text-slate-400 uppercase tracking-wider">Cancelar</button>
              <button onClick={handleSaveAppraisal} className="bg-orange-500 text-white px-5 py-2 rounded-xl font-black uppercase tracking-wider shadow-md hover:bg-orange-600 transition">Sincronizar Cloud</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
