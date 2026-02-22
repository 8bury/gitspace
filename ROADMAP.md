# ROADMAP — GitSpace

## Visão do Produto
GitSpace transforma um perfil do GitHub em um sistema solar interativo:
- **Estrela central** = perfil do usuário
- **Planetas** = repositórios
- **Atributos visuais** guiados por dados reais (linguagem, commits, stars)
- **Share card** para publicação rápida em redes

---

## Escopo do MVP (2 semanas)
**Objetivo do MVP:** gerar uma visualização interativa funcional para 1 usuário GitHub público, com mapeamento visual básico e export de card.

### Funcionalidades MVP
1. Busca de usuário GitHub público
2. Coleta de repositórios + linguagens + stars + atividade recente (proxy para commits)
3. Renderização do sistema solar (3D no MVP)
4. Regras visuais principais:
   - Cor da estrela por linguagem predominante recente
   - Um planeta por repo
   - Tamanho do planeta por volume de commits/atividade
   - Tipo do planeta por relação commits x stars
   - Anel para repositórios com muitas stars (limiar configurável)
   - Cor/estilo do planeta por linguagens principais
5. Share card (PNG) com layout padrão

---

## Plano de 2 Semanas

## Semana 1 — Base técnica + modelo de dados

### Fase 1: Fundação do projeto (Dia 1-2)
**Milestones**
- Stack definida e projeto inicial pronto
- Estrutura de pastas e padrão de código estabelecidos

**Entregáveis**
- App inicial rodando local
- Configuração de lint/format
- Documento curto de arquitetura (`docs/arquitetura.md`)

**Critérios de aceite**
- Build e run local sem erros
- Estrutura mínima: `src/`, `components/`, `lib/`, `types/`

### Fase 2: Integração GitHub + normalização (Dia 3-4)
**Milestones**
- Dados de perfil e repositórios sendo coletados
- Pipeline de transformação pronto para consumo da UI

**Entregáveis**
- Módulo `githubClient`
- Módulo `planetMapper` com regras de transformação
- Tipos de domínio (estrela, planeta, sistema)

**Critérios de aceite**
- Dado um username válido, retornar modelo completo do sistema
- Tratamento de erro para usuário inexistente/rate limit

### Fase 3: Motor visual 3D MVP (Dia 5-7)
**Milestones**
- Cena 3D interativa renderizada com estrela + planetas
- Mapeamentos visuais aplicados em objetos 3D

**Entregáveis**
- Componente `SolarSystemView3D` (Three.js / React Three Fiber)
- Legenda visual mínima (cores, tamanhos, anel)
- Interações básicas (hover/click com tooltip)
- Controles de câmera (orbitar, zoom)

**Critérios de aceite**
- Visualização abre em <3s para perfis médios
- Pelo menos 20 repos renderizados sem travar
- Navegação 3D fluida em desktop comum

---

## Semana 2 — Produto utilizável + share

### Fase 4: UX e consistência das regras (Dia 8-10)
**Milestones**
- Regras visuais refinadas e previsíveis
- Melhorias de navegação

**Entregáveis**
- Ajuste de escalas (tamanho/órbitas)
- Configuração de limiares (`stars`, `commits`)
- Painel lateral simples com detalhes do repo

**Critérios de aceite**
- Regras visuais reproduzíveis para o mesmo input
- Interface legível em desktop (mínimo 1280px)

### Fase 5: Share card + finalização do MVP (Dia 11-13)
**Milestones**
- Usuário consegue gerar e baixar card

**Entregáveis**
- Componente/endpoint de geração de imagem
- Template padrão do card (nome, estrela, planetas destaque)

**Critérios de aceite**
- Download PNG funcionando
- Card gerado com informações corretas do perfil

### Fase 6: QA, polimento e release MVP (Dia 14)
**Milestones**
- MVP pronto para demo pública

**Entregáveis**
- Checklist QA
- `README` com setup e uso
- Versão `v0.1.0`

**Critérios de aceite**
- Fluxo completo: buscar usuário → visualizar sistema → gerar card
- Sem bugs críticos conhecidos

---

## Pós-MVP (v0.2+)

### Fase 7: Precisão de métricas
**Entregáveis**
- Cálculo de commits mais fiel (GraphQL + janela temporal)
- Métricas por período (30/90/365 dias)

**Critérios de aceite**
- Diferença máxima aceitável definida vs dados de referência

### Fase 8: Visual avançado
**Entregáveis**
- Animações e texturas por linguagem (nível avançado)
- Efeitos visuais (bloom, partículas, pós-processamento)
- Temas visuais (claro/escuro/cósmico)

**Critérios de aceite**
- FPS estável em máquina comum
- Sem perda de legibilidade

### Fase 9: Personalização, social e exploração
**Entregáveis**
- Customização de cores/estilo
- URLs compartilháveis com estado
- Gallery pública (opt-in)
- Exploração com foguete entre planetas do sistema
- Viagem para outros sistemas solares (outros perfis)

**Critérios de aceite**
- Link reabre visualização com os mesmos parâmetros
- Usuário consegue navegar com foguete no próprio sistema
- Usuário consegue trocar para outro sistema sem recarregar o app

### Fase 10: Ranking global, identidade e claim de universo
**Entregáveis**
- Ranking de perfis por commits (snapshot no momento da busca)
- Persistência de handles pesquisados + dados congelados por consulta
- Atualização do snapshot ao pesquisar o mesmo handle novamente
- Regra especial de núcleo: TOP 5 commitadores exibem buraco negro no centro (em vez de estrela)
- Login com GitHub (OAuth) para usuário reivindicar (claim) o próprio universo
- Personalização do universo após claim (tema, cores, assinatura visual)

**Critérios de aceite**
- Adicionar handle coloca o perfil no ranking com snapshot atual
- Pesquisar handle existente atualiza os dados no ranking
- TOP 5 exibem buraco negro corretamente; demais exibem estrela
- Usuário autenticado consegue dar claim no universo correspondente ao seu perfil
- Alterações de personalização persistem por usuário

---

## Riscos e Mitigações
- **Rate limit GitHub API** → cache + fallback + token opcional
- **Commit count inconsistente** → documentar método + ajuste progressivo
- **Poluição visual com muitos repos** → paginação/limite por relevância
- **Performance de render** → LOD (level of detail) + simplificação de cena

---

## Definição de Pronto (MVP)
O MVP está pronto quando:
1. Um usuário informa username GitHub público
2. GitSpace renderiza sistema solar coerente com as regras
3. Usuário interage com planetas e vê dados essenciais
4. Usuário gera e baixa share card
5. Existe documentação mínima para rodar e demonstrar o projeto
