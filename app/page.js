"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

/* ──────────────────────────────────────────────────────────────────────────
   1. CONEXIÓN SUPABASE
   ────────────────────────────────────────────────────────────────────────── */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SCAMPI_LEVELS = [
  { code: "FI", label: "Plenamente Implementado", color: "bg-emerald-500", ring: "ring-emerald-400" },
  { code: "LI", label: "Largamente Implementado", color: "bg-amber-500", ring: "ring-amber-400" },
  { code: "PI", label: "Parcialmente Implementado", color: "bg-orange-500", ring: "ring-orange-400" },
  { code: "NI", label: "No Implementado", color: "bg-rose-500", ring: "ring-rose-400" },
];

const DEFAULT_OUS = ["Matriz_Norte", "Sucursal_Sur"];

function scampiMeta(code) {
  return SCAMPI_LEVELS.find((l) => l.code === code);
}

/* ──────────────────────────────────────────────────────────────────────────
   COMPONENTE RAÍZ
   ────────────────────────────────────────────────────────────────────────── */

export default function Page() {
  const [activeView, setActiveView] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const [categorias, setCategorias] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [criterios, setCriterios] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [evidencias, setEvidencias] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [unidadesOrganizacionales, setUnidadesOrganizacionales] = useState([]);

  const [activePrograma, setActivePrograma] = useState(null);
  const [modalCriterio, setModalCriterio] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [
        { data: catData, error: catErr },
        { data: modData, error: modErr },
        { data: critData, error: critErr },
        { data: progData, error: progErr },
        { data: evalData, error: evalErr },
        { data: cliData, error: cliErr },
        { data: userData, error: userErr },
        { data: ouData, error: ouErr },
        { data: eviData, error: eviErr },
      ] = await Promise.all([
        supabase.from("categorias").select("*").order("nombre"),
        supabase.from("modulos").select("*").order("nombre"),
        supabase.from("criterios").select("*").order("codigo"),
        supabase.from("programas_mejora").select("*").order("created_at", { ascending: false }),
        supabase.from("evaluaciones").select("*"),
        supabase.from("clientes").select("*").order("nombre"),
        supabase.from("usuarios").select("*").order("nombre"),
        supabase.from("unidades_organizacionales").select("*").order("nombre"),
        supabase.from("evidencias").select("*"),
      ]);

      const firstError = catErr || modErr || critErr || progErr || evalErr || cliErr || userErr || ouErr || eviErr;
      if (firstError) throw firstError;

      setCategorias(catData || []);
      setModulos(modData || []);
      setCriterios(critData || []);
      setProgramas(progData || []);
      setEvaluaciones(evalData || []);
      setEvidencias(eviData || []);
      setClientes(cliData || []);
      setUsuarios(userData || []);
      setUnidadesOrganizacionales(ouData || []);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Error al cargar datos de Supabase.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const ousForActivePrograma = useMemo(() => {
    if (!activePrograma) return DEFAULT_OUS;
    const filtered = unidadesOrganizacionales
      .filter((ou) => ou.cliente_id === activePrograma.cliente_id)
      .map((ou) => ou.nombre);
    return filtered.length ? filtered : DEFAULT_OUS;
  }, [activePrograma, unidadesOrganizacionales]);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />

      <main className="flex-1 overflow-y-auto">
        <TopBar loading={loading} onRefresh={fetchAll} />

        {errorMsg && (
          <div className="mx-8 mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-5 py-3 text-sm text-rose-300">
            {errorMsg}
          </div>
        )}

        <div className="px-8 py-6">
          {activeView === "dashboard" && (
            <Dashboard
              programas={programas}
              modulos={modulos}
              evaluaciones={evaluaciones}
              criterios={criterios}
              clientes={clientes}
            />
          )}

          {activeView === "programas" && (
            <ProgramasView
              programas={programas}
              clientes={clientes}
              setProgramas={setProgramas}
              activePrograma={activePrograma}
              setActivePrograma={setActivePrograma}
              criterios={criterios}
              modulos={modulos}
              categorias={categorias}
              evaluaciones={evaluaciones}
              setEvaluaciones={setEvaluaciones}
              evidencias={evidencias}
              ous={ousForActivePrograma}
              modalCriterio={modalCriterio}
              setModalCriterio={setModalCriterio}
            />
          )}

          {activeView === "reportes" && (
            <ReporteView
              programas={programas}
              clientes={clientes}
              categorias={categorias}
              modulos={modulos}
              criterios={criterios}
              evaluaciones={evaluaciones}
              evidencias={evidencias}
              unidadesOrganizacionales={unidadesOrganizacionales}
            />
          )}

          {activeView === "configuracion" && (
            <ConfiguracionView
              categorias={categorias}
              modulos={modulos}
              criterios={criterios}
              clientes={clientes}
              usuarios={usuarios}
              unidadesOrganizacionales={unidadesOrganizacionales}
              setCategorias={setCategorias}
              setModulos={setModulos}
              setCriterios={setCriterios}
              setClientes={setClientes}
              setUsuarios={setUsuarios}
              setUnidadesOrganizacionales={setUnidadesOrganizacionales}
            />
          )}
        </div>
      </main>

      {modalCriterio && (
        <AuditoriaModal
          criterio={modalCriterio}
          programa={activePrograma}
          ous={ousForActivePrograma}
          evaluaciones={evaluaciones}
          setEvaluaciones={setEvaluaciones}
          onClose={() => setModalCriterio(null)}
        />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   SIDEBAR
   ────────────────────────────────────────────────────────────────────────── */

function Sidebar({ activeView, setActiveView }) {
  const items = [
    { id: "dashboard", label: "Inicio", icon: HomeIcon },
    { id: "programas", label: "Programas de Mejora", icon: ClipboardIcon },
    { id: "reportes", label: "Reportes", icon: ChartIcon },
    { id: "configuracion", label: "Configuración", icon: GearIcon },
  ];

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-white px-4 py-6">
      <div className="mb-10 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 font-black text-slate-950">
          A1
        </div>
        <div>
          <p className="text-sm font-bold tracking-wide text-slate-900">ADVAN ONE</p>
          <p className="text-[11px] text-slate-500">Appraisal Assistant</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                active
                  ? "bg-orange-500 text-slate-950 shadow-lg shadow-orange-500/20"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="rounded-2xl bg-slate-100 px-4 py-4 text-xs text-slate-500">
        Modelo de referencia SCAMPI · v1.0
      </div>
    </aside>
  );
}

function TopBar({ loading, onRefresh }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-8 py-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Panel de Auditoría ERP</h1>
        <p className="text-xs text-slate-500">Evaluación de adopción y madurez de procesos</p>
      </div>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 transition hover:border-orange-500 hover:text-orange-400 disabled:opacity-50"
      >
        {loading ? "Sincronizando…" : "Refrescar datos"}
      </button>
    </header>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   A. DASHBOARD
   ────────────────────────────────────────────────────────────────────────── */

function Dashboard({ programas, modulos, evaluaciones, criterios, clientes }) {
  const kpis = [
    { label: "Auditorías (Programas)", value: programas.length, accent: "text-orange-400" },
    { label: "Módulos en Catálogo", value: modulos.length, accent: "text-sky-400" },
    { label: "Evaluaciones Cloud", value: evaluaciones.length, accent: "text-emerald-400" },
    { label: "Clientes Registrados", value: clientes.length, accent: "text-purple-400" },
  ];

  const dictamenCounts = SCAMPI_LEVELS.map((lvl) => ({
    ...lvl,
    count: evaluaciones.filter((e) => e.status_scampi === lvl.code).length,
  }));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-black/20"
          >
            <p className="text-xs uppercase tracking-wider text-slate-500">{k.label}</p>
            <p className={`mt-3 text-4xl font-bold ${k.accent}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Distribución de Dictámenes SCAMPI</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {dictamenCounts.map((d) => (
            <div key={d.code} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${d.color}`} />
                <span className="text-xs font-semibold text-slate-700">{d.code}</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{d.count}</p>
              <p className="mt-1 text-[11px] text-slate-500">{d.label}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Total de criterios activos en el modelo de referencia: {criterios.length}
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   B. PROGRAMAS DE MEJORA (AUDITORÍAS)
   ────────────────────────────────────────────────────────────────────────── */

function ProgramasView({
  programas,
  clientes,
  setProgramas,
  activePrograma,
  setActivePrograma,
  criterios,
  modulos,
  categorias,
  evaluaciones,
  setEvaluaciones,
  evidencias,
  ous,
  modalCriterio,
  setModalCriterio,
}) {
  const [nombre, setNombre] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("programas_mejora")
      .insert([{ nombre, cliente_id: clienteId || null, estatus: "Planificado" }])
      .select();
    setSaving(false);
    if (error) {
      console.error(error);
      return;
    }
    setProgramas((prev) => [data[0], ...prev]);
    setNombre("");
    setClienteId("");
  };

  if (activePrograma) {
    return (
      <MatrizScampi
        programa={activePrograma}
        criterios={criterios}
        modulos={modulos}
        categorias={categorias}
        evaluaciones={evaluaciones}
        setEvaluaciones={setEvaluaciones}
        evidencias={evidencias}
        ous={ous}
        onBack={() => setActivePrograma(null)}
        setModalCriterio={setModalCriterio}
      />
    );
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleCreate}
        className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 sm:grid-cols-[2fr_2fr_auto]"
      >
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del programa"
          className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
        />
        <select
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:outline-none"
        >
          <option value="">Empresa / Cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Crear Programa"}
        </button>
      </form>

      <div className="overflow-hidden rounded-3xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-white text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-4">Programa</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Estatus</th>
              <th className="px-6 py-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-slate-50">
            {programas.map((p) => {
              const cliente = clientes.find((c) => c.id === p.cliente_id);
              return (
                <tr key={p.id} className="transition hover:bg-slate-100/40">
                  <td className="px-6 py-4 font-medium text-slate-900">{p.nombre}</td>
                  <td className="px-6 py-4 text-slate-700">{cliente?.nombre || "—"}</td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                      {p.estatus || "Planificado"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setActivePrograma(p)}
                      className="rounded-xl bg-orange-500/10 px-4 py-2 text-xs font-semibold text-orange-400 transition hover:bg-orange-500 hover:text-slate-950"
                    >
                      EJECUTAR AUDITORÍA
                    </button>
                  </td>
                </tr>
              );
            })}
            {programas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                  Aún no hay programas de mejora registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatrizScampi({
  programa,
  criterios,
  modulos,
  categorias,
  evaluaciones,
  evidencias,
  ous,
  onBack,
  setModalCriterio,
}) {
  const rows = useMemo(() => {
    return criterios.map((crit) => {
      const modulo = modulos.find((m) => m.id === crit.modulo_id);
      const categoria = categorias.find((c) => c.id === modulo?.categoria_id);
      const porOu = {};
      ous.forEach((ou) => {
        const ev = evaluaciones.find(
          (e) => e.criterio_id === crit.id && e.programa_id === programa.id && e.organizational_unit === ou
        );
        const evidenciasOu = evidencias.filter(
          (ev2) => ev2.criterio_id === crit.id && ev2.programa_id === programa.id && ev2.organizational_unit === ou
        );
        porOu[ou] = {
          status: ev?.status_scampi || null,
          total: evidenciasOu.length,
          strength: evidenciasOu.filter((e) => e.caracteristica === "Strength").length,
          weakness: evidenciasOu.filter((e) => e.caracteristica === "Weakness").length,
        };
      });
      return { criterio: crit, modulo, categoria, porOu };
    });
  }, [criterios, modulos, categorias, evaluaciones, evidencias, ous, programa.id]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={onBack} className="mb-2 text-xs text-slate-500 hover:text-orange-400">
            ← Volver a Programas
          </button>
          <h2 className="text-lg font-semibold text-slate-900">Matriz SCAMPI — {programa.nombre}</h2>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-white text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">Criterio</th>
              <th className="px-5 py-3">Módulo / Categoría</th>
              {ous.map((ou) => (
                <th key={ou} className="px-5 py-3">
                  {ou.replace(/_/g, " ")}
                </th>
              ))}
              <th className="px-5 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-slate-50">
            {rows.map(({ criterio, modulo, categoria, porOu }) => (
              <tr key={criterio.id} className="hover:bg-slate-100/30">
                <td className="px-5 py-3">
                  <p className="font-medium text-slate-900">{criterio.nombre}</p>
                  <p className="text-xs text-slate-500">{criterio.codigo}</p>
                </td>
                <td className="px-5 py-3 text-xs text-slate-500">
                  {modulo?.nombre || "—"} <span className="text-slate-600">/</span> {categoria?.nombre || "—"}
                </td>
                {ous.map((ou) => {
                  const cell = porOu[ou];
                  const meta = cell.status ? scampiMeta(cell.status) : null;
                  return (
                    <td key={ou} className="px-5 py-3">
                      <div className="flex flex-col gap-1">
                        {meta ? (
                          <span
                            className={`inline-flex w-fit items-center gap-1.5 rounded-full ${meta.color} px-3 py-1 text-xs font-semibold text-slate-950`}
                          >
                            {meta.code}
                          </span>
                        ) : (
                          <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
                            Pendiente
                          </span>
                        )}
                        {cell.total > 0 && (
                          <span className="text-[10px] text-slate-500">
                            {cell.total} ev.
                            {cell.strength > 0 && <span className="ml-1 text-emerald-600">+{cell.strength}</span>}
                            {cell.weakness > 0 && <span className="ml-1 text-rose-600">-{cell.weakness}</span>}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => setModalCriterio(criterio)}
                    className="rounded-xl border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 transition hover:border-orange-500 hover:text-orange-400"
                  >
                    Auditar
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3 + ous.length} className="px-6 py-10 text-center text-slate-500">
                  No hay criterios cargados en el catálogo maestro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   MODAL DE AUDITORÍA
   ────────────────────────────────────────────────────────────────────────── */

const EVIDENCE_TYPES = [
  { value: "Direct Artifact", label: "Artefacto Directo" },
  { value: "Indirect Artifact", label: "Artefacto Indirecto" },
  { value: "Direct Affirmation", label: "Afirmación Directa (Entrevista)" },
];

const CARACTERISTICAS = [
  { value: "Not Characterized", label: "Sin caracterizar", color: "bg-slate-200 text-slate-600" },
  { value: "Strength", label: "Fortaleza", color: "bg-emerald-500 text-slate-950" },
  { value: "Weakness", label: "Debilidad", color: "bg-rose-500 text-slate-950" },
  { value: "Strength-Weakness", label: "Fortaleza/Debilidad", color: "bg-amber-500 text-slate-950" },
];

const STATUS_INSTANCIACION = [
  "Not Yet Reviewed",
  "Strong Evidence",
  "No Evidence",
  "Conflicting Evidence",
  "Anomalous Evidence",
  "Insufficient Evidence",
];

function caracteristicaMeta(value) {
  return CARACTERISTICAS.find((c) => c.value === value) || CARACTERISTICAS[0];
}

function AuditoriaModal({ criterio, programa, ous, evaluaciones, setEvaluaciones, onClose }) {
  const [ou, setOu] = useState(ous[0]);

  const [evaluacion, setEvaluacion] = useState(null);
  const [statusInstanciacion, setStatusInstanciacion] = useState("Not Yet Reviewed");
  const [oportunidadesInstancia, setOportunidadesInstancia] = useState("");
  const [oportunidadesOu, setOportunidadesOu] = useState("");
  const [statusScampi, setStatusScampi] = useState(null);

  const [evidencias, setEvidencias] = useState([]);
  const [entrevistas, setEntrevistas] = useState([]);
  const [loadingEvidencias, setLoadingEvidencias] = useState(false);

  const [nuevaEvNombre, setNuevaEvNombre] = useState("");
  const [nuevaEvTipo, setNuevaEvTipo] = useState("Direct Artifact");
  const [nuevaEvLink, setNuevaEvLink] = useState("");
  const [nuevaEvEntrevistaId, setNuevaEvEntrevistaId] = useState("");

  const [nuevaEntrevistaNombre, setNuevaEntrevistaNombre] = useState("");
  const [nuevaEntrevistaParticipantes, setNuevaEntrevistaParticipantes] = useState("");
  const [showEntrevistaForm, setShowEntrevistaForm] = useState(false);

  const [saving, setSaving] = useState(false);
  const [syncOk, setSyncOk] = useState(false);

  const loadOuData = useCallback(
    async (targetOu) => {
      setLoadingEvidencias(true);
      setSyncOk(false);

      const ev = evaluaciones.find(
        (e) => e.criterio_id === criterio.id && e.programa_id === programa?.id && e.organizational_unit === targetOu
      );
      setEvaluacion(ev || null);
      setStatusInstanciacion(ev?.status_instanciacion || "Not Yet Reviewed");
      setOportunidadesInstancia(ev?.oportunidades_mejora_instancia || "");
      setOportunidadesOu(ev?.oportunidades_mejora_ou || "");
      setStatusScampi(ev?.status_scampi || null);

      const [{ data: evData, error: evErr }, { data: entData, error: entErr }] = await Promise.all([
        supabase
          .from("evidencias")
          .select("*")
          .eq("criterio_id", criterio.id)
          .eq("programa_id", programa?.id)
          .eq("organizational_unit", targetOu)
          .order("created_at"),
        supabase
          .from("entrevistas")
          .select("*")
          .eq("programa_id", programa?.id)
          .eq("organizational_unit", targetOu)
          .order("created_at"),
      ]);

      if (!evErr) setEvidencias(evData || []);
      if (!entErr) setEntrevistas(entData || []);
      setLoadingEvidencias(false);
    },
    [criterio.id, programa?.id, evaluaciones]
  );

  useEffect(() => {
    loadOuData(ou);
  }, [ou, loadOuData]);

  const handleCreateEntrevista = async () => {
    if (!nuevaEntrevistaNombre.trim()) return;
    const { data, error } = await supabase
      .from("entrevistas")
      .insert([
        {
          programa_id: programa?.id,
          organizational_unit: ou,
          nombre: nuevaEntrevistaNombre,
          participantes: nuevaEntrevistaParticipantes,
        },
      ])
      .select();
    if (error) {
      console.error(error);
      return;
    }
    setEntrevistas((prev) => [...prev, data[0]]);
    setNuevaEvEntrevistaId(data[0].id);
    setNuevaEntrevistaNombre("");
    setNuevaEntrevistaParticipantes("");
    setShowEntrevistaForm(false);
  };

  const handleAddEvidencia = async () => {
    if (!nuevaEvNombre.trim()) return;
    if (nuevaEvTipo === "Direct Affirmation" && !nuevaEvEntrevistaId) return;

    const { data, error } = await supabase
      .from("evidencias")
      .insert([
        {
          criterio_id: criterio.id,
          programa_id: programa?.id,
          organizational_unit: ou,
          nombre: nuevaEvNombre,
          tipo: nuevaEvTipo,
          document_link: nuevaEvLink || null,
          entrevista_id: nuevaEvTipo === "Direct Affirmation" ? nuevaEvEntrevistaId : null,
          caracteristica: "Not Characterized",
        },
      ])
      .select();

    if (error) {
      console.error(error);
      return;
    }

    setEvidencias((prev) => [...prev, data[0]]);
    setNuevaEvNombre("");
    setNuevaEvLink("");
    setNuevaEvEntrevistaId("");
  };

  const handleSetCaracteristica = async (evidenciaId, caracteristica) => {
    setEvidencias((prev) => prev.map((e) => (e.id === evidenciaId ? { ...e, caracteristica } : e)));
    const { error } = await supabase.from("evidencias").update({ caracteristica }).eq("id", evidenciaId);
    if (error) console.error(error);
  };

  const handleDeleteEvidencia = async (evidenciaId) => {
    setEvidencias((prev) => prev.filter((e) => e.id !== evidenciaId));
    const { error } = await supabase.from("evidencias").delete().eq("id", evidenciaId);
    if (error) console.error(error);
  };

  const handleSync = async () => {
    setSaving(true);
    const payload = {
      criterio_id: criterio.id,
      programa_id: programa?.id,
      organizational_unit: ou,
      status_instanciacion: statusInstanciacion,
      oportunidades_mejora_instancia: oportunidadesInstancia,
      oportunidades_mejora_ou: oportunidadesOu,
      status_scampi: statusScampi,
    };

    const { data, error } = await supabase
      .from("evaluaciones")
      .upsert(payload, { onConflict: "criterio_id, organizational_unit, programa_id" })
      .select();

    setSaving(false);
    if (error) {
      console.error(error);
      return;
    }

    setEvaluaciones((prev) => {
      const exists = prev.some(
        (e) => e.criterio_id === criterio.id && e.programa_id === programa?.id && e.organizational_unit === ou
      );
      if (exists) {
        return prev.map((e) =>
          e.criterio_id === criterio.id && e.programa_id === programa?.id && e.organizational_unit === ou
            ? data[0]
            : e
        );
      }
      return [...prev, data[0]];
    });
    setSyncOk(true);
  };

  const conteo = useMemo(() => {
    const strength = evidencias.filter((e) => e.caracteristica === "Strength").length;
    const weakness = evidencias.filter((e) => e.caracteristica === "Weakness").length;
    return { strength, weakness, total: evidencias.length };
  }, [evidencias]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-orange-500">{criterio.codigo}</p>
            <h3 className="text-lg font-semibold text-slate-900">{criterio.nombre}</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900">
            ✕
          </button>
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-xs font-medium text-slate-500">Unidad Organizacional</label>
          <div className="flex gap-2">
            {ous.map((o) => (
              <button
                key={o}
                onClick={() => setOu(o)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  ou === o
                    ? "bg-orange-500 text-slate-950"
                    : "border border-slate-300 text-slate-700 hover:border-orange-500"
                }`}
              >
                {o.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Columna izquierda: evidencias */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">
                Evidencias ({conteo.total})
                <span className="ml-2 text-xs font-normal text-emerald-600">{conteo.strength} fortalezas</span>
                <span className="ml-2 text-xs font-normal text-rose-600">{conteo.weakness} debilidades</span>
              </h4>
              <span className="text-[11px] text-slate-400">{ou.replace(/_/g, " ")}</span>
            </div>

            {loadingEvidencias ? (
              <p className="text-xs text-slate-400">Cargando evidencias…</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 p-2">
                {evidencias.length === 0 && (
                  <p className="px-2 py-4 text-center text-xs text-slate-400">Sin evidencias capturadas todavía.</p>
                )}
                {evidencias.map((ev) => {
                  const meta = caracteristicaMeta(ev.caracteristica);
                  const entrevista = entrevistas.find((e) => e.id === ev.entrevista_id);
                  return (
                    <div key={ev.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{ev.nombre}</p>
                          <p className="text-[11px] text-slate-500">
                            {EVIDENCE_TYPES.find((t) => t.value === ev.tipo)?.label || ev.tipo}
                            {entrevista && ` · ${entrevista.nombre}`}
                          </p>
                          {ev.document_link && (
                            <p className="truncate text-[11px] text-sky-600">{ev.document_link}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteEvidencia(ev.id)}
                          className="shrink-0 text-slate-400 hover:text-rose-500"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {CARACTERISTICAS.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => handleSetCaracteristica(ev.id, c.value)}
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
                              ev.caracteristica === c.value ? c.color : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            }`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-2 rounded-2xl border border-dashed border-slate-300 p-3">
              <p className="text-xs font-semibold text-slate-700">Agregar evidencia</p>
              <input
                value={nuevaEvNombre}
                onChange={(e) => setNuevaEvNombre(e.target.value)}
                placeholder="Nombre de la evidencia"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={nuevaEvTipo}
                  onChange={(e) => setNuevaEvTipo(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-orange-500 focus:outline-none"
                >
                  {EVIDENCE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  value={nuevaEvLink}
                  onChange={(e) => setNuevaEvLink(e.target.value)}
                  placeholder="Link / ruta documento"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none"
                />
              </div>

              {nuevaEvTipo === "Direct Affirmation" && (
                <div className="space-y-2 rounded-xl bg-orange-50 p-2.5">
                  <select
                    value={nuevaEvEntrevistaId}
                    onChange={(e) => setNuevaEvEntrevistaId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">Selecciona entrevista</option>
                    {entrevistas.map((ent) => (
                      <option key={ent.id} value={ent.id}>
                        {ent.nombre}
                      </option>
                    ))}
                  </select>
                  {!showEntrevistaForm ? (
                    <button
                      onClick={() => setShowEntrevistaForm(true)}
                      className="text-[11px] font-semibold text-orange-600 hover:text-orange-700"
                    >
                      + Nueva entrevista
                    </button>
                  ) : (
                    <div className="space-y-1.5">
                      <input
                        value={nuevaEntrevistaNombre}
                        onChange={(e) => setNuevaEntrevistaNombre(e.target.value)}
                        placeholder="Ej: Entrevista PL1"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none"
                      />
                      <input
                        value={nuevaEntrevistaParticipantes}
                        onChange={(e) => setNuevaEntrevistaParticipantes(e.target.value)}
                        placeholder="Participantes"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none"
                      />
                      <button
                        onClick={handleCreateEntrevista}
                        className="w-full rounded-lg bg-orange-500 py-1.5 text-xs font-semibold text-slate-950 hover:bg-orange-400"
                      >
                        Crear entrevista
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleAddEvidencia}
                className="w-full rounded-xl bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-700"
              >
                + Agregar evidencia
              </button>
            </div>
          </div>

          {/* Columna derecha: status y dictamen */}
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">Status a nivel Instanciación</label>
              <select
                value={statusInstanciacion}
                onChange={(e) => setStatusInstanciacion(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:outline-none"
              >
                {STATUS_INSTANCIACION.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">
                Oportunidades de mejora (Instanciación)
              </label>
              <textarea
                value={oportunidadesInstancia}
                onChange={(e) => setOportunidadesInstancia(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">
                Oportunidades de mejora (Org. Unit — consensuadas)
              </label>
              <textarea
                value={oportunidadesOu}
                onChange={(e) => setOportunidadesOu(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">
                Dictamen SCAMPI (Roll-up a nivel OU)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SCAMPI_LEVELS.map((lvl) => (
                  <button
                    key={lvl.code}
                    onClick={() => setStatusScampi(lvl.code)}
                    className={`rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                      statusScampi === lvl.code
                        ? `${lvl.color} text-slate-950 ring-2 ${lvl.ring}`
                        : "border border-slate-300 text-slate-500 hover:border-orange-500"
                    }`}
                    title={lvl.label}
                  >
                    {lvl.code} · {lvl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-5">
          {syncOk && <span className="text-xs text-emerald-600">✓ Sincronizado</span>}
          <div className="flex flex-1 justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm text-slate-700 hover:border-slate-500"
            >
              Cerrar
            </button>
            <button
              onClick={handleSync}
              disabled={saving}
              className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:opacity-50"
            >
              {saving ? "Sincronizando…" : "Sincronizar Cloud"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   REPORTES — Vista agregada de auditoría con exportación CSV
   ────────────────────────────────────────────────────────────────────────── */

function ReporteView({
  programas,
  clientes,
  categorias,
  modulos,
  criterios,
  evaluaciones,
  evidencias,
  unidadesOrganizacionales,
}) {
  const [programaId, setProgramaId] = useState(programas[0]?.id || "");

  const programa = programas.find((p) => p.id === programaId);

  const ous = useMemo(() => {
    if (!programa) return [];
    const filtered = unidadesOrganizacionales
      .filter((ou) => ou.cliente_id === programa.cliente_id)
      .map((ou) => ou.nombre);
    return filtered.length ? filtered : DEFAULT_OUS;
  }, [programa, unidadesOrganizacionales]);

  const filas = useMemo(() => {
    if (!programa) return [];
    return criterios.map((crit) => {
      const modulo = modulos.find((m) => m.id === crit.modulo_id);
      const categoria = categorias.find((c) => c.id === modulo?.categoria_id);

      const porOu = ous.map((ou) => {
        const ev = evaluaciones.find(
          (e) => e.criterio_id === crit.id && e.programa_id === programa.id && e.organizational_unit === ou
        );
        const evid = evidencias.filter(
          (e) => e.criterio_id === crit.id && e.programa_id === programa.id && e.organizational_unit === ou
        );
        return {
          ou,
          status: ev?.status_scampi || "Sin evaluar",
          statusInstanciacion: ev?.status_instanciacion || "—",
          oportunidades: ev?.oportunidades_mejora_ou || "",
          totalEvidencias: evid.length,
          strength: evid.filter((e) => e.caracteristica === "Strength").length,
          weakness: evid.filter((e) => e.caracteristica === "Weakness").length,
        };
      });

      return { criterio: crit, modulo, categoria, porOu };
    });
  }, [programa, criterios, modulos, categorias, evaluaciones, evidencias, ous]);

  const resumen = useMemo(() => {
    const counts = { FI: 0, LI: 0, PI: 0, NI: 0, "Sin evaluar": 0 };
    let totalEvidencias = 0;
    let totalDebilidades = 0;
    filas.forEach((f) =>
      f.porOu.forEach((c) => {
        counts[c.status] = (counts[c.status] || 0) + 1;
        totalEvidencias += c.totalEvidencias;
        totalDebilidades += c.weakness;
      })
    );
    return { counts, totalEvidencias, totalDebilidades };
  }, [filas]);

  const handleExportCsv = () => {
    const header = [
      "Categoria",
      "Modulo",
      "Criterio",
      "Codigo",
      "OU",
      "Status SCAMPI",
      "Status Instanciacion",
      "Evidencias",
      "Fortalezas",
      "Debilidades",
      "Oportunidades de Mejora",
    ];
    const rows = [];
    filas.forEach((f) => {
      f.porOu.forEach((c) => {
        rows.push([
          f.categoria?.nombre || "",
          f.modulo?.nombre || "",
          f.criterio.nombre,
          f.criterio.codigo || "",
          c.ou,
          c.status,
          c.statusInstanciacion,
          c.totalEvidencias,
          c.strength,
          c.weakness,
          (c.oportunidades || "").replace(/\n/g, " "),
        ]);
      });
    });

    const csvContent = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte_${(programa?.nombre || "auditoria").replace(/\s+/g, "_")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!programa) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        No hay programas de mejora registrados todavía. Crea uno en "Programas de Mejora" para ver su reporte aquí.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <select
            value={programaId}
            onChange={(e) => setProgramaId(e.target.value)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:outline-none"
          >
            {programas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500">
            {clientes.find((c) => c.id === programa.cliente_id)?.nombre || "Sin cliente"}
          </span>
        </div>
        <button
          onClick={handleExportCsv}
          className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-orange-400"
        >
          Descargar CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {SCAMPI_LEVELS.map((lvl) => (
          <div key={lvl.code} className="rounded-2xl border border-slate-200 bg-white p-4">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${lvl.color}`} />
            <p className="mt-2 text-2xl font-bold text-slate-900">{resumen.counts[lvl.code] || 0}</p>
            <p className="text-[11px] text-slate-500">{lvl.code} · {lvl.label}</p>
          </div>
        ))}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-300" />
          <p className="mt-2 text-2xl font-bold text-slate-900">{resumen.counts["Sin evaluar"] || 0}</p>
          <p className="text-[11px] text-slate-500">Sin evaluar</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-bold text-sky-600">{resumen.totalEvidencias}</p>
          <p className="text-[11px] text-slate-500">Evidencias totales recolectadas</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-bold text-rose-600">{resumen.totalDebilidades}</p>
          <p className="text-[11px] text-slate-500">Debilidades identificadas</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-white text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">Categoría</th>
              <th className="px-5 py-3">Módulo</th>
              <th className="px-5 py-3">Criterio</th>
              {ous.map((ou) => (
                <th key={ou} className="px-5 py-3">
                  {ou.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-slate-50">
            {filas.map(({ criterio, modulo, categoria, porOu }) => (
              <tr key={criterio.id} className="hover:bg-slate-100/30">
                <td className="px-5 py-3 text-xs text-slate-500">{categoria?.nombre || "—"}</td>
                <td className="px-5 py-3 text-xs text-slate-500">{modulo?.nombre || "—"}</td>
                <td className="px-5 py-3">
                  <p className="font-medium text-slate-900">{criterio.nombre}</p>
                  <p className="text-xs text-slate-400">{criterio.codigo}</p>
                </td>
                {porOu.map((c) => {
                  const meta = SCAMPI_LEVELS.find((l) => l.code === c.status);
                  return (
                    <td key={c.ou} className="px-5 py-3">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            meta ? `${meta.color} text-slate-950` : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {c.status}
                        </span>
                        {c.totalEvidencias > 0 && (
                          <span className="text-[10px] text-slate-500">
                            {c.totalEvidencias} ev.
                            {c.strength > 0 && <span className="ml-1 text-emerald-600">+{c.strength}</span>}
                            {c.weakness > 0 && <span className="ml-1 text-rose-600">-{c.weakness}</span>}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={3 + ous.length} className="px-6 py-10 text-center text-slate-500">
                  Sin criterios en el catálogo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   C. CONFIGURACIÓN — CATÁLOGOS MAESTROS (5 bloques)
   ────────────────────────────────────────────────────────────────────────── */

function ConfiguracionView({
  categorias,
  modulos,
  criterios,
  clientes,
  usuarios,
  unidadesOrganizacionales,
  setCategorias,
  setModulos,
  setCriterios,
  setClientes,
  setUsuarios,
  setUnidadesOrganizacionales,
}) {
  const [tab, setTab] = useState("modelo");

  const tabs = [
    { id: "modelo", label: "Modelo de Referencia" },
    { id: "clientes", label: "Clientes y OUs" },
    { id: "usuarios", label: "Usuarios y Roles" },
    { id: "escalas", label: "Escalas SCAMPI" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition ${
              tab === t.id ? "bg-orange-500 text-slate-950" : "border border-slate-300 text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "modelo" && (
        <ModeloReferenciaPanel
          categorias={categorias}
          modulos={modulos}
          criterios={criterios}
          setCategorias={setCategorias}
          setModulos={setModulos}
          setCriterios={setCriterios}
        />
      )}

      {tab === "clientes" && (
        <ClientesOuPanel
          clientes={clientes}
          unidadesOrganizacionales={unidadesOrganizacionales}
          setClientes={setClientes}
          setUnidadesOrganizacionales={setUnidadesOrganizacionales}
        />
      )}

      {tab === "usuarios" && <UsuariosPanel usuarios={usuarios} setUsuarios={setUsuarios} />}

      {tab === "escalas" && <EscalasPanel />}
    </div>
  );
}

function ModeloReferenciaPanel({ categorias, modulos, criterios, setCategorias, setModulos, setCriterios }) {
  const [categoriaId, setCategoriaId] = useState("");
  const [moduloNombre, setModuloNombre] = useState("");
  const [criterioNombre, setCriterioNombre] = useState("");
  const [criterioCodigo, setCriterioCodigo] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreateModulo = async (e) => {
    e.preventDefault();
    if (!moduloNombre.trim() || !categoriaId) return;
    setSaving(true);

    const { data: modData, error: modErr } = await supabase
      .from("modulos")
      .insert([{ nombre: moduloNombre, categoria_id: categoriaId }])
      .select();

    if (modErr) {
      console.error(modErr);
      setSaving(false);
      return;
    }

    const nuevoModulo = modData[0];
    setModulos((prev) => [...prev, nuevoModulo]);

    if (criterioNombre.trim()) {
      const { data: critData, error: critErr } = await supabase
        .from("criterios")
        .insert([{ nombre: criterioNombre, codigo: criterioCodigo || null, modulo_id: nuevoModulo.id }])
        .select();
      if (!critErr) setCriterios((prev) => [...prev, critData[0]]);
    }

    setSaving(false);
    setModuloNombre("");
    setCriterioNombre("");
    setCriterioCodigo("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <form onSubmit={handleCreateModulo} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-slate-900">Nuevo Módulo + Primer Criterio</h3>
        <select
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:outline-none"
        >
          <option value="">Categoría (Área de capacidad)</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <input
          value={moduloNombre}
          onChange={(e) => setModuloNombre(e.target.value)}
          placeholder="Nombre del módulo ERP"
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
        />
        <div className="grid grid-cols-[1fr_2fr] gap-2">
          <input
            value={criterioCodigo}
            onChange={(e) => setCriterioCodigo(e.target.value)}
            placeholder="Código"
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
          />
          <input
            value={criterioNombre}
            onChange={(e) => setCriterioNombre(e.target.value)}
            placeholder="Primer criterio (práctica CMMI)"
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-slate-950 hover:bg-orange-400 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Añadir al Catálogo"}
        </button>
      </form>

      <div className="max-h-[28rem] overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Árbol del Modelo de Referencia</h3>
        {categorias.map((cat) => (
          <div key={cat.id} className="mb-3">
            <p className="text-xs font-bold uppercase text-orange-400">{cat.nombre}</p>
            {modulos
              .filter((m) => m.categoria_id === cat.id)
              .map((mod) => (
                <div key={mod.id} className="ml-3 mt-1.5">
                  <p className="text-xs font-semibold text-slate-800">↳ {mod.nombre}</p>
                  {criterios
                    .filter((c) => c.modulo_id === mod.id)
                    .map((c) => (
                      <p key={c.id} className="ml-5 text-[11px] text-slate-500">
                        • {c.codigo ? `${c.codigo} — ` : ""}
                        {c.nombre}
                      </p>
                    ))}
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientesOuPanel({ clientes, unidadesOrganizacionales, setClientes, setUnidadesOrganizacionales }) {
  const [nombre, setNombre] = useState("");
  const [clienteOuId, setClienteOuId] = useState("");
  const [ouNombre, setOuNombre] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreateCliente = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("clientes").insert([{ nombre }]).select();
    setSaving(false);
    if (error) return console.error(error);
    setClientes((prev) => [...prev, data[0]]);
    setNombre("");
  };

  const handleCreateOu = async (e) => {
    e.preventDefault();
    if (!ouNombre.trim() || !clienteOuId) return;
    const { data, error } = await supabase
      .from("unidades_organizacionales")
      .insert([{ nombre: ouNombre, cliente_id: clienteOuId }])
      .select();
    if (error) return console.error(error);
    setUnidadesOrganizacionales((prev) => [...prev, data[0]]);
    setOuNombre("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-slate-900">Catálogo de Clientes</h3>
        <form onSubmit={handleCreateCliente} className="flex gap-2">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Empresa dueña del ERP"
            className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
          />
          <button
            disabled={saving}
            className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-orange-400 disabled:opacity-50"
          >
            +
          </button>
        </form>
        <ul className="space-y-1.5">
          {clientes.map((c) => (
            <li key={c.id} className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-800">
              {c.nombre}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-slate-900">Unidades Organizacionales por Cliente</h3>
        <form onSubmit={handleCreateOu} className="space-y-2">
          <select
            value={clienteOuId}
            onChange={(e) => setClienteOuId(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:outline-none"
          >
            <option value="">Selecciona cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              value={ouNombre}
              onChange={(e) => setOuNombre(e.target.value)}
              placeholder="Ej: Matriz_Norte"
              className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
            />
            <button className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-orange-400">
              +
            </button>
          </div>
        </form>
        <ul className="space-y-1.5">
          {unidadesOrganizacionales.map((ou) => {
            const cliente = clientes.find((c) => c.id === ou.cliente_id);
            return (
              <li key={ou.id} className="rounded-xl bg-slate-100 px-4 py-2 text-xs text-slate-700">
                <span className="font-semibold text-slate-900">{ou.nombre}</span> — {cliente?.nombre || "—"}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function UsuariosPanel({ usuarios, setUsuarios }) {
  const ROLES = ["Auditor Líder", "Consultor Capturista"];
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState(ROLES[0]);
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("usuarios").insert([{ nombre, rol }]).select();
    setSaving(false);
    if (error) return console.error(error);
    setUsuarios((prev) => [...prev, data[0]]);
    setNombre("");
  };

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6">
      <h3 className="text-sm font-semibold text-slate-900">Catálogo de Usuarios</h3>
      <p className="text-xs text-slate-500">
        El rol <strong className="text-slate-700">Auditor Líder</strong> es el único habilitado para fijar el
        dictamen final. <strong className="text-slate-700">Consultor Capturista</strong> únicamente registra
        evidencia.
      </p>
      <form onSubmit={handleCreate} className="grid gap-2 sm:grid-cols-[2fr_2fr_auto]">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del usuario"
          className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
        />
        <select
          value={rol}
          onChange={(e) => setRol(e.target.value)}
          className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:outline-none"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button
          disabled={saving}
          className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-orange-400 disabled:opacity-50"
        >
          Añadir
        </button>
      </form>
      <ul className="space-y-1.5">
        {usuarios.map((u) => (
          <li
            key={u.id}
            className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-800"
          >
            {u.nombre}
            <span className="rounded-full bg-slate-700 px-3 py-1 text-[11px] text-slate-700">{u.rol}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EscalasPanel() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <h3 className="mb-1 text-sm font-semibold text-slate-900">Escalas de Dictamen SCAMPI</h3>
      <p className="mb-5 text-xs text-slate-500">
        Referencia oficial de los 4 niveles utilizados en el modal de auditoría.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {SCAMPI_LEVELS.map((lvl) => (
          <div key={lvl.code} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
            <span className={`mt-0.5 h-3 w-3 rounded-full ${lvl.color}`} />
            <div>
              <p className="text-sm font-bold text-slate-900">{lvl.code}</p>
              <p className="text-xs text-slate-500">{lvl.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   ICONOS
   ────────────────────────────────────────────────────────────────────────── */

function ChartIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M4 19V5M10 19V9M16 19v-6M22 19H2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HomeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" strokeLinejoin="round" />
    </svg>
  );
}

function ClipboardIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 11h6M9 15h6" strokeLinecap="round" />
    </svg>
  );
}

function GearIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-1.7-1l-.4-2.6h-4l-.4 2.6a7.5 7.5 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.5 7.5 0 0 0 1.7-1l2.4 1 2-3.4Z" strokeLinejoin="round" />
    </svg>
  );
}
