# Arquitetura — GitSpace

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS v4 |
| 3D | React Three Fiber + Drei + Three.js |
| Export de card | html-to-image |
| API | GitHub REST API v3 |

## Estrutura de pastas

```
src/
  app/
    page.tsx                  # Página principal (client component)
    layout.tsx                # Root layout
    globals.css               # Estilos globais
    api/
      github/[username]/
        route.ts              # API route: busca + monta sistema solar
  components/
    solar/
      SolarSystemView.tsx     # Canvas 3D principal
      PlanetTooltip.tsx       # Tooltip de hover
    ui/
      SearchBar.tsx           # Campo de busca
    share/
      ShareCard.tsx           # (Fase 5) Geração de card PNG
  lib/
    githubClient.ts           # Fetch para GitHub API
    planetMapper.ts           # Transformação dados → domínio visual
    languageColors.ts         # Mapa linguagem → cor hex
  types/
    index.ts                  # Tipos de domínio (Star, Planet, SolarSystem)
```

## Fluxo de dados

```
Usuário digita username
  → GET /api/github/:username
    → fetchUser()         GitHub /users/:login
    → fetchRepos()        GitHub /users/:login/repos (paginado)
    → fetchLanguages()    GitHub /repos/:full_name/languages (paralelo, top 30)
    → buildSolarSystem()  transforma em Star + Planet[]
  ← SolarSystem JSON
  → SolarSystemView (React Three Fiber)
    → StarMesh (estrela central animada)
    → PlanetMesh × N (planetas em órbita)
    → OrbitLine × N (anéis de órbita)
```

## Regras visuais

### Estrela
- Cor = linguagem mais frequente nos últimos 10 repos ativos
- Emissive glow baseado na cor

### Planetas
| Atributo | Regra |
|---|---|
| Cor | Linguagem dominante do repo |
| Tamanho | Normalizado por `activityScore` (recência + tamanho) ou stars |
| Tipo `rocky` | commits > stars relativamente |
| Tipo `gaseous` | ratio stars/activity > 3 |
| Tipo `icy` | inativo, sem stars |
| Anel | stars ≥ 50 |
| Órbita | `3 + índice × 1.2` unidades (determinístico) |

## Limitações do MVP
- Commits estimados via `size` e `pushed_at` (GitHub REST não expõe contagem de commits por repo na listagem)
- Máximo de 40 planetas exibidos (cap visual)
- Sem autenticação / cache de sessão
