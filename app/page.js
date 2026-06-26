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
  { code: "FI", label: "Fully Implemented", color: "bg-emerald-500", ring: "ring-emerald-400" },
  { code: "LI", label: "Largely Implemented", color: "bg-amber-500", ring: "ring-amber-400" },
  { code: "PI", label: "Partially Implemented", color: "bg-orange-500", ring: "ring-orange-400" },
  { code: "NI", label: "Not Implemented", color: "bg-rose-500", ring: "ring-rose-400" },
  { code: "NA", label: "Not Applicable", color: "bg-slate-400", ring: "ring-slate-300" },
];

const TIPOS_COMPONENTE = [
  { value: "Transaccion", label: "Transacción" },
  { value: "Consulta", label: "Consulta" },
  { value: "Reporte", label: "Reporte" },
  { value: "Catalogo", label: "Catálogo" },
  { value: "Administracion", label: "Administración" },
];

const TIPOS_USUARIO = ["Administrador", "Consultor", "Cliente"];

const DEFAULT_OUS = ["Matriz_Norte", "Sucursal_Sur"];

function scampiMeta(code) {
  return SCAMPI_LEVELS.find((l) => l.code === code);
}

/* ──────────────────────────────────────────────────────────────────────────
   COMPONENTE RAÍZ
   ────────────────────────────────────────────────────────────────────────── */

