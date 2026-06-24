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
      ] = await Promise.all([
        supabase.from("categorias").select("*").order("nombre"),
        supabase.from("modulos").select("*").order("nombre"),
        supabase.from("criterios").select("*").order("codigo"),
        supabase.from("programas_mejora").select("*").order("created_at", { ascending: false }),
        supabase.from("evaluaciones").select("*"),
        supabase.from("clientes").select("*").order("nombre"),
        supabase.from("usuarios").select("*").order("nombre"),
        supabase.from("unidades_organizacionales").select("*").order("nombre"),
      ]);

      const firstError = catErr || modErr || critErr || progErr || evalErr || cliErr || userErr || ouErr;
      if (firstError) throw firstError;

      setCategorias(catData || []);
      setModulos(modData || []);
      setCriterios(critData || []);
      setProgramas(progData || []);
      setEvaluaciones(evalData || []);
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
              ous={ousForActivePrograma}
              modalCriterio={modalCriterio}
              setModalCriterio={setModalCriterio}
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
        porOu[ou] = ev?.status_scampi || null;
      });
      return { criterio: crit, modulo, categoria, porOu };
    });
  }, [criterios, modulos, categorias, evaluaciones, ous, programa.id]);

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
                  const status = porOu[ou];
                  const meta = status ? scampiMeta(status) : null;
                  return (
                    <td key={ou} className="px-5 py-3">
                      {meta ? (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full ${meta.color} px-3 py-1 text-xs font-semibold text-slate-950`}
                        >
                          {meta.code}
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
                          Pendiente
                        </span>
                      )}
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

function AuditoriaModal({ criterio, programa, ous, evaluaciones, setEvaluaciones, onClose }) {
  const [ou, setOu] = useState(ous[0]);
  const [evidenciaDirecta, setEvidenciaDirecta] = useState("");
  const [evidenciaIndirecta, setEvidenciaIndirecta] = useState("");
  const [afirmaciones, setAfirmaciones] = useState([]);
  const [nuevaAfirmacion, setNuevaAfirmacion] = useState("");
  const [statusScampi, setStatusScampi] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncOk, setSyncOk] = useState(false);

  const loadOuState = useCallback(
    (targetOu) => {
      const ev = evaluaciones.find(
        (e) => e.criterio_id === criterio.id && e.programa_id === programa?.id && e.organizational_unit === targetOu
      );
      setEvidenciaDirecta(ev?.evidencia_directa || "");
      setEvidenciaIndirecta(ev?.evidencia_indirecta || "");
      setAfirmaciones(ev?.afirmaciones || []);
      setStatusScampi(ev?.status_scampi || null);
      setSyncOk(false);
    },
    [criterio.id, programa?.id, evaluaciones]
  );

  useEffect(() => {
    loadOuState(ou);
  }, [ou, loadOuState]);

  const handleOuChange = (newOu) => {
    setOu(newOu);
  };

  const addAfirmacion = () => {
    if (!nuevaAfirmacion.trim()) return;
    setAfirmaciones((prev) => [...prev, nuevaAfirmacion.trim()]);
    setNuevaAfirmacion("");
  };

  const removeAfirmacion = (idx) => {
    setAfirmaciones((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSync = async () => {
    setSyncing(true);
    const payload = {
      criterio_id: criterio.id,
      programa_id: programa?.id,
      organizational_unit: ou,
      evidencia_directa: evidenciaDirecta,
      evidencia_indirecta: evidenciaIndirecta,
      afirmaciones,
      status_scampi: statusScampi,
    };

    const { data, error } = await supabase
      .from("evaluaciones")
      .upsert(payload, { onConflict: "criterio_id, organizational_unit, programa_id" })
      .select();

    setSyncing(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50/70 px-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-orange-400">{criterio.codigo}</p>
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
                onClick={() => handleOuChange(o)}
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

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Evidencia Directa</label>
            <textarea
              value={evidenciaDirecta}
              onChange={(e) => setEvidenciaDirecta(e.target.value)}
              placeholder="Rutas a documentos, políticas o manuales del ERP"
              rows={2}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Evidencia Indirecta</label>
            <textarea
              value={evidenciaIndirecta}
              onChange={(e) => setEvidenciaIndirecta(e.target.value)}
              placeholder="Capturas de pantalla, queries o logs de auditoría"
              rows={2}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Afirmaciones (Entrevistas)</label>
            <div className="mb-2 flex gap-2">
              <input
                value={nuevaAfirmacion}
                onChange={(e) => setNuevaAfirmacion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAfirmacion()}
                placeholder="Nueva nota de entrevista"
                className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
              />
              <button
                onClick={addAfirmacion}
                className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-orange-400"
              >
                +
              </button>
            </div>
            <ul className="space-y-1.5">
              {afirmaciones.map((a, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-2 text-xs text-slate-700"
                >
                  {a}
                  <button onClick={() => removeAfirmacion(idx)} className="text-slate-500 hover:text-rose-400">
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Dictamen SCAMPI</label>
            <div className="grid grid-cols-4 gap-2">
              {SCAMPI_LEVELS.map((lvl) => (
                <button
                  key={lvl.code}
                  onClick={() => setStatusScampi(lvl.code)}
                  className={`rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                    statusScampi === lvl.code
                      ? `${lvl.color} text-slate-950 ring-2 ${lvl.ring}`
                      : "border border-slate-300 text-slate-500 hover:border-orange-500"
                  }`}
                >
                  {lvl.code}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-7 flex items-center justify-between">
          {syncOk && <span className="text-xs text-emerald-400">✓ Sincronizado</span>}
          <div className="flex flex-1 justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm text-slate-700 hover:border-slate-500"
            >
              Cerrar
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:opacity-50"
            >
              {syncing ? "Sincronizando…" : "Sincronizar Cloud"}
            </button>
          </div>
        </div>
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
