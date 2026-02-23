# Auditoria de Responsividade — GitSpace (Issue #1)

## Escopo e método
Auditoria estática do código atual (sem alteração de UI), cobrindo:
- Home/Search
- Visualização 3D
- Sidebar (detalhes do planeta)
- Tooltip
- Legenda

Breakpoints analisados: **320, 375, 390, 768, 1024, 1280+**.

---

## Resumo executivo

### P0 (crítico)
1. **Header com elementos absolutos conflitando em telas pequenas** (CTA de estrela à direita + botão back à esquerda + título central) sem regras responsivas.
   - Evidência: `src/app/page.tsx` linhas 146–193 (CTA absoluto), 196–229 (back absoluto), 129–143 (título grande fixo).
2. **Painéis sobrepostos no modo solar em mobile** (badge esquerda + controls direita + ranking + tooltip/sidebar), sem adaptação por breakpoint.
   - Evidência: `src/components/solar/SolarSystemView.tsx` linhas 693–703, 785–798, 878–885.

### P1 (alto)
3. **Sidebar com largura rígida e comportamento desktop-first**, tende a ocupar espaço excessivo em largura pequena.
   - Evidência: `src/components/solar/PlanetSidebar.tsx` (estrutura com chart e grids fixos) + `CHART_WIDTH=252` linha 18.
4. **Tooltip com `minWidth: 200px` fixo**, pode colidir com outros overlays em telas estreitas.
   - Evidência: `src/components/solar/PlanetTooltip.tsx` linhas 3–14.
5. **SearchBar sem quebra para coluna em mobile**, risco de compressão do input + botão.
   - Evidência: `src/components/ui/SearchBar.tsx` linha 21 (`display:flex`, `gap`, `maxWidth:420px`) + botão com padding fixo linhas 82–95.

### P2 (médio)
6. **Legenda com largura fixa (220px) e ativação principal por hover**, no touch perde ergonomia.
   - Evidência: `src/components/solar/LegendPanel.tsx` linhas 50, 175, 106–113.

---

## Checklist por breakpoint

## 320px
- [x] Header principal avaliado
- [x] SearchBar avaliado
- [x] Solar overlays avaliados
- [x] Sidebar/tooltip/legenda avaliados

**Achados**
- **P0** Header sobrecarregado (botões absolutos e título grande) com alta chance de sobreposição visual.
- **P0** No modo solar, múltiplos painéis absolutos competem pela mesma área útil.
- **P1** SearchBar horizontal pode ficar apertado para input+botão sem fallback vertical.
- **P1** Tooltip de 200px e legenda de 220px ocupam grande parte da tela.

**Reprodução**
1. Abrir app em viewport 320px.
2. Entrar no modo solar.
3. Observar header e painéis no topo: competição por espaço e leitura prejudicada.

---

## 375px
- [x] Header principal avaliado
- [x] SearchBar avaliado
- [x] Solar overlays avaliados

**Achados**
- **P0** Persistem conflitos do header quando botão back está visível (modo solar).
- **P1** SearchBar ainda sem empilhamento adaptativo.
- **P1** Tooltip/legenda continuam com largura fixa agressiva para mobile.

**Reprodução**
1. Viewport 375px.
2. Ativar modo solar.
3. Inspecionar topo e interações de tooltip/legenda.

---

## 390px
- [x] Header principal avaliado
- [x] Overlays do solar avaliados
- [x] Sidebar avaliada

**Achados**
- **P0** Mesmo padrão de sobreposição de overlays no topo.
- **P1** Sidebar mantém layout denso para touch (muito conteúdo simultâneo + gráfico).

**Reprodução**
1. Viewport 390px.
2. Selecionar planeta para abrir sidebar.
3. Verificar densidade visual e área restante para contexto 3D.

---

## 768px
- [x] Layout geral avaliado
- [x] Painéis avaliados

**Achados**
- **P1** Melhor que mobile, mas ainda com stack de painéis no topo sem estratégia clara de prioridade.
- **P2** Legenda fixa em 220px ainda pode competir com informações quando vários overlays estão ativos.

**Reprodução**
1. Viewport 768px.
2. Ativar tooltip + sidebar + ranking no solar.
3. Observar carga visual e ocupação simultânea.

---

## 1024px
- [x] Layout geral avaliado

**Achados**
- **P2** Interface funcional, porém sem breakpoint explícito para refinar distribuição de painéis.
- **P2** Alguns tamanhos tipográficos/paddings seguem fixos (inline styles), dificultando ajuste fino por breakpoint.

---

## 1280+
- [x] Layout geral avaliado

**Achados**
- **P2** Desktop está visualmente estável.
- **P2** Falta padronização de tokens responsivos (spacing/typography) para manter consistência conforme evolui.

---

## Evidências (arquivo/trecho)
- Header absoluto (CTA + back + título): `src/app/page.tsx` 129–143, 146–193, 196–229.
- SearchBar sem variante mobile (linha única): `src/components/ui/SearchBar.tsx` 21, 82–95.
- Container do solar com altura fixa relativa e min-height: `src/components/solar/SolarSystemView.tsx` 677.
- Badge esquerda e controls direita absolutos: `src/components/solar/SolarSystemView.tsx` 693–703, 785–798.
- Tooltip absoluto com `minWidth: 200px`: `src/components/solar/PlanetTooltip.tsx` 3–14.
- Legenda com `width: 220px`, dependente de hover: `src/components/solar/LegendPanel.tsx` 50, 106–113, 175.
- Sidebar com gráfico de largura fixa (`CHART_WIDTH=252`): `src/components/solar/PlanetSidebar.tsx` 18.

---

## Priorização consolidada
- **P0**
  - Conflito de elementos absolutos no header em telas pequenas.
  - Sobreposição de overlays no modo solar (topo e laterais) sem adaptação mobile.
- **P1**
  - Sidebar desktop-first e densa para mobile.
  - Tooltip/legenda com larguras fixas altas para viewport pequena.
  - SearchBar sem empilhamento vertical em breakpoints pequenos.
- **P2**
  - Ausência de sistema de tokens/breakpoints unificado.
  - Dependência alta de inline styles fixos.

---

## Recomendações objetivas (para próximas issues)
1. **Issue #2 (layout adaptativo)**
   - Definir layouts explícitos por faixa:
     - Mobile: painel em bottom sheet; evitar dois painéis fixos no topo.
     - Tablet: painéis colapsáveis.
     - Desktop: sidebar fixa + controles no topo.
   - Remover colisão de header em `<640px` (reduzir título, mover CTA para ícone ou menu).

2. **Issue #3 (UX touch 3D)**
   - Aumentar alvos de toque e reduzir ruído de overlays simultâneos.
   - Garantir que tooltip/legenda tenham gesto de abertura/fechamento mobile-first.

3. **Issue #4 (performance mobile)**
   - Limitar efeitos em mobile e ajustar DPR dinamicamente.

4. **Issue #5 (tokens/breakpoints)**
   - Centralizar breakpoints e tokens para remover números mágicos em inline style.

5. **Issue #6 (QA)**
   - Montar checklist de regressão com cenários de overlays concorrentes em 320/375/390.