export default function Page() {
  const [session, setSession] = useState(undefined); // undefined = verificando, null = sin sesión
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [activeView, setActiveView] = useState("dashboard");
  const [programasSubView, setProgramasSubView] = useState("resumen");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const [categorias, setCategorias] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [criterios, setCriterios] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [evidencias, setEvidencias] = useState([]);
  const [soporte, setSoporte] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [unidadesOrganizacionales, setUnidadesOrganizacionales] = useState([]);

  const [activePrograma, setActivePrograma] = useState(null);
  const [modalCriterio, setModalCriterio] = useState(null);

  // ── Autenticación ──────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogin = async (email, password) => {
    setAuthLoading(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthLoading(false);
    if (error) setAuthError(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Perfil de negocio (tabla usuarios) vinculado por email al usuario autenticado
  const perfilActivo = usuarios.find((u) => u.email === session?.user?.email);
  const tipoUsuarioDemo = perfilActivo?.tipo_usuario || "Consultor";
  const usuarioActivoId = perfilActivo?.id || "";

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
        { data: supData, error: supErr },
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
        supabase.from("soporte").select("*").order("created_at", { ascending: false }),
      ]);

      const firstError = catErr || modErr || critErr || progErr || evalErr || cliErr || userErr || ouErr || eviErr || supErr;
      if (firstError) throw firstError;

      setCategorias(catData || []);
      setModulos(modData || []);
      setCriterios(critData || []);
      setProgramas(progData || []);
      setEvaluaciones(evalData || []);
      setEvidencias(eviData || []);
      setSoporte(supData || []);
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
    if (session) fetchAll();
  }, [session, fetchAll]);

  const ousForActivePrograma = useMemo(() => {
    if (!activePrograma) return DEFAULT_OUS;
    const filtered = unidadesOrganizacionales
      .filter((ou) => ou.cliente_id === activePrograma.cliente_id)
      .map((ou) => ou.nombre);
    return filtered.length ? filtered : DEFAULT_OUS;
  }, [activePrograma, unidadesOrganizacionales]);

  // ── Render condicional según estado de sesión ──────────────────
  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-400">Verificando sesión…</p>
      </div>
    );
  }

  if (session === null) {
    return <LoginScreen onLogin={handleLogin} loading={authLoading} error={authError} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        tipoUsuario={tipoUsuarioDemo}
        programasSubView={programasSubView}
        setProgramasSubView={setProgramasSubView}
      />

      <main className="flex-1 overflow-y-auto">
        <TopBar loading={loading} onRefresh={fetchAll} session={session} perfilActivo={perfilActivo} onLogout={handleLogout} />

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
              usuarios={usuarios}
              evidencias={evidencias}
              soporte={soporte}
              unidadesOrganizacionales={unidadesOrganizacionales}
              tipoUsuario={tipoUsuarioDemo}
              usuarioActivoId={usuarioActivoId}
            />
          )}

          {activeView === "programas" && (
            <ProgramasView
              programas={
                tipoUsuarioDemo === "Cliente" && usuarios.find((u) => u.id === usuarioActivoId)?.cliente_id
                  ? programas.filter((p) => p.cliente_id === usuarios.find((u) => u.id === usuarioActivoId).cliente_id)
                  : programas
              }
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
              readOnly={tipoUsuarioDemo === "Cliente"}
              subView={programasSubView}
              usuarios={usuarios}
              unidadesOrganizacionales={unidadesOrganizacionales}
              tipoUsuario={tipoUsuarioDemo}
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
          usuarioActivo={usuarios.find((u) => u.id === usuarioActivoId)}
        />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   SIDEBAR
   ────────────────────────────────────────────────────────────────────────── */

/* ──────────────────────────────────────────────────────────────────────────
   LOGIN
   ────────────────────────────────────────────────────────────────────────── */

function LoginScreen({ onLogin, loading, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    onLogin(email.trim(), password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 font-black text-slate-950">
            A1
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">ADVAN ONE</p>
            <p className="text-[11px] text-slate-500">Appraisal Assistant</p>
          </div>
        </div>

        <h1 className="mb-1 text-lg font-semibold text-slate-900">Iniciar sesión</h1>
        <p className="mb-6 text-xs text-slate-500">Ingresa con el correo registrado por tu administrador.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@empresa.com"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:outline-none"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">
              {error === "Invalid login credentials" ? "Correo o contraseña incorrectos." : error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:opacity-50"
          >
            {loading ? "Verificando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Sidebar({ activeView, setActiveView, tipoUsuario, programasSubView, setProgramasSubView }) {
  const itemsBase = [
    { id: "dashboard", label: "Dashboard", icon: HomeIcon, roles: ["Administrador", "Consultor"] },
    { id: "programas", label: "Programas de Mejora", icon: ClipboardIcon, roles: ["Administrador", "Consultor", "Cliente"] },
    { id: "configuracion", label: "Configuración", icon: GearIcon, roles: ["Administrador", "Consultor"] },
  ];
  const items = itemsBase.filter((item) => item.roles.includes(tipoUsuario));

  const programasSubItems = [
    { id: "clientes", label: "Dashboard de Clientes" },
    { id: "programas-cliente", label: "Programas de Mejora por Cliente" },
    { id: "usabilidad", label: "Usabilidad del Sistema" },
    { id: "modulos", label: "Módulos" },
  ].filter(() => tipoUsuario === "Administrador");

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 overflow-y-auto">
      <div className="mb-10 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 font-black text-slate-950">
          A1
        </div>
        <div>
          <p className="text-sm font-bold tracking-wide text-slate-900">ADVAN ONE</p>
          <p className="text-[11px] text-slate-500">Appraisal Assistant</p>
        </div>
      </div>

      <div className="mb-4 rounded-xl bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-500">
        Vista: {tipoUsuario}
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isProgramas = item.id === "programas";
          const active = activeView === item.id;
          return (
            <div key={item.id}>
              <button
                onClick={() => setActiveView(item.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                  active
                    ? "bg-orange-500 text-slate-950 shadow-lg shadow-orange-500/20"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>

              {isProgramas && active && (
                <div className="ml-3 mt-1 flex flex-col gap-0.5 border-l border-slate-200 pl-3">
                  {programasSubItems.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setProgramasSubView(sub.id)}
                      className={`rounded-xl px-3 py-2 text-left text-xs font-medium transition ${
                        programasSubView === sub.id
                          ? "bg-orange-100 text-orange-700"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="rounded-2xl bg-slate-100 px-4 py-4 text-xs text-slate-500">
        Modelo de referencia SCAMPI · v1.0
      </div>
    </aside>
  );
}

function TopBar({ loading, onRefresh, session, perfilActivo, onLogout }) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-8 py-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Panel de Auditoría ERP</h1>
        <p className="text-xs text-slate-500">Evaluación de adopción y madurez de procesos</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end">
          <span className="text-sm font-semibold text-slate-800">
            {perfilActivo?.nombre || session?.user?.email}
          </span>
          {perfilActivo ? (
            <span className="text-[11px] text-slate-500">
              {perfilActivo.tipo_usuario} · {perfilActivo.rol}
            </span>
          ) : (
            <span className="text-[11px] text-amber-600">
              Sin perfil vinculado — pide al admin que registre este email en Usuarios
            </span>
          )}
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 transition hover:border-orange-500 hover:text-orange-400 disabled:opacity-50"
        >
          {loading ? "Sincronizando…" : "Refrescar datos"}
        </button>
        <button
          onClick={onLogout}
          className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 transition hover:border-rose-400 hover:text-rose-500"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   A. DASHBOARD
   ────────────────────────────────────────────────────────────────────────── */

function Dashboard({
  programas,
  modulos,
  evaluaciones,
  criterios,
  clientes,
  usuarios,
  evidencias,
  soporte,
  unidadesOrganizacionales,
  tipoUsuario,
  usuarioActivoId,
}) {
  const ESTATUS_PROGRAMA = ["Planeado", "En Proceso", "Terminado", "Cancelado"];
  const programasPorEstatus = ESTATUS_PROGRAMA.map((est) => ({
    estatus: est,
    count: programas.filter((p) => p.estatus === est).length,
  }));

  const usuariosActivos = usuarios.length;

  const misAsignaciones = usuarioActivoId
    ? evaluaciones.filter((e) => e.usuario_id === usuarioActivoId).length +
      evidencias.filter((e) => e.usuario_id === usuarioActivoId).length
    : evaluaciones.filter((e) => e.status_instanciacion && e.status_instanciacion !== "Not Yet Reviewed").length;

  const clientesConProgramas = new Set(programas.filter((p) => p.cliente_id).map((p) => p.cliente_id)).size;

  const reportesSoporte = soporte.length;

  const dictamenCounts = SCAMPI_LEVELS.map((lvl) => ({
    ...lvl,
    count: evaluaciones.filter((e) => e.status_scampi === lvl.code).length,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {/* Tarjeta 1: Programas de Mejora por estatus */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-black/20 sm:col-span-2 lg:col-span-1">
          <p className="text-xs uppercase tracking-wider text-slate-500">Programas de Mejora</p>
          <p className="mt-2 text-3xl font-bold text-orange-400">{programas.length}</p>
          <div className="mt-3 space-y-1">
            {programasPorEstatus.map((p) => (
              <div key={p.estatus} className="flex items-center justify-between text-[11px] text-slate-500">
                <span>{p.estatus}</span>
                <span className="font-semibold text-slate-700">{p.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tarjeta 2: Mis Asignaciones */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-black/20">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            {usuarioActivoId ? "Mis Asignaciones" : "Mis Asignaciones (sin usuario activo)"}
          </p>
          <p className="mt-3 text-4xl font-bold text-sky-400">{misAsignaciones}</p>
        </div>

        {/* Tarjeta 3: Usuarios Activos */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-black/20">
          <p className="text-xs uppercase tracking-wider text-slate-500">Usuarios Activos</p>
          <p className="mt-3 text-4xl font-bold text-emerald-400">{usuariosActivos}</p>
        </div>

        {/* Tarjeta 4: Clientes con Programas de Mejora */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-black/20">
          <p className="text-xs uppercase tracking-wider text-slate-500">Clientes con Programas</p>
          <p className="mt-3 text-4xl font-bold text-purple-400">{clientesConProgramas}</p>
        </div>

        {/* Tarjeta 5: Reportes de Soporte */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-black/20">
          <p className="text-xs uppercase tracking-wider text-slate-500">Reportes de Soporte</p>
          <p className="mt-3 text-4xl font-bold text-rose-400">{reportesSoporte}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Distribución de Dictámenes SCAMPI</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
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

function DashboardClientes({ clientes, programas, unidadesOrganizacionales }) {
  const ESTATUS_PROGRAMA = ["Planeado", "En Proceso", "Terminado", "Cancelado"];

  if (clientes.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-400">
        Sin clientes registrados.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {clientes.map((c) => {
        const programasCliente = programas.filter((p) => p.cliente_id === c.id);
        const ousCliente = unidadesOrganizacionales.filter((ou) => ou.cliente_id === c.id);
        return (
          <div key={c.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-black/5">
            <p className="text-sm font-semibold text-slate-900">{c.nombre}</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-orange-400">{programasCliente.length}</span>
              <span className="text-xs text-slate-500">programas de mejora</span>
            </div>
            <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
              {ESTATUS_PROGRAMA.map((est) => (
                <div key={est} className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{est}</span>
                  <span className="font-semibold text-slate-700">
                    {programasCliente.filter((p) => p.estatus === est).length}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
              {ousCliente.length} unidad{ousCliente.length === 1 ? "" : "es"} organizacional{ousCliente.length === 1 ? "" : "es"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function DashboardProgramasPorCliente({ clientes, programas, evaluaciones }) {
  const [clienteId, setClienteId] = useState(clientes[0]?.id || "");
  const programasCliente = programas.filter((p) => p.cliente_id === clienteId);

  return (
    <div className="space-y-4">
      <select
        value={clienteId}
        onChange={(e) => setClienteId(e.target.value)}
        className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:outline-none"
      >
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>
      <div className="overflow-hidden rounded-3xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-white text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">Programa</th>
              <th className="px-5 py-3">Estatus</th>
              <th className="px-5 py-3">Evaluaciones Capturadas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-slate-50">
            {programasCliente.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-3 font-medium text-slate-900">{p.nombre}</td>
                <td className="px-5 py-3 text-slate-600">{p.estatus || "Planeado"}</td>
                <td className="px-5 py-3 text-slate-600">
                  {evaluaciones.filter((e) => e.programa_id === p.id).length}
                </td>
              </tr>
            ))}
            {programasCliente.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center text-slate-400">
                  Este cliente no tiene programas de mejora todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DashboardUsabilidad({ criterios, evaluaciones, evidencias, usuarios }) {
  const totalCriterios = criterios.length;
  const criteriosEvaluados = new Set(evaluaciones.map((e) => e.criterio_id)).size;
  const coberturaPct = totalCriterios > 0 ? Math.round((criteriosEvaluados / totalCriterios) * 100) : 0;

  const stats = [
    { label: "Cobertura del Modelo", value: `${coberturaPct}%`, accent: "text-orange-400" },
    { label: "Criterios Evaluados", value: `${criteriosEvaluados} / ${totalCriterios}`, accent: "text-sky-400" },
    { label: "Evidencias Capturadas", value: evidencias.length, accent: "text-emerald-400" },
    { label: "Usuarios Registrados", value: usuarios.length, accent: "text-purple-400" },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs uppercase tracking-wider text-slate-500">{s.label}</p>
          <p className={`mt-3 text-3xl font-bold ${s.accent}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

function ModulosBreakdownView({
  modulos,
  categorias,
  criterios,
  evaluaciones,
  tipoComponenteFiltro,
  setTipoComponenteFiltro,
}) {
  const tabs = ["Todos", ...TIPOS_COMPONENTE.map((t) => t.value)];

  const criteriosFiltrados =
    tipoComponenteFiltro === "Todos" ? criterios : criterios.filter((c) => c.tipo_componente === tipoComponenteFiltro);

  const conteoPorModulo = modulos.map((mod) => {
    const categoria = categorias.find((c) => c.id === mod.categoria_id);
    const items = criteriosFiltrados.filter((c) => c.modulo_id === mod.id);
    const evaluados = items.filter((c) => evaluaciones.some((e) => e.criterio_id === c.id)).length;
    return { modulo: mod, categoria, total: items.length, evaluados };
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((t) => {
          const label = t === "Todos" ? "Todos" : TIPOS_COMPONENTE.find((tc) => tc.value === t)?.label || t;
          return (
            <button
              key={t}
              onClick={() => setTipoComponenteFiltro(t)}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition ${
                tipoComponenteFiltro === t ? "bg-orange-500 text-slate-950" : "border border-slate-300 text-slate-600"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-white text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">Categoría</th>
              <th className="px-5 py-3">Módulo</th>
              <th className="px-5 py-3">Items ({tipoComponenteFiltro === "Todos" ? "todos" : TIPOS_COMPONENTE.find((t) => t.value === tipoComponenteFiltro)?.label})</th>
              <th className="px-5 py-3">Evaluados</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-slate-50">
            {conteoPorModulo
              .filter((row) => row.total > 0)
              .map((row) => (
                <tr key={row.modulo.id}>
                  <td className="px-5 py-3 text-xs text-slate-500">{row.categoria?.nombre || "—"}</td>
                  <td className="px-5 py-3 font-medium text-slate-900">{row.modulo.nombre}</td>
                  <td className="px-5 py-3 text-slate-700">{row.total}</td>
                  <td className="px-5 py-3 text-slate-700">
                    {row.evaluados} / {row.total}
                  </td>
                </tr>
              ))}
            {conteoPorModulo.filter((row) => row.total > 0).length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-slate-400">
                  No hay items de este tipo en el catálogo todavía.
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
  readOnly,
  subView,
  usuarios,
  unidadesOrganizacionales,
  tipoUsuario,
}) {
  const [tipoComponenteFiltro, setTipoComponenteFiltro] = useState("Todos");
  const [showNuevoPrograma, setShowNuevoPrograma] = useState(false);

  if (subView === "clientes" && tipoUsuario === "Administrador") {
    return <DashboardClientes clientes={clientes} programas={programas} unidadesOrganizacionales={unidadesOrganizacionales} />;
  }

  if (subView === "programas-cliente" && tipoUsuario === "Administrador") {
    return <DashboardProgramasPorCliente clientes={clientes} programas={programas} evaluaciones={evaluaciones} />;
  }

  if (subView === "usabilidad" && tipoUsuario === "Administrador") {
    return (
      <DashboardUsabilidad criterios={criterios} evaluaciones={evaluaciones} evidencias={evidencias} usuarios={usuarios} />
    );
  }

  if (subView === "modulos" && tipoUsuario === "Administrador") {
    return (
      <ModulosBreakdownView
        modulos={modulos}
        categorias={categorias}
        criterios={criterios}
        evaluaciones={evaluaciones}
        tipoComponenteFiltro={tipoComponenteFiltro}
        setTipoComponenteFiltro={setTipoComponenteFiltro}
      />
    );
  }

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
        readOnly={readOnly}
      />
    );
  }

  return (
    <div className="space-y-6">
      {!readOnly && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowNuevoPrograma(true)}
            className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-orange-400"
          >
            + Nuevo Programa de Mejora
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {programas.map((p) => {
          const cliente = clientes.find((c) => c.id === p.cliente_id);
          const estatusMeta = {
            Planeado: "bg-slate-100 text-slate-700",
            "En Proceso": "bg-amber-100 text-amber-700",
            Terminado: "bg-emerald-100 text-emerald-700",
            Cancelado: "bg-rose-100 text-rose-700",
          };
          return (
            <div
              key={p.id}
              className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-black/5"
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-500">
                  {cliente?.nombre || "Sin cliente"}
                </p>
                <h3 className="mt-1 text-base font-semibold text-slate-900">{p.nombre}</h3>
                <span
                  className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                    estatusMeta[p.estatus] || "bg-slate-100 text-slate-700"
                  }`}
                >
                  {p.estatus || "Planeado"}
                </span>
              </div>
              <button
                onClick={() => setActivePrograma(p)}
                className="mt-5 rounded-xl bg-orange-500/10 px-4 py-2 text-xs font-semibold text-orange-500 transition hover:bg-orange-500 hover:text-slate-950"
              >
                {readOnly ? "Ver detalle" : "EJECUTAR AUDITORÍA"}
              </button>
            </div>
          );
        })}

        {programas.length === 0 && (
          <div className="col-span-full rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-400">
            Aún no hay programas de mejora registrados.
          </div>
        )}
      </div>

      {showNuevoPrograma && (
        <NuevoProgramaModal
          clientes={clientes}
          onClose={() => setShowNuevoPrograma(false)}
          onCreated={(nuevo) => {
            setProgramas((prev) => [nuevo, ...prev]);
            setShowNuevoPrograma(false);
          }}
        />
      )}
    </div>
  );
}

function NuevoProgramaModal({ clientes, onClose, onCreated }) {
  const [nombre, setNombre] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerar = async () => {
    if (!nombre.trim()) {
      setError("El nombre del programa es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("programas_mejora")
      .insert([{ nombre, cliente_id: clienteId || null, estatus: "Planeado" }])
      .select();
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    onCreated(data[0]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Nuevo Programa de Mejora</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Nombre del programa</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Auditoría ERP 2026 - Sucursal Norte"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">Empresa / Cliente</label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:outline-none"
            >
              <option value="">Selecciona un cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm text-slate-700 hover:border-slate-500"
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerar}
            disabled={saving}
            className="rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:opacity-50"
          >
            {saving ? "Generando…" : "Generar Programa"}
          </button>
        </div>
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
  readOnly,
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
                  {readOnly ? (
                    <span className="text-xs text-slate-400">Solo lectura</span>
                  ) : (
                    <button
                      onClick={() => setModalCriterio(criterio)}
                      className="rounded-xl border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 transition hover:border-orange-500 hover:text-orange-400"
                    >
                      Auditar
                    </button>
                  )}
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
  { value: "PII", label: "PII — Practice Implementation Indicator (artefacto)" },
  { value: "Afirmation", label: "Afirmation (entrevista)" },
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

function AuditoriaModal({ criterio, programa, ous, evaluaciones, setEvaluaciones, onClose, usuarioActivo }) {
  const esAuditorLider = usuarioActivo?.rol === "Auditor Líder";
  const puedeFijarDictamen = !usuarioActivo || esAuditorLider; // sin login activo, no se restringe (modo demo)
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
  const [nuevaEvTipo, setNuevaEvTipo] = useState("PII");
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
    if (nuevaEvTipo === "Afirmation" && !nuevaEvEntrevistaId) return;

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
          entrevista_id: nuevaEvTipo === "Afirmation" ? nuevaEvEntrevistaId : null,
          caracteristica: "Not Characterized",
          usuario_id: usuarioActivo?.id || null,
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
      usuario_id: usuarioActivo?.id || null,
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

  // Sugerencia de Roll-Up: réplica simplificada del juicio de equipo del manual
  // (Team judgment basado en si las debilidades tienen impacto negativo significativo)
  const sugerenciaRollUp = useMemo(() => {
    if (conteo.total === 0) return null;
    if (conteo.weakness === 0 && conteo.strength > 0) return "FI";
    if (conteo.weakness > 0 && conteo.strength === 0) return "NI";
    if (conteo.weakness > 0 && conteo.strength > 0) {
      return conteo.weakness >= conteo.strength ? "PI" : "LI";
    }
    return null;
  }, [conteo]);

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

        {usuarioActivo && (
          <p className="mb-4 text-[11px] text-slate-400">
            Auditando como: <span className="font-semibold text-slate-600">{usuarioActivo.nombre}</span> ·{" "}
            {usuarioActivo.rol}
          </p>
        )}

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

              {nuevaEvTipo === "Afirmation" && (
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
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-medium text-slate-500">
                  Dictamen SCAMPI (Roll-up a nivel OU)
                </label>
                <button
                  onClick={() => setStatusScampi(sugerenciaRollUp)}
                  disabled={!sugerenciaRollUp || !puedeFijarDictamen}
                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-40"
                  title="Sugerencia basada en el conjunto de evidencias capturadas"
                >
                  ⟲ Sugerir Roll-Up
                </button>
              </div>
              {!puedeFijarDictamen && (
                <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                  Solo el <strong>Auditor Líder</strong> puede fijar el dictamen final. Tu rol actual (
                  {usuarioActivo?.rol}) solo permite capturar evidencia.
                </p>
              )}
              {sugerenciaRollUp && statusScampi !== sugerenciaRollUp && (
                <p className="mb-2 text-[11px] text-amber-600">
                  Sugerencia automática: <strong>{sugerenciaRollUp}</strong> ({conteo.strength} fortalezas,{" "}
                  {conteo.weakness} debilidades). El juicio final queda a discreción del auditor líder.
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {SCAMPI_LEVELS.map((lvl) => (
                  <button
                    key={lvl.code}
                    onClick={() => puedeFijarDictamen && setStatusScampi(lvl.code)}
                    disabled={!puedeFijarDictamen}
                    className={`rounded-xl px-3 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
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

      {tab === "usuarios" && <UsuariosPanel usuarios={usuarios} setUsuarios={setUsuarios} clientes={clientes} />}

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

  const [moduloExistenteId, setModuloExistenteId] = useState("");
  const [critTipoComponente, setCritTipoComponente] = useState("Transaccion");
  const [critCodigo2, setCritCodigo2] = useState("");
  const [critNombre2, setCritNombre2] = useState("");
  const [critEvidencia2, setCritEvidencia2] = useState("");
  const [critAfirmacion2, setCritAfirmacion2] = useState("");
  const [saving2, setSaving2] = useState(false);

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

  const handleAddCriterioExistente = async (e) => {
    e.preventDefault();
    if (!moduloExistenteId || !critNombre2.trim()) return;
    setSaving2(true);

    const { data, error } = await supabase
      .from("criterios")
      .insert([
        {
          nombre: critNombre2,
          codigo: critCodigo2 || null,
          modulo_id: moduloExistenteId,
          tipo_componente: critTipoComponente,
          evidencia_sugerida: critEvidencia2 || null,
          afirmacion_guia: critAfirmacion2 || null,
        },
      ])
      .select();

    setSaving2(false);
    if (error) {
      console.error(error);
      return;
    }

    setCriterios((prev) => [...prev, data[0]]);
    setCritCodigo2("");
    setCritNombre2("");
    setCritEvidencia2("");
    setCritAfirmacion2("");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-6">
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
            {saving ? "Guardando…" : "Crear Módulo Nuevo"}
          </button>
        </form>

        <form onSubmit={handleAddCriterioExistente} className="space-y-3 rounded-3xl border border-orange-200 bg-orange-50/40 p-6">
          <h3 className="text-sm font-semibold text-slate-900">Agregar Criterio a Módulo Existente</h3>
          <select
            value={moduloExistenteId}
            onChange={(e) => setModuloExistenteId(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:outline-none"
          >
            <option value="">Selecciona un módulo</option>
            {categorias.map((cat) => (
              <optgroup key={cat.id} label={cat.nombre}>
                {modulos
                  .filter((m) => m.categoria_id === cat.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <select
            value={critTipoComponente}
            onChange={(e) => setCritTipoComponente(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:outline-none"
          >
            {TIPOS_COMPONENTE.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <input
              value={critCodigo2}
              onChange={(e) => setCritCodigo2(e.target.value)}
              placeholder="Código"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
            />
            <input
              value={critNombre2}
              onChange={(e) => setCritNombre2(e.target.value)}
              placeholder="Nombre del criterio"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
            />
          </div>
          <textarea
            value={critEvidencia2}
            onChange={(e) => setCritEvidencia2(e.target.value)}
            placeholder="Evidencia sugerida (qué debería buscar el auditor)"
            rows={2}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
          />
          <textarea
            value={critAfirmacion2}
            onChange={(e) => setCritAfirmacion2(e.target.value)}
            placeholder="Pregunta guía para entrevista"
            rows={2}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={saving2}
            className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {saving2 ? "Guardando…" : "+ Agregar Criterio"}
          </button>
        </form>
      </div>

      <div className="max-h-[40rem] overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Árbol del Modelo de Referencia</h3>
        {categorias.map((cat) => (
          <div key={cat.id} className="mb-3">
            <p className="text-xs font-bold uppercase text-orange-400">{cat.nombre}</p>
            {modulos
              .filter((m) => m.categoria_id === cat.id)
              .map((mod) => (
                <div key={mod.id} className="ml-3 mt-1.5">
                  <p className="text-xs font-semibold text-slate-800">
                    ↳ {mod.nombre}{" "}
                    <span className="font-normal text-slate-400">
                      ({criterios.filter((c) => c.modulo_id === mod.id).length} criterios)
                    </span>
                  </p>
                  {TIPOS_COMPONENTE.map((tipo) => {
                    const items = criterios.filter((c) => c.modulo_id === mod.id && c.tipo_componente === tipo.value);
                    if (items.length === 0) return null;
                    return (
                      <div key={tipo.value} className="ml-5 mt-1">
                        <p className="text-[10px] font-bold uppercase text-slate-400">{tipo.label}</p>
                        {items.map((c) => (
                          <p key={c.id} className="ml-2 text-[11px] text-slate-500">
                            • {c.codigo ? `${c.codigo} — ` : ""}
                            {c.nombre}
                          </p>
                        ))}
                      </div>
                    );
                  })}
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

function UsuariosPanel({ usuarios, setUsuarios, clientes }) {
  const ROLES = ["Auditor Líder", "Consultor Capturista"];
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState(ROLES[0]);
  const [tipoUsuario, setTipoUsuario] = useState("Consultor");
  const [clienteId, setClienteId] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("usuarios")
      .insert([
        {
          nombre,
          rol,
          tipo_usuario: tipoUsuario,
          cliente_id: tipoUsuario === "Cliente" ? clienteId || null : null,
        },
      ])
      .select();
    setSaving(false);
    if (error) return console.error(error);
    setUsuarios((prev) => [...prev, data[0]]);
    setNombre("");
    setClienteId("");
  };

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6">
      <h3 className="text-sm font-semibold text-slate-900">Catálogo de Usuarios</h3>
      <p className="text-xs text-slate-500">
        El rol <strong className="text-slate-700">Auditor Líder</strong> es el único habilitado para fijar el
        dictamen final. <strong className="text-slate-700">Consultor Capturista</strong> únicamente registra
        evidencia. El <strong className="text-slate-700">tipo de usuario</strong> controla qué módulos de
        navegación ve cada persona.
      </p>
      <form onSubmit={handleCreate} className="grid gap-2 sm:grid-cols-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del usuario"
          className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
        />
        <select
          value={tipoUsuario}
          onChange={(e) => setTipoUsuario(e.target.value)}
          className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:outline-none"
        >
          {TIPOS_USUARIO.map((t) => (
            <option key={t} value={t}>
              Tipo: {t}
            </option>
          ))}
        </select>
        <select
          value={rol}
          onChange={(e) => setRol(e.target.value)}
          className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:outline-none"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              Rol auditoría: {r}
            </option>
          ))}
        </select>
        {tipoUsuario === "Cliente" ? (
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:outline-none"
          >
            <option value="">Vincular a cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        ) : (
          <div />
        )}
        <button
          disabled={saving}
          className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-orange-400 disabled:opacity-50 sm:col-span-2"
        >
          Añadir Usuario
        </button>
      </form>
      <ul className="space-y-1.5">
        {usuarios.map((u) => (
          <li
            key={u.id}
            className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-800"
          >
            <span>
              {u.nombre}
              {u.tipo_usuario === "Cliente" && u.cliente_id && (
                <span className="ml-2 text-[11px] text-slate-400">
                  ({clientes.find((c) => c.id === u.cliente_id)?.nombre || "—"})
                </span>
              )}
            </span>
            <span className="flex gap-1.5">
              <span className="rounded-full bg-orange-100 px-3 py-1 text-[11px] text-orange-700">
                {u.tipo_usuario || "Consultor"}
              </span>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-[11px] text-slate-700">{u.rol}</span>
            </span>
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
