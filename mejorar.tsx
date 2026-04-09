 return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100"
      style={{ fontFamily: "'Instrument Sans', 'SF Pro Display', system-ui, sans-serif" }}>

      {/* ══ HEADER ══ */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-zinc-950/80 border-b border-zinc-800/60">
        <div className="max-w-400 mx-auto px-6 h-14 flex items-center justify-between">
          {/* Izquierda: Logo + Back */}
          <div className="flex items-center gap-4">
            {view === "detail" && (
              <button onClick={goBack}
                className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors text-zinc-400 hover:text-white">
                ‹
              </button>
            )}
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-lg font-black tracking-[3px] text-white leading-none">FAMA</h1>
                <p className="text-[8px] font-semibold tracking-[4px] uppercase text-red-500">Dashboard</p>
              </div>
              <div className="h-6 w-px bg-zinc-800 mx-1" />
              <span className="text-xs font-semibold text-zinc-500">
                {empresas.length} empresa{empresas.length !== 1 && "s"}
              </span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800">
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
                <span className="text-[10px] text-zinc-500 font-medium">
                  {connected ? "En línea" : "Sin conexión"}
                </span>
              </div>
            </div>
          </div>

          {/* Derecha: Usuario + Navegación */}
          <div className="flex items-center gap-2">
            {user.role === "boss" && (
              <button onClick={openUsersModal}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-500 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors">
                👥 Usuarios
              </button>
            )}

            {(user.role === "boss" || user.role === "admin") && (
              <button onClick={openArchivedView}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-500 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors">
                🗂️ Archivados
              </button>
            )}
            <a href="/app"
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-500 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors">
              🧯 Trabajadores
            </a>
            <div className="h-6 w-px bg-zinc-800 mx-1" />
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-[11px] font-semibold text-zinc-300 leading-none">{user.displayName}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5 leading-none" style={{
                  color: user.role === "boss" ? "#f87171" : "#fbbf24"
                }}>{user.role}</p>
              </div>
              <button onClick={onLogout}
                className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-red-950 border border-zinc-800 hover:border-red-800 flex items-center justify-center text-zinc-500 hover:text-red-400 transition-colors text-xs"
                title="Cerrar sesión">
                ⏻
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-400 mx-auto px-6 py-6">
        {/* ══════════════════════════════════
            VISTA: LISTA DE EMPRESAS
            ══════════════════════════════════ */}
        {view === "list" && (
          <div>
            {/* Search bar */}
            <div className="mb-6 flex flex-wrap items-end gap-3">
              <div className="relative flex-1 min-w-50 max-w-md">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar empresa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-red-700 transition-colors"
                />
              </div>
              <select
                value={fMonth}
                onChange={(e) => setFMonth(e.target.value)}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold border bg-zinc-900 focus:outline-none transition-colors ${fMonth ? "border-red-700 text-red-400" : "border-zinc-800 text-zinc-400"}`}
              >
                <option value="">Mes: Todos</option>
                {MESES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select
                value={fYear}
                onChange={(e) => setFYear(e.target.value)}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold border bg-zinc-900 focus:outline-none transition-colors ${fYear ? "border-red-700 text-red-400" : "border-zinc-800 text-zinc-400"}`}
              >
                <option value="">Año: Todos</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              {(search || fMonth || fYear) && (
                <button
                  onClick={() => { setSearch(""); setFMonth(""); setFYear(""); }}
                  className="px-3 py-2.5 rounded-xl text-[11px] font-bold text-red-400 hover:text-red-300 bg-red-950/40 border border-red-900/60 transition-colors"
                >
                  ✕ Limpiar
                </button>
              )}

              <button
                onClick={openCreateEmpresa}
                className="px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white transition-colors ml-auto"
              >
                + Nueva Empresa
              </button>
            </div>

            {/* Grid de empresas */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20 text-zinc-600">
                <span className="text-5xl">🏢</span>
                <p className="text-sm">
                  {search
                    ? "No se encontraron empresas"
                    : "No hay empresas registradas"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => openEmpresa(emp)}
                    className="group text-left bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/60 hover:border-zinc-700 rounded-2xl p-4 transition-all duration-200"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <p className="font-bold text-zinc-100 text-sm truncate group-hover:text-white transition-colors flex-1">
                        {emp.razonSocial}
                      </p>
                      <span className="text-zinc-700 group-hover:text-zinc-400 text-lg transition-colors shrink-0">→</span>
                    </div>
                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                      <span className="text-zinc-600">RUC</span>
                      <span className="text-zinc-400 text-right truncate">{emp.ruc || "—"}</span>
                      <span className="text-zinc-600">Distrito</span>
                      <span className="text-zinc-400 text-right truncate">{emp.distrito || "—"}</span>
                      <span className="text-zinc-600">Solicitante</span>
                      <span className="text-zinc-400 text-right truncate">{emp.nombresApellidos || "—"}</span>
                      <span className="text-zinc-600">Celular</span>
                      <span className="text-zinc-400 text-right truncate">{emp.celular || "—"}</span>
                    </div>
                    {/* Fechas */}
                    <div className="flex items-center gap-3 mt-3 pt-2 border-t border-zinc-800/60 text-[10px]">
                      <div className="flex-1">
                        <span className="text-zinc-600">Retiro: </span>
                        <span className="text-zinc-400">{emp.fechaRetiro ? emp.fechaRetiro.split("-").reverse().join("/") : "—"}</span>
                      </div>
                      <div className="flex-1 text-right">
                        <span className="text-zinc-600">Entrega: </span>
                        <span className="text-zinc-400">{emp.fechaEntrega ? emp.fechaEntrega.split("-").reverse().join("/") : "—"}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════
            VISTA: DETALLE DE EMPRESA
            ══════════════════════════════════ */}
        {view === "detail" && (
          <div>
            {loadingDetail || !selectedEmpresa ? (
              <div className="flex flex-col items-center gap-3 py-20 text-zinc-500">
                <div className="w-8 h-8 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin" />
                <p className="text-sm">Cargando datos...</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* ── Info de la empresa ── */}
                <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl overflow-hidden">
                  {/* Encabezado */}
                  <div className="px-6 py-5 border-b border-zinc-800/60 flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-black text-white">
                        {selectedEmpresa.razonSocial}
                      </h2>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={openEditEmpresa}
                        className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-300 hover:text-white transition-colors border border-zinc-700"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => { setDuplicateWithExt(false); setDuplicateModal(true); }}
                        className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-semibold text-zinc-300 hover:text-white transition-colors border border-zinc-700"
                      >
                        📋 Duplicar
                      </button>
                      {(user.role === "admin" || user.role === "boss") && (
                        <button
                          onClick={() => { setDeleteConfirmText(""); setDeleteModal(true); }}
                          className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-red-900 text-sm font-semibold text-zinc-300 hover:text-red-400 transition-colors border border-zinc-700 hover:border-red-700"
                        >
                          🗑️ Archivar
                        </button>
                      )}
                      <button
                        onClick={exportExcel}
                        disabled={exporting}
                        className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-sm font-semibold text-emerald-200 hover:text-white transition-colors border border-emerald-700 disabled:opacity-50"
                      >
                        {exporting ? "⏳ Generando..." : "📥 Descargar Excel"}
                      </button>

                      {selectedEmpresa.celular && (
                        <button
                          onClick={openWhatsappModal}
                          className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-sm font-semibold text-white transition-colors border border-emerald-600"
                        >
                          📲 WhatsApp
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Datos en grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-800/60">
                    <InfoSection title="🏢 Empresa">
                      <InfoRow label="Dirección" value={selectedEmpresa.direccion} />
                      <InfoRow label="Distrito" value={selectedEmpresa.distrito} />
                      <InfoRow label="RUC" value={selectedEmpresa.ruc} />
                    </InfoSection>
                    <InfoSection title="👤 Solicitante">
                      <InfoRow label="Nombre" value={selectedEmpresa.nombresApellidos} />
                      <InfoRow label="Celular" value={selectedEmpresa.celular} />
                      <InfoRow label="OT" value={selectedEmpresa.nOrdenTrabajo} />
                    </InfoSection>
                    <InfoSection title="📅 Fechas">
                      <InfoRow label="Retiro" value={selectedEmpresa.fechaRetiro} />
                      <InfoRow label="Entrega" value={selectedEmpresa.fechaEntrega} />
                    </InfoSection>
                  </div>
                </div>

                {/* ── Toggle métricas ── */}
                <button
                  onClick={() => setShowMetrics((p) => !p)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 hover:border-zinc-700 text-sm font-semibold text-zinc-400 hover:text-white transition-colors w-fit"
                >
                  <span className="text-xs">{showMetrics ? "▼" : "▶"}</span>
                  {showMetrics ? "Ocultar métricas" : "Mostrar métricas"}
                </button>

                {/* ── Métricas ── */}
                {showMetrics && (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <MetricPanel title="Estado" data={estadoCounts} total={totalExtintores} accent />
                      <MetricPanel title="Marcas" data={marcaCounts} total={totalExtintores} />
                      <MetricPanel title="Agentes" data={agenteCounts} total={totalExtintores} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <MetricPanel title="Pesos" data={pesoEntries} total={totalExtintores} />
                      <MetricPanel title="Servicios" data={Object.entries(serviceCounts)} total={totalExtintores} />
                      <MetricPanel title="Componentes Nuevos" data={Object.entries(compCounts).map(([k, v]) => [COMP_LABELS[k] || k, v] as [string, number])} total={totalExtintores} />
                    </div>
                  </>
                )}

                {/* ── Tabla de extintores ── */}
                <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-800/60">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-zinc-200">
                        🧯 Extintores ({hasFilters ? `${filteredExt.length} de ${totalExtintores}` : totalExtintores})
                      </h3>
                      <button
                        onClick={openAddExtintor}
                        className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white transition-colors"
                      >
                        + Agregar
                      </button>
                    </div>
                    {/* Filtros */}
                    <div className="flex flex-wrap gap-2 items-center">
                      <FilterSelect label="Marca" value={fMarca} onChange={setFMarca}
                        options={marcaCounts.map(([v]) => v)} />
                      <FilterSelect label="Agente" value={fAgente} onChange={setFAgente}
                        options={agenteCounts.map(([v]) => v)} />
                      <FilterSelect label="Estado" value={fEstado} onChange={setFEstado}
                        options={estadoCounts.map(([v]) => v)} />
                      <FilterSelect label="Servicio" value={fServicio} onChange={setFServicio}
                        options={["MA", "RE", "PH"]} />
                      <FilterSelect label="Comp. Nuevo" value={fComponente} onChange={setFComponente}
                        options={[
                          { value: "valvula", label: "Válvula" },
                          { value: "manguera", label: "Manguera" },
                          { value: "manometro", label: "Manómetro" },
                          { value: "tobera", label: "Tobera" },
                        ]} />
                      {hasFilters && (
                        <button
                          onClick={() => { setFMarca(""); setFAgente(""); setFEstado(""); setFServicio(""); setFComponente(""); }}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-red-400 hover:text-red-300 bg-red-950/40 border border-red-900/60 hover:border-red-800 transition-colors"
                        >
                          ✕ Limpiar filtros
                        </button>
                      )}
                    </div>
                  </div>

                  {filteredExt.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-zinc-600">
                      <span className="text-4xl">🧯</span>
                      <p className="text-sm">{hasFilters ? "Sin resultados para estos filtros" : "Sin extintores registrados"}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-[11px] uppercase tracking-wider text-zinc-500 bg-zinc-900/80">
                            <th className="px-4 py-3 font-semibold">#</th>
                            <th className="px-4 py-3 font-semibold">N° Serie</th>
                            <th className="px-4 py-3 font-semibold">N° Interno</th>
                            <th className="px-4 py-3 font-semibold">Marca</th>
                            <th className="px-4 py-3 font-semibold">Agente</th>
                            <th className="px-4 py-3 font-semibold">Peso</th>
                            <th className="px-4 py-3 font-semibold">Estado</th>
                            <th className="px-4 py-3 font-semibold">Fab.</th>
                            <th className="px-4 py-3 font-semibold">PH Realiz.</th>
                            <th className="px-4 py-3 font-semibold">PH Venc.</th>
                            <th className="px-4 py-3 font-semibold">Servicio</th>
                            <th className="px-4 py-3 font-semibold">Comp. Nuevos</th>
                            <th className="px-4 py-3 font-semibold">Observaciones</th>
                            <th className="px-4 py-3 font-semibold">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/40">
                          {filteredExt.map((ext, i) => {
                            const badges = serviceBadge(ext.ma, ext.recarga, ext.ph);
                            return (
                              <tr
                                key={ext.rowIndex}
                                className={`hover:bg-zinc-800/30 transition-colors ${i % 2 === 0 ? "bg-transparent" : "bg-zinc-900/30"}`}
                              >
                                <td className="px-4 py-3 text-red-500 font-black">
                                  {i + 1}
                                </td>
                                <td className="px-4 py-3 font-medium text-zinc-200">
                                  {ext.nSerie || "—"}
                                </td>
                                <td className="px-4 py-3 text-zinc-400">
                                  {ext.nInterno || "—"}
                                </td>
                                <td className="px-4 py-3 text-zinc-300">
                                  {ext.marca || "—"}
                                </td>
                                <td className="px-4 py-3 text-zinc-300">
                                  {ext.agenteExtintor || "—"}
                                </td>
                                <td className="px-4 py-3 text-zinc-300 whitespace-nowrap">
                                  {ext.peso
                                    ? `${ext.peso} ${ext.unidadPeso}`
                                    : "—"}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${estadoColor[ext.estadoExtintor] || "bg-zinc-800 text-zinc-400 border-zinc-700"}`}
                                  >
                                    {ext.estadoExtintor || "—"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-zinc-400 text-xs">
                                  {ext.fechaFabricacion || "—"}
                                </td>
                                <td className="px-4 py-3 text-zinc-400 text-xs">
                                  {ext.realizadoPH || "—"}
                                </td>
                                <td className="px-4 py-3 text-zinc-400 text-xs">
                                  {ext.vencimPH || "—"}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-1 flex-wrap">
                                    {badges.length > 0
                                      ? badges.map((b) => (
                                        <span
                                          key={b.label}
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${b.cls}`}
                                        >
                                          {b.label}
                                        </span>
                                      ))
                                      : <span className="text-zinc-600">—</span>}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <ComponentDots ext={ext} />
                                </td>
                                <td className="px-4 py-3 text-xs max-w-50">
                                  {ext.observaciones ? (
                                    <button
                                      onClick={() => setObsModal(ext.observaciones)}
                                      className="text-left truncate block text-zinc-400 hover:text-zinc-200 transition-colors underline decoration-dotted underline-offset-2 cursor-pointer w-full"
                                      title="Click para ver completo"
                                    >
                                      {ext.observaciones}
                                    </button>
                                  ) : (
                                    <span className="text-zinc-600">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => openEditExtintor(ext)}
                                      className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs flex items-center justify-center border border-zinc-700 transition-colors"
                                      title="Editar"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => deleteExtintor(ext.rowIndex)}
                                      className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-red-900 text-xs flex items-center justify-center border border-zinc-700 hover:border-red-700 transition-colors"
                                      title="Eliminar"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="h-16" />
              </div>

            )}
          </div>
        )}

        {/* ══ MODAL: EDITAR EMPRESA ══ */}
        {editingEmpresa && empresaForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Editar Empresa</h3>
                <button onClick={() => setEditingEmpresa(false)} className="text-zinc-500 hover:text-white text-xl">✕</button>
              </div>
              <div className="px-6 py-5 grid grid-cols-2 gap-x-4 gap-y-3">
                <ModalField label="Razón Social" full>
                  <input className={modalInput} value={empresaForm!.razonSocial}
                    onChange={(e) => setEmpresaForm((p) => p ? { ...p, razonSocial: e.target.value } : p)} />
                </ModalField>

                <ModalField label="Dirección">
                  <input className={modalInput} value={empresaForm!.direccion}
                    onChange={(e) => setEmpresaForm((p) => p ? { ...p, direccion: e.target.value } : p)} />
                </ModalField>
                <ModalField label="Distrito">
                  <select className={modalInput} value={empresaForm!.distrito || ""}
                    onChange={(e) => setEmpresaForm((p) => p ? { ...p, distrito: e.target.value } : p)}>
                    <option value="">Seleccionar distrito...</option>
                    {DISTRITOS_LIMA.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </ModalField>

                <ModalField label="Nombres y Apellidos">
                  <input className={modalInput} value={empresaForm!.nombresApellidos}
                    onChange={(e) => setEmpresaForm((p) => p ? { ...p, nombresApellidos: e.target.value } : p)} />
                </ModalField>
                <ModalField label="Celular">
                  <input className={modalInput} value={empresaForm!.celular} inputMode="tel"
                    onChange={(e) => setEmpresaForm((p) => p ? { ...p, celular: e.target.value } : p)} />
                </ModalField>

                <ModalField label="N° Orden de Trabajo">
                  <input className={modalInput} value={empresaForm!.nOrdenTrabajo}
                    onChange={(e) => setEmpresaForm((p) => p ? { ...p, nOrdenTrabajo: e.target.value } : p)} />
                </ModalField>
                <ModalField label="RUC">
                  <input
                    className={`w-full bg-zinc-800 border rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none transition-colors ${empresaForm!.ruc.length > 0 && empresaForm!.ruc.length !== 11
                      ? "border-red-500 focus:border-red-500"
                      : "border-zinc-700 focus:border-red-600"
                      }`}
                    value={empresaForm!.ruc}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 11);
                      setEmpresaForm((p) => p ? { ...p, ruc: v } : p);
                    }}
                    placeholder="20xxxxxxxxx" inputMode="numeric" maxLength={11}
                  />
                  <span className={`text-[10px] text-right ${empresaForm!.ruc.length === 11 ? "text-emerald-500" : "text-zinc-500"}`}>
                    {empresaForm!.ruc.length}/11 {empresaForm!.ruc.length === 11 && "✓"}
                  </span>
                </ModalField>

                <ModalField label="Fecha de Retiro">
                  <input type="date" className={modalInput} value={empresaForm!.fechaRetiro}
                    onChange={(e) => setEmpresaForm((p) => p ? { ...p, fechaRetiro: e.target.value } : p)} />
                </ModalField>
                <ModalField label="Fecha de Entrega">
                  <input type="date" className={modalInput} value={empresaForm!.fechaEntrega}
                    onChange={(e) => setEmpresaForm((p) => p ? { ...p, fechaEntrega: e.target.value } : p)} />
                </ModalField>
              </div>
              <div className="px-6 py-4 border-t border-zinc-800 flex gap-3 justify-end">
                <button onClick={() => setEditingEmpresa(false)} className="px-4 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
                  Cancelar
                </button>
                <button onClick={saveEmpresa} disabled={saving || (empresaForm!.ruc.length > 0 && empresaForm!.ruc.length !== 11)} className="px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white disabled:opacity-50 transition-colors">
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ MODAL: EDITAR/AGREGAR EXTINTOR ══ */}
        {extintorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">
                  {editingRowIndex !== null ? "Editar Extintor" : "Nuevo Extintor"}
                </h3>
                <button onClick={() => setExtintorModal(false)} className="text-zinc-500 hover:text-white text-xl">✕</button>
              </div>
              <div className="px-6 py-5 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
                {/* ── Sección: Datos Principales ── */}
                <ModalSection title="🧯 Datos Principales">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <ModalField label="N° Serie">
                      <input className={modalInput} value={extintorForm.nSerie || ""} onChange={(e) => setEF("nSerie", e.target.value)} placeholder="Serie del extintor" />
                    </ModalField>
                    <ModalField label="N° Interno">
                      <input className={modalInput} value={extintorForm.nInterno || ""} onChange={(e) => setEF("nInterno", e.target.value)} placeholder="Número interno" />
                    </ModalField>
                    <ModalField label="Marca">
                      <select className={modalInput} value={extintorForm.marca || ""} onChange={(e) => setEF("marca", e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {MARCAS.map((m) => <option key={m}>{m}</option>)}
                      </select>
                    </ModalField>
                    <ModalField label="Año de Fabricación">
                      <input className={modalInput} value={extintorForm.fechaFabricacion || ""} onChange={(e) => setEF("fechaFabricacion", e.target.value)} inputMode="numeric" maxLength={4} placeholder="Ej: 2020" />
                    </ModalField>
                  </div>
                </ModalSection>

                {/* ── Sección: Prueba Hidrostática ── */}
                <ModalSection title="🔬 Prueba Hidrostática">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <ModalField label="Año Realizado PH">
                      <input className={modalInput} value={extintorForm.realizadoPH || ""} onChange={(e) => setEF("realizadoPH", e.target.value)} inputMode="numeric" maxLength={4} placeholder="Ej: 2024" />
                    </ModalField>
                    <ModalField label="Vencimiento PH (auto +5)">
                      <input className={`${modalInput} opacity-60`} value={extintorForm.vencimPH || ""} onChange={(e) => setEF("vencimPH", e.target.value)} inputMode="numeric" maxLength={4} placeholder="Calculado automáticamente" />
                    </ModalField>
                  </div>
                </ModalSection>

                {/* ── Sección: Características ── */}
                <ModalSection title="⚗️ Características">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <ModalField label="Estado del Extintor">
                      <select className={modalInput} value={extintorForm.estadoExtintor || ""} onChange={(e) => setEF("estadoExtintor", e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {ESTADOS.map((es) => <option key={es}>{es}</option>)}
                      </select>
                    </ModalField>
                    <ModalField label="Agente Extintor (Tipo)">
                      <select className={modalInput} value={extintorForm.agenteExtintor || ""} onChange={(e) => setEF("agenteExtintor", e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {AGENTES.map((a) => <option key={a}>{a}</option>)}
                      </select>
                    </ModalField>
                    <ModalField label="Unidad">
                      <div className="flex rounded-xl overflow-hidden border border-zinc-700">
                        {(["KG", "LB"] as const).map((u) => (
                          <button key={u} type="button" onClick={() => { setEF("unidadPeso", u); setEF("peso", ""); }}
                            className={`flex-1 py-2.5 text-sm font-bold transition-colors ${extintorForm.unidadPeso === u ? "bg-red-700 text-white" : "bg-zinc-800 text-zinc-400"}`}>
                            {u}
                          </button>
                        ))}
                      </div>
                    </ModalField>
                    <ModalField label="Peso">
                      <select className={modalInput} value={extintorForm.peso || ""} onChange={(e) => setEF("peso", e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {(extintorForm.unidadPeso === "LB" ? PESOS_LB : PESOS_KG).map((p) => (
                          <option key={p} value={p}>{p} {extintorForm.unidadPeso || "KG"}</option>
                        ))}
                      </select>
                    </ModalField>
                  </div>
                </ModalSection>

                {/* ── Sección: Servicio Realizado ── */}
                <ModalSection title="🔧 Servicio Realizado">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <ModalField label="Tipo de Servicio">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setEF("ma", extintorForm.ma === "SI" ? "" : "SI")}
                          className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-colors ${extintorForm.ma === "SI" ? "bg-red-700 border-red-600 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-400"}`}>
                          MA — Mantenimiento
                        </button>
                        <button type="button" onClick={() => setEF("ph", extintorForm.ph === "SI" ? "" : "SI")}
                          className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-colors ${extintorForm.ph === "SI" ? "bg-blue-700 border-blue-600 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-400"}`}>
                          PH — Prueba Hidrostática
                        </button>
                      </div>
                    </ModalField>
                    <ModalField label="Recarga">
                      <div className="flex flex-col gap-1.5">
                        {RECARGAS.map((r) => {
                          const selected = extintorForm.recarga === r;
                          return (
                            <button key={r} type="button" onClick={() => setEF("recarga", selected ? "" : r)}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${selected ? "bg-amber-600 border-amber-500 text-white" : "bg-zinc-800 border-zinc-700 text-zinc-400"}`}>
                              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[8px] shrink-0 ${selected ? "bg-white border-white text-amber-600" : "border-zinc-600"}`}>
                                {selected ? "●" : ""}
                              </span>
                              RE — {r}
                            </button>
                          );
                        })}
                      </div>
                    </ModalField>
                  </div>
                </ModalSection>

                {/* ── Sección: Componentes Nuevos ── */}
                <ModalSection title="🔩 Componentes Nuevos">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {COMP_KEYS.map((k) => {
                      const checked = (extintorForm as any)[k] === "SI";
                      return (
                        <button key={k} type="button" onClick={() => setEF(k, checked ? "" : "SI")}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all ${checked ? "bg-emerald-900/40 border-emerald-700 text-emerald-400" : "bg-zinc-800 border-zinc-700 text-zinc-500"}`}>
                          <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center text-xs font-bold shrink-0 ${checked ? "bg-emerald-600 border-emerald-600 text-white" : "border-zinc-600"}`}>
                            {checked ? "✓" : ""}
                          </span>
                          <span className="text-xs font-semibold">{COMP_LABELS[k]}</span>
                        </button>
                      );
                    })}
                  </div>
                </ModalSection>

                {/* ── Sección: Observaciones ── */}
                <ModalSection title="📝 Observaciones">
                  <textarea className={`${modalInput} resize-none`} value={extintorForm.observaciones || ""} onChange={(e) => setEF("observaciones", e.target.value)} rows={3} placeholder="Notas adicionales..." />
                </ModalSection>
              </div>

              <div className="px-6 py-4 border-t border-zinc-800 flex gap-3 justify-end">
                <button onClick={() => setExtintorModal(false)} className="px-4 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
                  Cancelar
                </button>
                <button onClick={saveExtintor} disabled={saving} className="px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white disabled:opacity-50 transition-colors">
                  {saving ? "Guardando..." : editingRowIndex !== null ? "Actualizar" : "Agregar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {duplicateModal && selectedEmpresa && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h3 className="text-lg font-bold text-white">Duplicar Empresa</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Se creará una copia de "{selectedEmpresa.razonSocial}"
                </p>
              </div>
              <div className="px-6 py-5 flex flex-col gap-3">
                <p className="text-sm text-zinc-400">¿Qué deseas copiar?</p>
                <button
                  type="button"
                  onClick={() => setDuplicateWithExt(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${!duplicateWithExt ? "bg-red-950/40 border-red-700 text-red-400" : "bg-zinc-800 border-zinc-700 text-zinc-400"}`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 ${!duplicateWithExt ? "bg-red-600 border-red-600" : "border-zinc-600"}`} />
                  Solo datos de empresa
                </button>
                <button
                  type="button"
                  onClick={() => setDuplicateWithExt(true)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${duplicateWithExt ? "bg-red-950/40 border-red-700 text-red-400" : "bg-zinc-800 border-zinc-700 text-zinc-400"}`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 ${duplicateWithExt ? "bg-red-600 border-red-600" : "border-zinc-600"}`} />
                  Empresa + extintores
                </button>
              </div>
              <div className="px-6 py-4 border-t border-zinc-800 flex gap-3 justify-end">
                <button onClick={() => setDuplicateModal(false)} className="px-4 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
                  Cancelar
                </button>
                <button onClick={duplicateEmpresa} disabled={saving} className="px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white disabled:opacity-50 transition-colors">
                  {saving ? "Duplicando..." : "Duplicar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ MODAL: ARCHIVAR EMPRESA ══ */}
        {deleteModal && selectedEmpresa && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-red-900/60 rounded-2xl w-full max-w-sm">
              <div className="px-6 py-4 border-b border-zinc-800">
                <h3 className="text-lg font-bold text-red-400">
                  🗂️ Archivar Empresa
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  La empresa se archivará y podrá ser restaurada desde el panel de Archivados.
                </p>
              </div>
              <div className="px-6 py-5 flex flex-col gap-3">
                <p className="text-sm text-zinc-400">¿Estás seguro de archivar esta empresa?</p>
              </div>
              <div className="px-6 py-4 border-t border-zinc-800 flex gap-3 justify-end">
                <button onClick={() => setDeleteModal(false)} className="px-4 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteEmpresa}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white disabled:opacity-50 transition-colors"
                >
                  {saving ? "Procesando..." : "Archivar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ MODAL: WHATSAPP ══ */}
        {whatsappModal && selectedEmpresa && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">📲 Enviar por WhatsApp</h3>
                <button onClick={() => setWhatsappModal(false)} className="text-zinc-500 hover:text-white text-xl">✕</button>
              </div>

              <div className="px-6 py-5 flex flex-col gap-4">
                {/* Destinatario */}
                <div className="flex items-center gap-3 px-4 py-3 bg-zinc-800 rounded-xl border border-zinc-700">
                  <span className="text-xl">👤</span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">{selectedEmpresa.nombresApellidos || "Sin nombre"}</p>
                    <p className="text-xs text-zinc-500">{selectedEmpresa.celular}</p>
                  </div>
                </div>

                {/* Formato de archivo */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Formato del archivo</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWhatsappFormat("excel")}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${whatsappFormat === "excel"
                        ? "bg-emerald-900/40 border-emerald-700 text-emerald-400"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400"
                        }`}
                    >
                      <span className="text-lg">📊</span> Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => setWhatsappFormat("pdf")}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${whatsappFormat === "pdf"
                        ? "bg-red-900/40 border-red-700 text-red-400"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400"
                        }`}
                    >
                      <span className="text-lg">📄</span> PDF
                    </button>
                  </div>
                </div>

                {/* Mensaje editable */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Mensaje</label>
                  <textarea
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-600 transition-colors resize-none"
                    value={whatsappMsg}
                    onChange={(e) => setWhatsappMsg(e.target.value)}
                    rows={5}
                  />
                  <p className="text-[10px] text-zinc-600 text-right">{whatsappMsg.length} caracteres</p>
                </div>

                {/* Info */}
                <div className="flex items-start gap-2 px-3 py-2 bg-zinc-800/50 rounded-xl border border-zinc-800">
                  <span className="text-xs mt-0.5">ℹ️</span>
                  <p className="text-[11px] text-zinc-500">
                    Se descargará el archivo {whatsappFormat === "excel" ? "Excel" : "PDF"} y se abrirá WhatsApp con el mensaje. Adjunta el archivo descargado a la conversación.
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-zinc-800 flex gap-3 justify-end">
                <button
                  onClick={() => setWhatsappModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeWhatsapp}
                  disabled={exporting || !whatsappMsg.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-sm font-bold text-white disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {exporting ? "⏳ Generando..." : "📲 Descargar y Enviar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ MODAL: OBSERVACIONES ══ */}
        {obsModal !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setObsModal(null)}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-300">📝 Observaciones</h3>
                <button onClick={() => setObsModal(null)} className="text-zinc-500 hover:text-white">✕</button>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{obsModal}</p>
              </div>
            </div>
          </div>
        )}

        {/* ══ MODAL: CREAR EMPRESA ══ */}
        {createEmpresaModal && empresaForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">🏢 Nueva Empresa</h3>
                <button onClick={() => setCreateEmpresaModal(false)} className="text-zinc-500 hover:text-white text-xl">✕</button>
              </div>
              <div className="px-6 py-5 grid grid-cols-2 gap-x-4 gap-y-3">
                <ModalField label="Razón Social" full>
                  <input className={modalInput} value={empresaForm.razonSocial}
                    onChange={(e) => setEmpresaForm((p) => p ? { ...p, razonSocial: e.target.value } : p)} placeholder="Nombre de la empresa" />
                </ModalField>
                <ModalField label="Dirección">
                  <input className={modalInput} value={empresaForm.direccion}
                    onChange={(e) => setEmpresaForm((p) => p ? { ...p, direccion: e.target.value } : p)} placeholder="Dirección completa" />
                </ModalField>
                <ModalField label="Distrito">
                  <select className={modalInput} value={empresaForm.distrito || ""}
                    onChange={(e) => setEmpresaForm((p) => p ? { ...p, distrito: e.target.value } : p)}>
                    <option value="">Seleccionar distrito...</option>
                    {DISTRITOS_LIMA.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </ModalField>
                <ModalField label="RUC">
                  <input
                    className={`w-full bg-zinc-800 border rounded-xl px-3 py-2.5 text-sm text-zinc-200 focus:outline-none transition-colors ${empresaForm.ruc.length > 0 && empresaForm.ruc.length !== 11
                      ? "border-red-500" : "border-zinc-700 focus:border-red-600"
                      }`}
                    value={empresaForm.ruc}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 11);
                      setEmpresaForm((p) => p ? { ...p, ruc: v } : p);
                    }}
                    placeholder="20xxxxxxxxx" inputMode="numeric" maxLength={11}
                  />
                  <span className={`text-[10px] text-right ${empresaForm.ruc.length === 11 ? "text-emerald-500" : "text-zinc-500"}`}>
                    {empresaForm.ruc.length}/11 {empresaForm.ruc.length === 11 && "✓"}
                  </span>
                </ModalField>
                <ModalField label="Nombres y Apellidos">
                  <input className={modalInput} value={empresaForm.nombresApellidos}
                    onChange={(e) => setEmpresaForm((p) => p ? { ...p, nombresApellidos: e.target.value } : p)} placeholder="Nombre completo" />
                </ModalField>
                <ModalField label="Celular">
                  <input className={modalInput} value={empresaForm.celular} inputMode="tel"
                    onChange={(e) => setEmpresaForm((p) => p ? { ...p, celular: e.target.value } : p)} placeholder="9xx xxx xxx" />
                </ModalField>
                <ModalField label="N° Orden de Trabajo">
                  <input className={modalInput} value={empresaForm.nOrdenTrabajo}
                    onChange={(e) => setEmpresaForm((p) => p ? { ...p, nOrdenTrabajo: e.target.value } : p)} placeholder="OT-0001" />
                </ModalField>
                <div /> {/* Spacer para mantener grid */}
                <ModalField label="Fecha de Retiro">
                  <input type="date" className={modalInput} value={empresaForm.fechaRetiro}
                    onChange={(e) => setEmpresaForm((p) => p ? { ...p, fechaRetiro: e.target.value } : p)} />
                </ModalField>
                <ModalField label="Fecha de Entrega">
                  <input type="date" className={modalInput} value={empresaForm.fechaEntrega}
                    onChange={(e) => setEmpresaForm((p) => p ? { ...p, fechaEntrega: e.target.value } : p)} />
                </ModalField>
              </div>
              <div className="px-6 py-4 border-t border-zinc-800 flex gap-3 justify-end">
                <button onClick={() => setCreateEmpresaModal(false)} className="px-4 py-2.5 rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={saveNewEmpresa}
                  disabled={saving || !empresaForm.razonSocial || (empresaForm.ruc.length > 0 && empresaForm.ruc.length !== 11)}
                  className="px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-sm font-bold text-white disabled:opacity-50 transition-colors"
                >
                  {saving ? "Guardando..." : "Crear Empresa"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ MODAL: GESTIÓN DE USUARIOS ══ */}
        {usersModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">👥 Gestión de Usuarios</h3>
                <button onClick={() => setUsersModal(false)} className="text-zinc-500 hover:text-white text-xl">✕</button>
              </div>

              {/* Formulario crear/editar */}
              <div className="px-6 py-4 border-b border-zinc-800/60 bg-zinc-900/80">
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-3">
                  {editingUserId ? "Editar Usuario" : "Nuevo Usuario"}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Usuario</label>
                    <input className={modalInput} value={userForm.username}
                      onChange={(e) => setUserForm((p) => ({ ...p, username: e.target.value }))}
                      placeholder="nombre de usuario" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                      {editingUserId ? "Nueva Contraseña (vacío = no cambiar)" : "Contraseña"}
                    </label>
                    <input type="password" className={modalInput} value={userForm.password}
                      onChange={(e) => setUserForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder={editingUserId ? "Dejar vacío para no cambiar" : "Contraseña"} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Nombre para mostrar</label>
                    <input className={modalInput} value={userForm.displayName}
                      onChange={(e) => setUserForm((p) => ({ ...p, displayName: e.target.value }))}
                      placeholder="Nombre completo" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Rol</label>
                    <select className={modalInput} value={userForm.role}
                      onChange={(e) => setUserForm((p) => ({ ...p, role: e.target.value }))}>
                      <option value="worker">Técnico — Aplicación móvil</option>
                      <option value="admin">Administrador — App + Panel de Control</option>
                    </select>
                  </div>
                </div>
                {userError && (
                  <p className="text-red-400 text-xs font-semibold bg-red-950/40 border border-red-900/60 rounded-xl px-3 py-2 mt-3">{userError}</p>
                )}
                <div className="flex gap-2 mt-3">
                  {editingUserId && (
                    <button onClick={() => { setEditingUserId(null); setUserForm({ username: "", password: "", displayName: "", role: "worker" }); }}
                      className="px-3 py-2 rounded-xl border border-zinc-700 text-xs font-semibold text-zinc-400 hover:text-white transition-colors">
                      Cancelar edición
                    </button>
                  )}
                  <button onClick={saveUser} disabled={savingUser}
                    className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-xs font-bold text-white disabled:opacity-50 transition-colors">
                    {savingUser ? "Guardando..." : editingUserId ? "Actualizar" : "Crear Usuario"}
                  </button>
                </div>
              </div>

              {/* Lista de usuarios */}
              <div className="px-6 py-4">
                <div className="divide-y divide-zinc-800/40">
                  {usersList.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-200">{u.displayName || u.username}</p>
                        <p className="text-[11px] text-zinc-500">@{u.username} · <span className={`font-bold ${u.role === "boss" ? "text-red-400" : u.role === "admin" ? "text-amber-400" : "text-zinc-400"}`}>{u.role}</span></p>
                      </div>
                      {u.role !== "boss" && (
                        <div className="flex gap-1">
                          <button onClick={() => startEditUser(u)}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-400 hover:text-white border border-zinc-700 transition-colors">
                            ✏️ Editar
                          </button>
                          <button onClick={() => deleteUser(u.id)}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-red-900 text-[11px] font-semibold text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-700 transition-colors">
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ MODAL: ARCHIVADOS (BOSS) ══ */}
        {archivedView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-white">🗂️ Elementos Archivados</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Restaurar o eliminar permanentemente
                  </p>
                </div>
                <button onClick={() => setArchivedView(false)} className="text-zinc-500 hover:text-white text-xl">✕</button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-zinc-800 shrink-0">
                <button
                  onClick={() => setArchivedTab("empresas")}
                  className={`flex-1 py-3 text-xs font-bold transition-colors border-b-2 ${archivedTab === "empresas"
                    ? "text-red-400 border-red-500"
                    : "text-zinc-500 border-transparent hover:text-zinc-300"
                    }`}
                >
                  🏢 Empresas ({archivedEmpresas.length})
                </button>
                <button
                  onClick={() => setArchivedTab("extintores")}
                  className={`flex-1 py-3 text-xs font-bold transition-colors border-b-2 ${archivedTab === "extintores"
                    ? "text-red-400 border-red-500"
                    : "text-zinc-500 border-transparent hover:text-zinc-300"
                    }`}
                >
                  🧯 Extintores ({archivedExtintores.length})
                </button>
              </div>

              {/* Contenido */}
              <div className="flex-1 overflow-y-auto p-4">
                {loadingArchived ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin" />
                  </div>
                ) : archivedTab === "empresas" ? (
                  archivedEmpresas.length === 0 ? (
                    <div className="text-center py-12 text-zinc-600">
                      <p className="text-4xl mb-2">🏢</p>
                      <p className="text-sm">No hay empresas archivadas</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {archivedEmpresas.map((emp: any) => (
                        <div key={emp.id} className="flex items-center gap-3 px-4 py-3 bg-zinc-800/50 border border-zinc-800 rounded-xl">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-200 truncate">{emp.razonSocial}</p>
                            <p className="text-[10px] text-zinc-500">
                              RUC: {emp.ruc || "—"} · {emp.distrito || "—"} · Archivado: {new Date(emp.deletedAt).toLocaleDateString("es-PE")}
                            </p>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button onClick={() => restoreEmpresa(emp.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-900/40 hover:bg-emerald-800/60 text-[11px] font-bold text-emerald-400 border border-emerald-800 transition-colors">
                              ♻️ Restaurar
                            </button>
                            {user.role === "boss" && (
                              <button onClick={() => hardDeleteEmpresa(emp.id)}
                                className="px-3 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-800/50 text-[11px] font-bold text-red-400 border border-red-800 transition-colors">
                                🗑️ Eliminar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  archivedExtintores.length === 0 ? (
                    <div className="text-center py-12 text-zinc-600">
                      <p className="text-4xl mb-2">🧯</p>
                      <p className="text-sm">No hay extintores archivados</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {Object.entries(
                        archivedExtintores.reduce((acc: any, ext: any) => {
                          const empId = ext.empresaId;
                          if (!acc[empId]) {
                            acc[empId] = { empresa: ext.empresa || { razonSocial: empId }, extintores: [] };
                          }
                          acc[empId].extintores.push(ext);
                          return acc;
                        }, {})
                      ).map(([empId, group]: [string, any]) => {
                        const isExpanded = expandedArchived[empId];
                        return (
                          <div key={empId} className="bg-zinc-800/40 border border-zinc-800 rounded-xl overflow-hidden">
                            {/* Cabecera del Acordeón */}
                            <button
                              onClick={() => setExpandedArchived((p) => ({ ...p, [empId]: !p[empId] }))}
                              className="w-full flex items-center justify-between px-4 py-3 bg-zinc-800/80 hover:bg-zinc-700/60 transition-colors text-left"
                            >
                              <div>
                                <p className="text-sm font-bold text-zinc-200">
                                  {group.empresa.razonSocial}{" "}
                                  <span className="text-zinc-500 font-normal ml-1">— {group.empresa.ruc || "Sin RUC"}</span>
                                </p>
                                <p className="text-[10px] text-zinc-400 mt-0.5">
                                  Retiro: {group.empresa.fechaRetiro ? group.empresa.fechaRetiro.split("-").reverse().join("/") : "—"} |{" "}
                                  Entrega: {group.empresa.fechaEntrega ? group.empresa.fechaEntrega.split("-").reverse().join("/") : "—"}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-zinc-500 bg-zinc-900/80 border border-zinc-700 px-2.5 py-1 rounded-md">
                                  {group.extintores.length} extintores
                                </span>
                                <span className="text-zinc-500 text-sm">{isExpanded ? "▲" : "▼"}</span>
                              </div>
                            </button>

                            {/* Contenido Desplegable (Tabla) */}
                            {isExpanded && (
                              <div className="overflow-x-auto border-t border-zinc-800">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-left text-[11px] uppercase tracking-wider text-zinc-500 bg-zinc-900/60">
                                      <th className="px-4 py-2 font-semibold">N° Serie</th>
                                      <th className="px-4 py-2 font-semibold">Marca</th>
                                      <th className="px-4 py-2 font-semibold">Agente</th>
                                      <th className="px-4 py-2 font-semibold">Estado</th>
                                      <th className="px-4 py-2 font-semibold">Archivado</th>
                                      <th className="px-4 py-2 font-semibold">Acciones</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-800/40">
                                    {group.extintores.map((ext: any) => (
                                      <tr key={ext.rowIndex} className="hover:bg-zinc-800/30">
                                        <td className="px-4 py-2.5 font-medium text-zinc-200">{ext.nSerie || "—"}</td>
                                        <td className="px-4 py-2.5 text-zinc-400">{ext.marca || "—"}</td>
                                        <td className="px-4 py-2.5 text-zinc-400">{ext.agenteExtintor || "—"}</td>
                                        <td className="px-4 py-2.5 text-zinc-400">{ext.estadoExtintor || "—"}</td>
                                        <td className="px-4 py-2.5 text-zinc-500 text-xs">
                                          {new Date(ext.deletedAt).toLocaleDateString("es-PE")}
                                        </td>
                                        <td className="px-4 py-2.5">
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => restoreExtintor(ext.rowIndex, ext.empresaId)}
                                              title="Restaurar"
                                              className="px-3 py-1.5 rounded-lg bg-emerald-900/40 hover:bg-emerald-800/60 text-[11px] font-bold text-emerald-400 border border-emerald-800 transition-colors"
                                            >
                                              ♻️ Restaurar
                                            </button>

                                            {user.role === "boss" && (
                                              <button
                                                onClick={() => hardDeleteExtintor(ext.rowIndex)}
                                                title="Eliminar permanentemente"
                                                className="px-3 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-800/50 text-[11px] font-bold text-red-400 border border-red-800 transition-colors"
                                              >
                                                🗑️ Eliminar
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Sub-componentes ── */

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-6 py-4 flex flex-col gap-2">
      <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">
        {title}
      </p>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-xs text-zinc-500 shrink-0">{label}</span>
      <span className="text-xs text-zinc-200 font-medium text-right truncate">
        {value || "—"}
      </span>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[] | { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold border transition-colors bg-zinc-900 focus:outline-none ${value
        ? "border-red-700 text-red-400"
        : "border-zinc-800 text-zinc-400"
        }`}
    >
      <option value="">{label}: Todos</option>
      {options.map((o) => {
        const val = typeof o === "string" ? o : o.value;
        const lbl = typeof o === "string" ? o : o.label;
        return <option key={val} value={val}>{lbl === "Sin definir" ? "⚠️ Sin definir" : lbl}</option>;
      })}
    </select>
  );
}

function MetricPanel({
  title,
  data,
  total,
  accent,
}: {
  title: string;
  data: [string, number][];
  total: number;
  accent?: boolean;
}) {
  if (data.length === 0) return null;

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl overflow-hidden">
      <div className={`px-4 py-3 border-b border-zinc-800/40 flex items-center justify-between ${accent ? "bg-red-950/20" : ""}`}>
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          {title}
        </span>
        {accent && (
          <span className="text-xs font-black text-red-400">{total} extintores en total</span>
        )}
      </div>
      <div className="divide-y divide-zinc-800/30">
        {data.map(([label, count]) => {
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={label} className="flex items-center gap-3 px-4 py-2.5 group hover:bg-zinc-800/20 transition-colors">
              <span className={`text-sm font-semibold flex-1 truncate flex items-center gap-1.5 ${label === "Sin definir" ? "text-amber-400" : "text-zinc-300"}`}>
                {label === "Sin definir" && <span className="text-amber-500 text-xs">⚠️</span>}
                {label}
              </span>
              <div className="w-24 h-1.5 rounded-full bg-zinc-800 overflow-hidden shrink-0 hidden sm:block">
                <div
                  className={`h-full rounded-full transition-all ${accent ? "bg-red-600" : "bg-zinc-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-sm font-black text-white w-8 text-right">
                {count}
              </span>
              <span className="text-[10px] text-zinc-600 w-10 text-right">
                {pct.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-bold text-red-500 uppercase tracking-widest border-b border-zinc-800/60 pb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function ModalField({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1 ${full ? "col-span-2" : ""}`}>
      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

function ComponentDots({ ext }: { ext: Extintor }) {
  const comps = [
    { key: "valvula", label: "Válvula" },
    { key: "manguera", label: "Manguera" },
    { key: "manometro", label: "Manómetro" },
    { key: "tobera", label: "Tobera" },
  ] as const;

  const activos = comps.filter((c) => ext[c.key] === "SI");

  if (activos.length === 0) return <span className="text-zinc-600">—</span>;

  return (
    <div className="flex gap-1 flex-wrap">
      {activos.map((c) => (
        <span
          key={c.key}
          className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-900/40 text-emerald-400 border-emerald-800"
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}