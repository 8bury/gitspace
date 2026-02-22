# QA Checklist — v0.1.0

Data da execução: 2026-02-22

## 1. Checks automatizados

| Check | Resultado | Observação |
|---|---|---|
| `npm run lint` | ✅ Passou | Sem erros |
| `npx tsc --noEmit` | ✅ Passou | Tipagem ok |
| `npm run build` | ⚠️ Parcial | Compilação ok, falha final por `spawn EPERM` no ambiente de execução |

## 2. Fluxos funcionais (manual)

| Fluxo | Resultado | Observação |
|---|---|---|
| Buscar usuário válido | ✅ | API responde e sistema é montado |
| Usuário inexistente | ✅ | Retorna erro tratado na UI |
| Navegação galáxia → sistema | ✅ | Seleção e transição funcionando |
| Hover/click em planeta | ✅ | Tooltip + painel lateral funcionando |
| Controles de câmera e zoom | ✅ | Orbit e foco funcionando |
| Persistência local da galáxia | ✅ | Entradas salvas em `data/galaxy.json` |
| Geração de share card PNG | ❌ | Funcionalidade adiada nesta versão |

## 3. Critérios da Fase 6 (ROADMAP)

| Critério | Status | Observação |
|---|---|---|
| Checklist QA | ✅ | Este documento |
| README com setup e uso | ✅ | Atualizado |
| Versão `v0.1.0` | ✅ | `package.json` já está em `0.1.0` |
| Sem bugs críticos conhecidos | ✅ | Sem crashes críticos identificados no fluxo principal |
| Fluxo completo com share card | ❌ | Fora de escopo da versão atual |

## 4. Riscos residuais

- Dependência de token opcional para evitar rate limit da GitHub API.
- Build no ambiente atual apresentou `spawn EPERM` após compilação (não reproduz erro de código de aplicação).
- Share card permanece pendente para próxima iteração.
