# GitSpace

GitSpace transforma um perfil público do GitHub em um sistema solar 3D interativo:
- estrela central = perfil do usuário
- planetas = repositórios
- propriedades visuais baseadas em linguagem, atividade e stars

## Status

- Versão: `v0.1.0`
- Fase atual: QA/polimento do MVP
- Share card: adiado (não incluído nesta versão)

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Three.js + React Three Fiber + Drei
- GitHub REST API v3

## Requisitos

- Node.js 20+
- npm 10+

## Setup local

1. Instale dependências:

```bash
npm install
```

2. Configure variáveis de ambiente:

```bash
# .env.local
GITHUB_TOKEN=seu_token_github # opcional, mas recomendado

# opcional para persistir galáxia em Cloudflare D1 (produção)
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_D1_DATABASE_ID=...
CLOUDFLARE_API_TOKEN=...
```

3. Rode em desenvolvimento:

```bash
npm run dev
```

4. Abra:

```text
http://localhost:3000
```

## Uso

1. Digite um username público do GitHub na busca.
2. Explore o sistema na visão de galáxia.
3. Entre no sistema solar do usuário.
4. Interaja com planetas (hover, clique, sidebar, controle de câmera e velocidade).

## Scripts

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm run build
npm run start
```

## API interna

- `GET /api/github/[username]`: busca GitHub e retorna `SolarSystem`
- `GET /api/galaxy`: retorna sistemas catalogados localmente

## Limitações conhecidas

- Contagem de commits é aproximada (proxy por `size` + `pushed_at`).
- Sem autenticação de usuário final.
- Sem share card/PNG nesta versão.
- Se variáveis do D1 não estiverem configuradas, a persistência da galáxia cai para arquivo local (`data/galaxy.json`).

## QA

Checklist e resultado da validação em `docs/qa-checklist.md`.
