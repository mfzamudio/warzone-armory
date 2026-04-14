# Roadmap — Warzone Armory

**Última actualización**: 2026-04-13  
**Estado del proyecto**: 🟢 En producción

---

## Sprint Actual — Quick Wins (Alta prioridad)

### P1-A: Búsqueda por Accesorio (Reverse Lookup) ✅ Completado 2026-04-13
**Idea**: Input de búsqueda que filtra armas por accesorio. "¿Qué armas usan el Casus Brake?" → lista filtrada.  
**Implementación**: `getFilteredWeapons()` busca en nombres de arma Y en todos los accesorios de sus loadouts. La tarjeta muestra los accesorios que coincidieron.  
**Archivos**: `frontend/js/app.js`, `frontend/index.html`, `frontend/css/style.css`

---

### P1-B: Badges "Meta Pick" / "Sleeper" en el Grid ✅ Completado 2026-04-13
**Idea**: Badges visuales en las tarjetas del grid para armas top-meta y armas subvaloradas.  
**Implementación**: `buildMetaBadgeMap()` carga `meta.json` en paralelo. META = top 15 community score. SLEEPER = top 25% TTK que no aparece en el top meta.  
**Archivos**: `frontend/js/app.js`, `frontend/css/style.css`

---

### P1-C: TTK con Precisión Personal ✅ Completado 2026-04-13
**Idea**: El usuario ingresa su % de headshots y ve el TTK ponderado real para su puntería.  
**Implementación**: Slider 0–100% en la sección TTK Comparison. Usa datos reales del JSON (`head`, `chest`, `time_between_shots`). Fórmula: `dmg = hs% × head + (1–hs%) × chest`, `shots = ceil(250/dmg)`, `ttk = (shots–1) × tbs`. Chart y tooltip se actualizan en tiempo real.  
**Archivos**: `frontend/analytics.html`, `frontend/js/analytics.js`, `frontend/css/analytics.css`

---

## Backlog — Mediana Prioridad (P2)

### P2-A: Comparación Directa de Armas (Armory Page)
**Idea**: Seleccionar 2 armas y ver stats lado a lado en el detail panel.  
**Valor**: Alto — 1v1 con loadouts completos, diferente al TTK agregado de Analytics.  
**Factibilidad**: Alta — reutiliza el detail panel con layout de dos columnas.  
**Costo**: Medio (~3-4 días).  
**Estado**: ⏳ Backlog

### P2-B: Rastreador de Camuflajes (Camo Tracker) — MVP
**Idea**: Grid interactivo con progreso de camos guardado en `localStorage`. MVP con solo camos de maestría (Dark Matter, Dark Aether, etc.)  
**Valor**: Medio-Alto — retención diaria sin backend.  
**Factibilidad**: Muy Alta — `localStorage` puro, 100% estático.  
**Costo**: Medio (~3-4 días para MVP).  
**Estado**: ⏳ Backlog

### P2-C: Exportación Visual para Discord
**Idea**: Botón que genera tarjeta visual descargable con arma, accesorios y stat bars.  
**Valor**: Alto — viral loop orgánico; cada compartido es un backlink gratuito.  
**Factibilidad**: Alta — `html2canvas` o Canvas API nativa.  
**Bloqueante potencial**: CORS con imágenes de `assets.codmunity.gg`.  
**Costo**: Medio (~2-3 días).  
**Estado**: ⏳ Backlog

---

## Backlog — Baja Prioridad / Bloqueados (P3)

### P3-A: Clases Completas (Perks + Equipamiento)
**Idea**: Agregar perks, chalecos y equipo letal/táctico por loadout.  
**Bloqueante**: CODMunity no expone perks en su JSON. Requiere nueva fuente o curaduría manual.  
**Costo**: Alto.  
**Estado**: 🚫 Bloqueado por datos

### P3-B: Filtros por Mapa y Modo de Juego
**Idea**: Filtrar meta por Resurgence, Battle Royale, Ranked Play.  
**Bloqueante**: Ninguna fuente scrapeada segmenta por modo. Sin datos reales, los filtros serían arbitrarios.  
**Costo**: Muy Alto.  
**Estado**: 🚫 Descartado (sin fuente de datos viable)

---

## Tabla de Priorización

| # | Feature | Valor | Esfuerzo | Prioridad | Bloqueos |
|---|---------|-------|----------|-----------|---------|
| P1-A | Búsqueda por Accesorio | ⭐⭐⭐⭐ | 🔧 Bajo | **P1** | Ninguno |
| P1-B | Badges Meta/Sleeper | ⭐⭐⭐ | 🔧 Muy Bajo | **P1** | Ninguno |
| P1-C | TTK con Precisión Personal | ⭐⭐⭐⭐⭐ | 🔧🔧 Medio | **P1** | Headshot multiplier (estimado) |
| P2-A | Comparación Directa Armas | ⭐⭐⭐⭐ | 🔧🔧 Medio | **P2** | Ninguno |
| P2-B | Camo Tracker (MVP) | ⭐⭐⭐ | 🔧🔧 Medio | **P2** | Curaduría de datos |
| P2-C | Exportación Visual Discord | ⭐⭐⭐⭐ | 🔧🔧 Medio | **P2** | CORS en imágenes |
| P3-A | Clases Completas (Perks) | ⭐⭐⭐⭐ | 🔧🔧🔧 Alto | **P3** | Sin fuente de datos |
| P3-B | Filtros Mapa/Modo | ⭐⭐⭐⭐ | 🔧🔧🔧🔧 Muy Alto | **Descartado** | Sin fuente de datos |
