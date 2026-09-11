# 🎨 Prompts Otimizados para Refatoração Front-End (React/Next.js)
**Versão: 10/10 | Especialista Front-End | Engenharia de Prompt Aplicada**

---

## 📋 Índice de Execução
1. **Análise de Código Morto** (Limpeza Base)
2. **Detecção de Duplicação** (Estrutura)
3. **Otimização de Performance** (Eficiência Web)
4. **Tratamento de Erros** (UX Confiável)
5. **Separação de Responsabilidades** (Arquitetura Front)
6. **Otimizações Next.js Específicas** (Routing, SSR, Image, etc)
7. **Acessibilidade & SEO** (Compliance & Discoverability)

---

## ✅ PROMPT 1: ANÁLISE DE CÓDIGO MORTO E LIMPEZA

### 📖 O QUE ESTE PROMPT FAZ:
Executa uma auditoria completa no projeto para identificar e remover **código que não está sendo utilizado**: componentes fantasmas, funções órfãs, importações inúteis, variáveis de estado estáticas e comentários sem contexto. Este é o **primeiro passo** porque limpa a base antes de otimizações estruturais.

**Específico para Front-End:**
- ❌ Componentes React nunca renderizados
- ❌ Páginas Next.js nunca acessadas (rotas dead)
- ❌ Custom hooks não utilizados
- ❌ Estilos CSS não aplicados (especialmente com Tailwind/CSS modules)

---

### 🎯 PROMPT (EXECUTE ISTO):

```
You are a React/Next.js Frontend Code Quality Expert. Perform a comprehensive dead code analysis on the frontend project.

OBJECTIVE:
Identify and eliminate unused frontend code that increases complexity without adding value.
Respond always in Portuguese (PT-BR).

FRONTEND-SPECIFIC ANALYSIS REQUIREMENTS:

1. UNUSED COMPONENTS: Find React/Next.js components that are imported but never rendered.
   - Check all component references across src/, pages/, app/ directories
   - Include: functional components, layout components, page components
   - Verify usage in: JSX files, dynamic imports, lazy loading scenarios
   - List each unused component with: file path, last modified date, estimated LOC to remove
   - For each: confirm it's not used in tests, storybook, or documentation

2. UNUSED PAGES & ROUTES: Identify Next.js pages never accessed.
   - Pages in pages/ or app/ directories
   - API routes in pages/api/ (check for imports in frontend and backend)
   - Dynamic routes that have no incoming links or references
   - For each: file path, whether it has outgoing links, suggested removal/archival

3. UNUSED HOOKS: Find custom hooks not used anywhere.
   - Check hooks/ directory and hooks defined inline
   - Distinguish between exported hooks (might be part of public library) and internal
   - For each: location, usage count, parameters it expects, suggested removal or documentation

4. UNUSED UTILITIES & HELPERS: Identify utility functions only in frontend context.
   - Helper functions in utils/, lib/, constants/ directories
   - Format utilities, validation functions, transformers
   - For each: location, usage count, dependencies on other utilities

5. UNUSED STYLES & CLASSES: Find CSS that's never applied.
   - If using Tailwind: check for utility classes in code that aren't generated (e.g., dynamically created)
   - If using CSS modules: check for .module.css classes never imported
   - If using styled-components: check for styled components never mounted
   - Global CSS rules that don't match any elements in production
   - For each: file, selectors, estimated bytes to save

6. UNUSED THIRD-PARTY COMPONENTS: Identify UI library components imported but not used.
   - Check for unused imports from component libraries (Material-UI, Chakra, shadcn, etc)
   - Components added "just in case" but never rendered
   - For each: library, component, alternative if similar is used elsewhere

7. DEAD STATE & CONTEXT: Find unused state management artifacts.
   - Context providers defined but not used
   - Redux slices/actions/selectors with zero usage
   - Zustand/Jotai stores not consumed
   - For each: type, location, scope, risk assessment

8. ORPHANED CODE COMMENTS & STORYBOOK STORIES: Identify comments without context.
   - Comments not explaining surrounding code
   - Storybook stories for components that no longer exist
   - TODOs without associated issues
   - For each: location, context, removal recommendation

DELIVERABLE FORMAT:
Provide a structured dead code inventory:

EXECUTIVE SUMMARY:
- Total unused components found: X
- Total unused pages/routes: X
- Total unused hooks: X
- Estimated lines of code to remove: X
- Estimated size savings: X KB

DETAILED FINDINGS BY CATEGORY:
For each category (Components, Pages, Hooks, etc):
- Item name
- File path
- Last modified date
- Impact assessment: "Safe to remove" / "Requires review" / "Keep (might be used)"
- Removal effort: lines of code
- Risk level: low / medium / high

REMOVAL PRIORITY LIST:
1. CRITICAL (High confidence, safe removal)
   - Components/functions with zero dependencies
   - Unused pages with no incoming links
   - Duplicate code with preferred version identified

2. HIGH (Likely unused, review recommended)
   - Components with outdated references
   - Experimental features marked as WIP
   - Old hooks replaced by new versions

3. MEDIUM (Might be intentional, manual review needed)
   - Exported functions (part of potential API)
   - Components in deprecated folders
   - Utility functions used by dead code only

IMPORTANT:
- Check git history: don't remove if added recently (might be in active development)
- Preserve: public API exports, exported hooks from shared libraries
- Account for: dynamic imports, string-based references, reflection
- Consider: test files that might import unused components
- Flag: components used in Storybook or documentation separately
```

---

### 📊 RESULTADO ESPERADO:
Um relatório estruturado mostrando:
- ✂️ **Componentes não renderizados** (ex: `OldUserModal.jsx` - 2 semanas sem uso)
- 🔧 **Hooks órfãos** (ex: `useOldDataFetching()` - 0 consumidores)
- 📦 **Importações mortas** (ex: `import { unused } from '@ui/buttons'`)
- 🎨 **Classes CSS não aplicadas** (ex: `.legacy-card { ... }` - zero matches)
- 🔗 **Páginas Next.js fantasmas** (ex: `/pages/old-dashboard.tsx` - sem links para ela)
- 📍 **Context/Store não utilizados** (ex: `UserContext` criado mas nunca consumido)
- 🎯 **Priorização** (remove primeiro os com zero dependências)

---

## ✅ PROMPT 2: DETECÇÃO DE DUPLICAÇÃO E DRY

### 📖 O QUE ESTE PROMPT FAZ:
Identifica **padrões de código duplicados** na codebase: componentes, hooks, estilos, padrões lógicos que se repetem com pouca variação. Sugere abstrações reutilizáveis. Essencial para **reduzir manutenção futura** em front-end.

**Específico para Front-End:**
- 🔄 Componentes UI similares (Cards, Modals, Forms)
- 🎨 Padrões de styling duplicados (Tailwind, styled-components)
- 🧠 Hooks com lógica similar (data fetching, form validation)
- 🖼️ Layouts que se repetem
- ✅ Padrões de validação de formulários

---

### 🎯 PROMPT (EXECUTE ISTO):

```
You are a React/Next.js Architecture Specialist. Perform a comprehensive code duplication analysis for frontend.

OBJECTIVE:
Eliminate frontend code duplication by identifying repeated patterns and suggesting reusable abstractions (DRY principle).
Respond always in Portuguese (PT-BR).

FRONTEND-SPECIFIC ANALYSIS REQUIREMENTS:

1. DUPLICATED UI COMPONENTS: Find React components with identical or near-identical structure.
   - Card components with slight variation in borders/shadows
   - Modal/Dialog variations that could be parameterized
   - Form inputs (TextInput, SelectInput, CheckboxInput) with boilerplate
   - Button variants (primary, secondary, danger) recreated multiple times
   - Similar list/table implementations
   - For each: similarity percentage, parameter differences, consolidation strategy

2. DUPLICATED HOOKS LOGIC: Identify reusable hook patterns.
   - Data fetching hooks (useGetUsers, useGetProducts, etc) with identical structure
   - Form handling logic repeated in multiple components
   - Debounce/throttle wrappers used multiple times
   - useEffect patterns for subscriptions/listeners
   - Local storage hooks with similar implementation
   - For each: commonality, extract to custom hook, parameter variations needed

3. DUPLICATED STYLING PATTERNS: Detect repeated CSS/Tailwind patterns.
   - Identical Tailwind class combinations (rounded-lg shadow-md p-4 bg-white)
   - Repeated CSS patterns (flex layouts, grid configurations, responsive breakpoints)
   - Animation/transition definitions that repeat
   - Color/spacing tokens not using design system variables
   - Media query patterns that could be utilities
   - For each: pattern, occurrences, refactor to utility/variable

4. DUPLICATED FORM PATTERNS: Identify repeated form structure/logic.
   - Form validation logic (email, phone, date validation) in multiple places
   - Form reset/submit handlers with boilerplate
   - Error message display patterns
   - Field registration patterns
   - Form state initialization similar across forms
   - For each: pattern, suggest custom hook or form library integration

5. DUPLICATED PAGE/LAYOUT STRUCTURE: Find repetitive page patterns.
   - Similar page headers (title + breadcrumbs + action buttons)
   - Repeated sidebar configurations
   - Similar data loading states across pages
   - Duplicate filter/search bar implementations
   - Similar pagination implementations
   - For each: structure, suggest layout component or template

6. DUPLICATED CONDITIONAL RENDERING: Identify repeated render logic.
   - Permission/authorization checks duplicated across components
   - Status badge/display logic repeated
   - Loading skeleton patterns
   - Empty state displays
   - Error state UI repeated
   - For each: condition type, occurrences, suggest shared component

7. DUPLICATED API INTEGRATION PATTERNS: Find similar data fetching approaches.
   - Similar fetch patterns with error/loading state
   - Repeated query parameter building
   - Similar response data transformation
   - Duplicate error handling approaches
   - Similar cache invalidation patterns
   - For each: pattern, suggest utility function or custom hook

REFACTORING SUGGESTIONS:

For each duplication cluster, provide:
- Abstraction strategy: "Extract to component", "Create custom hook", "Utility function", "CSS utility class"
- Prevalence: how many times this pattern appears
- Implementation approach: code example of the new abstraction
- Migration path: how to update existing code (with before/after)
- Testing considerations: what to test after refactoring
- Risk level: "Low (cosmetic)" → "High (behavior change)"

DELIVERABLE FORMAT:
Organized by refactoring type:

UI COMPONENTS:
- Components to consolidate
- For each: current implementations (list files), similarity %, parameter differences
- Suggested consolidated component interface
- Code example of new component with props
- Migration: how to replace existing with new version
- Testing: unit tests for new component variants

CUSTOM HOOKS:
- Hooks to extract/consolidate
- For each: current duplicated locations, similar logic, differences
- New hook signature with parameters
- Code example of extracted hook
- Migration: find & replace strategy
- Use cases covered by new hook

STYLING/CSS:
- Tailwind utilities to create or CSS utilities to extract
- For each: pattern, occurrences, savings (bytes)
- Implementation (Tailwind @apply or CSS utility class)
- Design token usage if applicable
- Usage example

FORMS:
- Form validation library recommendation if applicable
- Custom form hooks to create
- Form field component variants to consolidate
- Code examples
- Migration path

ESTIMATED IMPACT:
- Lines of code eliminated after refactoring: X
- Files affected: X
- Implementation effort: X hours
- Risk: low/medium/high
- Performance impact: positive/neutral/negative

IMPORTANT:
- Calculate exact code savings (lines eliminated)
- Provide working code examples for each abstraction
- Consider: when exact duplication is intentional (design systems with intentional variants)
- For UI components: consider accessibility implications
- Prioritize by: impact (code savings) × ease (effort to refactor)
- Include: TypeScript types if project uses TypeScript
```

---

### 📊 RESULTADO ESPERADO:
Um mapa de duplicações mostrando:
- 🔄 **Componentes Card** (encontra 7 variações que poderiam ser 1 componente + props)
- 🧪 **Custom Hook useFetch** (mesmo padrão em 12 componentes, criar `useApi()`)
- 🎨 **Classes Tailwind repetidas** (ex: `rounded-lg shadow-md p-4 bg-white` aparece 23x, criar utilidade)
- ✅ **Validação de formulário** (validação de email copiada em 5 formulários, centralizar)
- 🎭 **Padrão Loading State** (skeleton/spinner em 18 componentes, abstrair em `<Skeleton>`)
- 📊 **Economia estimada** (ex: refatoração economiza ~800 linhas, 15KB gzipped)

---

## ✅ PROMPT 3: OTIMIZAÇÃO DE PERFORMANCE FRONT-END

### 📖 O QUE ESTE PROMPT FAZ:
Análise profunda de **gargalos de performance** no front-end React/Next.js: componentes renderizando desnecessariamente, imagens não otimizadas, bundles grandes, carregamento de rotas lento, métricas Core Web Vitals ruins. Essencial para **aplicações responsivas e rápidas**.

**Específico para Front-End:**
- ⚡ Re-renders desnecessários (React.memo, useMemo, useCallback)
- 🖼️ Imagens (Next.js Image optimization, lazy loading)
- 📦 Bundle size e code splitting
- 🚀 First Contentful Paint (FCP), Largest Contentful Paint (LCP)
- ⌨️ Interaction to Next Paint (INP)
- 🔤 Cumulative Layout Shift (CLS)

---

### 🎯 PROMPT (EXECUTE ISTO):

```
You are a React/Next.js Performance Optimization Specialist. Conduct a thorough frontend performance analysis.

OBJECTIVE:
Identify and eliminate performance bottlenecks to ensure fast, responsive user experience with excellent Core Web Vitals.
Respond always in Portuguese (PT-BR).

FRONTEND-SPECIFIC ANALYSIS REQUIREMENTS:

1. UNNECESSARY RE-RENDERS: Identify components rendering too frequently.
   - Components that re-render on every parent update without memo
   - Components receiving inline objects as props (create new object every render)
   - Components receiving inline functions as props (not wrapped in useCallback)
   - Components receiving inline arrays/objects in dependencies (useEffect re-runs unnecessarily)
   - Components with missing keys in lists (causes unnecessary re-renders)
   - For each: component name, trigger cause, memo/useMemo solution, estimated renders per session

2. FUNCTION RECREATION ON EVERY RENDER: Detect callbacks recreated each render.
   - Event handlers defined inline (onClick={() => {}}, onChange={e => {}})
   - Functions passed as props without useCallback (breaks child memoization)
   - Functions in dependency arrays without useCallback
   - Callback Hell situations (deeply nested callbacks)
   - Debounced/throttled functions not wrapped in useCallback
   - For each: function name, location, useCallback implementation, impact on child performance

3. HEAVY COMPUTATIONS WITHOUT MEMOIZATION: Find expensive calculations not cached.
   - Complex data transformations (filtering, sorting, grouping large arrays)
   - Expensive calculations inside render (CSS-in-JS calculations, geometry calculations)
   - useMemo candidates with estimated computation cost
   - Calculations that run on every render but produce same result
   - For each: calculation type, data size, computation time, useMemo impact

4. LARGE LISTS WITHOUT VIRTUALIZATION: Identify lists rendering all items at once.
   - Lists with >100 items without windowing
   - Infinite scroll without lazy loading
   - Table components rendering thousands of rows
   - Grid/gallery components with hundreds of items
   - For each: list location, item count, estimated DOM nodes, virtualization library suggestion

5. UNOPTIMIZED IMAGES: Detect image loading/serving problems.
   - Images not using Next.js Image component
   - Images served at full resolution for thumbnails
   - Missing lazy loading (loading="lazy")
   - Images without width/height (causes CLS)
   - Non-responsive images (same size mobile/desktop)
   - Missing modern formats (WebP, AVIF)
   - Large JPEG/PNG without compression
   - For each: image location, current size, optimized size, savings

6. BUNDLE SIZE & CODE SPLITTING: Identify code organization problems.
   - Large components that could be lazy-loaded (React.lazy + Suspense)
   - Missing route-based code splitting (Next.js automatic but verify optimization)
   - Unused dependencies in bundle (check with bundle analyzer)
   - Third-party libraries that could be replaced with smaller alternatives
   - CSS not being code-split by route
   - For each: current size, potential savings, feasibility

7. CORE WEB VITALS ISSUES: Analyze metrics critical for SEO/UX.
   - Largest Contentful Paint (LCP): identify what causes slow initial paint
   - First Input Delay (FID) / Interaction to Next Paint (INP): find heavy JS execution
   - Cumulative Layout Shift (CLS): identify layout instability (images without size, fonts loading, ads)
   - Time to First Byte (TTFB): Next.js backend issues
   - For each: metric, current value, target value, optimization

8. FONT LOADING PERFORMANCE: Detect font-related performance issues.
   - Fonts not being preloaded
   - Font files served from slow CDN
   - System fonts fallback not optimal (causes layout shift)
   - Web fonts blocking render (font-display: block)
   - For each: font, loading strategy, suggested optimization

9. LAZY LOADING & SUSPENSE: Find opportunities for deferred loading.
   - Components below fold that load immediately
   - Modals/popovers pre-loading all content
   - Heavy components in low-visibility areas
   - Route transitions that could show loading state
   - For each: component, load trigger, lazy loading implementation

10. THIRD-PARTY SCRIPTS IMPACT: Identify slow external dependencies.
    - Analytics, tracking, ads scripts blocking render
    - Chat widgets, CMS scripts, embed scripts
    - Third-party CSS/fonts not optimized
    - Polyfills for old browsers
    - For each: script purpose, loading strategy, impact, optimization

PERFORMANCE IMPROVEMENT ROADMAP:

CRITICAL (immediate impact, <1 hour effort):
- List: React.memo() candidates for top-level components
- List: useCallback() candidates in frequently-used components
- List: images without width/height (CLS cause)

HIGH (significant impact, 1-4 hours effort):
- List: useMemo() candidates with quantified benefit
- List: image optimization/format conversion
- List: route-based code splitting verification/improvement

MEDIUM (measurable impact, 4-8 hours effort):
- List: component lazy-loading opportunities
- List: list virtualization implementations
- List: font loading strategy optimization

For each optimization:
- Location: file path and component/function name
- Problem: why it's slow with metrics
- Solution: exact implementation code
- Expected improvement: metric improvement (e.g., "LCP: 2800ms → 1200ms")
- Effort: estimated hours
- Risk: potential side effects
- Testing: how to verify improvement (Lighthouse, DevTools, Web Vitals)

METRICS TO TRACK:
- Before & after: FCP, LCP, INP, CLS, TTFB
- Bundle size: total, main, next chunks
- Time to Interactive (TTI)
- Cumulative Layout Shift components
- JavaScript execution time

IMPORTANT:
- Provide before/after code examples
- Include Chrome DevTools profiling guidance (React Profiler, Performance tab)
- Consider: accessibility implications (lazy loading doesn't break screen readers)
- Flag: micro-optimizations that aren't worth complexity
- Use Next.js built-in optimizations (Image, Script, dynamic imports)
- For Next.js: leverage automatic code splitting, ISR, SWR
- Test on real devices/networks, not just local
```

---

### 📊 RESULTADO ESPERADO:
Um roadmap de performance com:
- ⚡ **React.memo() críticos** (ex: `UserListItem` renderiza 5000x desnecessariamente)
- 🎯 **useCallback essenciais** (ex: `handleDelete` recriado a cada render, quebra memoização)
- 🧠 **useMemo para cálculos pesados** (ex: `filterAndSort()` em array de 50k itens)
- 📜 **Listas não virtualizadas** (ex: DataTable com 10k linhas renderiza tudo)
- 🖼️ **Imagens para otimizar** (ex: avatares 4MB servidos como full-res, poderiam ser 50KB)
- 📦 **Code-splitting oportunidades** (ex: Dashboard component pode ser lazy-loaded)
- 🎴 **Core Web Vitals** (ex: LCP 3.2s → objetivo 2.5s, imagens sem height causam CLS)
- 🔤 **Font optimization** (ex: trocar de Poppins+Montserrat para system fonts + Inter only)

---

## ✅ PROMPT 4: TRATAMENTO DE ERROS E UX CONFIÁVEL

### 📖 O QUE ESTE PROMPT FAZ:
Auditoria de **tratamento de erros** na camada front-end: falhas silenciosas em requisições, falta de feedback visual ao usuário, modais/toasts não informando status, estados de erro não capturados. Garante que **a UX é resiliente** e transparente.

**Específico para Front-End:**
- 🎨 UX de erro (toast, modal, inline message)
- 🛡️ Error boundaries React (componentes que quebram a página)
- 🌐 Requisições sem fallback
- 📡 Network timeout handling
- 🔄 Retry com backoff exponencial
- 👁️ Estados de loading/skeleton
- ⚠️ Validação de formulário com feedback

---

### 🎯 PROMPT (EXECUTE ISTO):

```
You are a React/Next.js Error Handling & UX Reliability Expert. Perform comprehensive error handling analysis.

OBJECTIVE:
Ensure the application handles errors gracefully, prevents silent failures, and provides clear, actionable user feedback.
Respond always in Portuguese (PT-BR).

FRONTEND-SPECIFIC ANALYSIS REQUIREMENTS:

1. UNPROTECTED API CALLS: Find async operations without error handling.
   - fetch() calls without error catch
   - axios/HTTP client calls without .catch() or interceptor
   - Promise chains without .catch()
   - useEffect async operations without error state
   - For each: location, API endpoint, consequence of failure, suggested error state

2. MISSING ERROR BOUNDARIES: Find error boundary gaps.
   - Components that might throw and crash entire page
   - Conditional rendering that could fail (accessing undefined properties)
   - Third-party integrations without boundary wrapper
   - Route components without error boundary
   - For each: component, what could fail, boundary implementation needed

3. SILENT FAILURES IN UI: Detect where errors are caught but hidden.
   - try/catch blocks with empty catch (silently ignored)
   - Catch blocks that only console.log without user feedback
   - Error states set but never displayed
   - Failed operations without rollback or notification
   - Form submissions that fail silently
   - For each: location, error impact, UX feedback needed

4. MISSING LOADING STATES: Identify UI that lacks feedback during async operations.
   - Forms without submit button disabled state
   - API calls without loading skeleton/spinner
   - File uploads without progress indicator
   - Search/filter without debounce visual feedback
   - Pagination without loading indicator
   - For each: operation, current UX, suggested loading state

5. MISSING VALIDATION FEEDBACK: Find forms without proper error messages.
   - Form fields without validation error display
   - Generic validation messages ("Error" instead of "Email format invalid")
   - Validation errors not visible until submit
   - Password requirements not shown while typing
   - File upload restrictions not explained
   - For each: field/form, current validation, improved error message

6. NETWORK ERROR HANDLING: Detect missing network resilience.
   - No retry mechanism for failed API calls
   - No offline mode or offline indicator
   - Network timeout not handled (requests hang forever)
   - No differentiation between connection errors vs server errors
   - Progressive enhancement missing (site unusable without JS)
   - For each: API call, network scenarios, retry/fallback strategy

7. MISSING USER FEEDBACK FOR DESTRUCTIVE ACTIONS: Identify risky operations without confirmation.
   - Delete operations without confirmation modal
   - Form changes without "unsaved changes" warning
   - Navigation with unsaved form data
   - Large operations (bulk delete, bulk update) without progress
   - For each: operation, suggested user confirmation/feedback

8. UNHANDLED PROMISE REJECTIONS: Detect potential crashes.
   - Promises created but not handled
   - Event handlers with async functions that might throw
   - useEffect cleanup issues
   - Unhandled rejections in callbacks
   - For each: scenario, crash potential, error handling fix

9. POOR ERROR MESSAGES FOR USERS: Identify unhelpful error feedback.
   - Generic/technical error messages ("500 Internal Server Error")
   - No context about what the user was doing
   - No suggestion for recovery action
   - Error messages in English when app is in another language
   - For each: error type, current message, improved user-friendly message

10. TIMEOUT & SLOW OPERATION HANDLING: Identify missing feedback for slow operations.
    - API calls that take >3 seconds with no feedback
    - File uploads without progress
    - Background operations with no indicator
    - Requests that timeout with no user notification
    - For each: operation, timeout threshold, feedback strategy

UX ERROR RECOVERY PATTERNS:

For each error handling gap:
- Implement try/catch or .catch() at appropriate level
- Create user-facing error message with recovery action
- Log error appropriately (development vs production)
- Implement retry mechanism where appropriate
- Show loading state during recovery attempts
- Provide fallback UI if operation can't be recovered

ERROR FEEDBACK STRATEGIES:
- Toast notification: for transient, non-critical errors
- Modal dialog: for errors requiring user action or confirmation
- Inline message: for form validation, field-level errors
- Banner: for persistent system-wide issues (maintenance, offline)
- Skeleton/loader: for pending async operations
- Empty state: for no-data scenarios (not errors, but similar UX)

DELIVERABLE FORMAT:
Organized error handling action plan:

CRITICAL ISSUES (prevent crashes):
- List: unhandled promise rejections, missing error boundaries
- For each: file path, error scenario, fix implementation
- Code example: Error Boundary wrapper component

API & NETWORK ERRORS:
- List: unprotected API calls, missing error handlers
- For each: API endpoint, current code, improved code with error handling
- Include: network error types (connection, timeout, 4xx, 5xx)
- Code example: safe API call with error handling and retry

FORM & INPUT VALIDATION:
- List: forms without validation feedback
- For each: form name, fields needing validation, error messages
- Code example: form field with validation and error display
- Include: real-time validation vs on-submit validation

USER EXPERIENCE:
- List: silent failures with no feedback
- For each: operation, current behavior, improved UX with error message
- Include: which feedback method (toast, modal, inline, banner)
- Code example: error handling with user feedback

LOADING STATES:
- List: operations missing loading indicator
- For each: operation, suggested loading state (spinner, skeleton, disabled button)
- Code example: component with loading state

ERROR MONITORING:
- Suggest: error tracking service (Sentry, LogRocket, Bugsnag)
- Identify: which errors to track vs ignore
- Implement: error context (user, page, action, environment)

RECOVERY STRATEGIES:
- Retry mechanism: exponential backoff implementation
- Fallback UI: what to show if operation fails permanently
- Graceful degradation: feature unavailable but app still works
- Rollback: undo optimistic updates on failure

IMPORTANT:
- Provide working code examples for Error Boundaries
- Use React 18+ Error Boundary features if applicable
- Include TypeScript types for error states
- Consider: accessibility of error messages (aria-live regions)
- Distinguish: user errors (validation) vs system errors (network)
- Test error scenarios: offline mode, slow network, API failures
- Include: instrumentation for error tracking/monitoring
```

---

### 📊 RESULTADO ESPERADO:
Um plano de confiabilidade UX com:
- 🚨 **API calls desprotegidas** (ex: `fetch('/users')` sem try/catch)
- 🔥 **Silent failures** (ex: catch vazio que ignora erro)
- 👤 **Sem feedback** (ex: delete button sem confirmation, sem toast de sucesso)
- ⛓️ **Promise rejections não tratadas** (ex: async função em onClick sem tratamento)
- 🛡️ **Error Boundaries faltando** (ex: página inteira quebra com erro em um componente)
- 📝 **Mensagens genéricas** (ex: "Erro" em vez de "Email já cadastrado - tente outro")
- ⏱️ **Sem loading state** (ex: form submit com nenhum feedback visual)
- 🔄 **Sem retry automático** (ex: falha na API com zero retry)

---

## ✅ PROMPT 5: SEPARAÇÃO DE RESPONSABILIDADES (FRONT-END)

### 📖 O QUE ESTE PROMPT FAZ:
Análise arquitetural para **separar lógica de apresentação**: componentes com regras de negócio misturadas, lógica complexa acoplada a UI, falta do padrão container/presentational. Resulta em código **testável, reutilizável, manutenível**.

**Específico para Front-End:**
- 🔀 Lógica no componente de apresentação
- 🧪 Custom hooks para lógica isolada
- 🏗️ Container components para data
- 🎨 Presentational components para UI
- 🔄 Providers/Context para state global

---

### 🎯 PROMPT (EXECUTE ISTO):

```
You are a React/Next.js Architecture & Design Patterns Expert. Perform separation of concerns analysis.

OBJECTIVE:
Improve architectural clarity by separating presentation logic from business logic, making components more testable and reusable.
Respond always in Portuguese (PT-BR).

FRONTEND-SPECIFIC ANALYSIS REQUIREMENTS:

1. BUSINESS LOGIC IN UI COMPONENTS: Identify components mixing data management with presentation.
   - Components with complex conditional rendering logic
   - Validation logic embedded in component render
   - Authorization/permission checks in presentation layer
   - State mutations tied to UI events in non-obvious ways
   - Complex calculations inside render method
   - For each: business rule, current location, suggested extraction (custom hook vs container)

2. COMPLEX CUSTOM HOOKS THAT DO TOO MUCH: Find hooks mixing concerns.
   - Hooks managing multiple unrelated state concerns
   - Hooks with side effects (logging, analytics) inside data fetching
   - Hooks doing both data fetching AND formatting AND caching
   - Hooks returning render logic mixed with data
   - For each: hook, concerns mixed, suggested split strategy

3. TIGHTLY COUPLED COMPONENTS: Find components dependent on specific structures.
   - Components expecting specific prop shapes that could be generic
   - Hard-coded logic for specific use cases
   - Components that would be hard to reuse in different project
   - Implicit dependencies on context or global state
   - Components tightly coupled to routing
   - For each: coupling point, how to decouple, new component interface

4. MISSING CONTAINER/PRESENTATIONAL PATTERN: Identify refactoring opportunities.
   - Large components doing both data fetching and rendering
   - Components hard to test because of mixed concerns
   - Components hard to reuse because tied to specific data source
   - Props that represent data fetching state mixed with rendering props
   - For each: component name, current structure, suggested separation

5. PROP DRILLING: Identify excessive prop passing through levels.
   - Props passed through 3+ levels of components
   - Intermediate components not using props, just forwarding
   - Could be solved with Context or state management
   - For each: prop, path through components, suggested solution (Context vs state management)

6. CONTEXT MISUSE: Find Context being used incorrectly.
   - Using Context for frequently-changing data (causes re-renders)
   - Using Context for data that should be local state
   - Context not memoized, causing unnecessary re-renders
   - Multiple unrelated concerns in single Context
   - For each: context, misuse type, suggested fix

7. MISSING COMPOSITION PATTERNS: Identify where Render Props or Compound Components could improve reusability.
   - Components that would benefit from render props pattern
   - Components that should be compound components but aren't
   - High-Order Components (HOCs) that could be simpler
   - For each: component, composition benefit, suggested pattern

8. LAYOUT LOGIC SCATTERED: Find layout/spacing logic in multiple places.
   - Components with hard-coded spacing/margins
   - Layout logic repeated in multiple components
   - No consistent spacing system/scale
   - Grid/flexbox logic not abstracted
   - For each: pattern, occurrences, suggested layout component

REFACTORING PATTERNS FOR FRONTEND:

CUSTOM HOOKS EXTRACTION:
- Logic: extract business logic to custom hook
- Example: `useFormValidation()`, `usePagination()`, `useLocalStorage()`
- Benefit: testable, reusable across components, separation of concerns
- Code example: hook extraction with before/after

CONTAINER/PRESENTATIONAL:
- Container: manages data, API calls, state, business logic
- Presentational: pure component, receives data as props, renders UI
- Example: `<UserListContainer>` fetches data, passes to `<UserList>`
- Benefit: testable components, easy UI changes without data logic changes

CUSTOM HOOKS + PRESENTATIONAL:
- More modern pattern than Container/Presentational
- Custom hook handles logic: `const { data, loading, error } = useUsers()`
- Presentational component uses hook: `function UserList() { const { data } = useUsers(); return <...> }`
- Benefit: cleaner than wrapper components, composition over inheritance

CONTEXT ABSTRACTION:
- Create hook to consume context: `export const useUser = () => useContext(UserContext)`
- Components use hook instead of context directly
- Benefit: easy to refactor from Context to state management later
- Example: `const user = useUser()` instead of `const user = useContext(UserContext)`

STATE MANAGEMENT LAYER:
- For complex global state: use Zustand, Jotai, Redux, Recoil
- Separate state management from components
- Benefit: testable state logic, reusable across projects
- Alternative to Context for large applications

DELIVERABLE FORMAT:
Architectural refactoring roadmap:

COMPONENT STRUCTURE:
- For each problem component:
  - Current structure: what it does now
  - Issues: why it's problematic
  - Refactored structure: how it should be organized
  - Pattern: Container/Hook, Custom Hook, or other
  - Implementation steps: step-by-step refactoring
  - Code example: before and after

CUSTOM HOOKS:
- Hooks to extract/create
- For each: what logic it contains, which components use it, signature
- Code example: hook implementation
- Testing: unit test example for hook

CONTEXT USAGE:
- Current context setup
- Identified issues (misuse, over-rendering, etc)
- Suggested fixes
- New context patterns with memoization

COMPONENT COMPOSITION:
- Identify: where Render Props, Compound Components, or HOCs help
- For each: component, current pattern, suggested pattern
- Code example: refactored component with new pattern

PROP DRILLING SOLUTION:
- Identify: prop drilling chains
- For each: which props, path, suggested solution (Context, state management, composition)
- Refactoring: step-by-step to fix

TESTING IMPROVEMENTS:
- For each refactored component: testing becomes easier because...
- Example unit test: custom hook test
- Example component test: presentational component test
- Example integration test: container + presentational test

IMPORTANT:
- Suggest patterns matching project maturity (don't over-architect)
- Consider: gradual refactoring (don't break during changes)
- Provide working code examples for each pattern
- Include: TypeScript types if project uses TypeScript
- Flag: components where refactoring effort is low but benefit is high (quick wins)
- Respect: existing architecture (suggest improvements, not rewrites)
```

---

### 📊 RESULTADO ESPERADO:
Um plano arquitetural mostrando:
- 🔀 **Lógica em UI** (ex: `UserForm` tem validação de CPF, deveria estar em hook)
- 🧪 **Custom hooks** (ex: extrair `useFormValidation()` de 3 formulários)
- 📦 **Container/Presentational** (ex: `UserListContainer` para dados, `UserList` para UI)
- 🔗 **Prop drilling** (ex: `user` passa por 5 níveis, usar Context)
- 🏛️ **Context misuse** (ex: form state em Context causa re-renders desnecessários)
- 🎭 **Padrões de composição** (ex: componente beneficiaria de Render Props)
- 🧪 **Testabilidade** (ex: refatoração permite testes unitários isolados)

---

## ✅ PROMPT 6: OTIMIZAÇÕES NEXT.JS ESPECÍFICAS

### 📖 O QUE ESTE PROMPT FAZ:
Análise específica do **Next.js framework**: otimização de routing, SSR vs SSG vs ISR, Image component, Script component, Dynamic imports, API routes. Aproveita as capacidades nativas do framework para melhor performance.

**Específico para Next.js:**
- 🛣️ Route structure (pages vs app router)
- 🖼️ Next.js Image optimization
- 📜 Script loading (defer, worker, etc)
- 🔀 Dynamic imports e route code splitting
- 📝 SSR/SSG/ISR strategy
- 🌐 API Routes handling
- 🔗 Link prefetching
- 📱 Mobile optimization

---

### 🎯 PROMPT (EXECUTE ISTO):

```
You are a Next.js Framework Specialist. Perform comprehensive Next.js-specific optimization analysis.

OBJECTIVE:
Leverage Next.js built-in features for optimal performance, scalability, and developer experience.
Respond always in Portuguese (PT-BR).

NEXT.JS-SPECIFIC ANALYSIS REQUIREMENTS:

1. ROUTE OPTIMIZATION: Analyze routing structure and rendering strategy.
   - Pages using getServerSideProps that could use getStaticProps with ISR
   - Pages using getStaticProps without revalidate time set (never revalidates)
   - Dynamic routes without proper fallback: false/true configuration
   - Missing fallback pages (404, 500, _error.js)
   - Unnecessary re-renders on client due to missing static optimization
   - App Router vs Pages Router migration readiness (if not migrated)
   - For each: page, current rendering strategy, optimization opportunity

2. IMAGE OPTIMIZATION ISSUES: Detect improper image handling.
   - <img> tags used instead of Next.js Image component
   - Next.js Image without height/width (CLS issue)
   - Images not using fill prop for responsive containers
   - Priority prop not set for LCP images
   - Next.js Image not using priority={true} for above-fold images
   - WebP format not used (modern browsers support it)
   - Image dimensions not optimized (4MB for thumbnail)
   - No image caching headers configured
   - For each: image location, current implementation, optimization

3. SCRIPT LOADING STRATEGY: Find inefficient third-party script loading.
   - Third-party scripts blocking render (Google Analytics, Mixpanel, etc)
   - Scripts not using Next.js Script component with defer/worker
   - Multiple script tags in head (should use Script component with defer)
   - External fonts blocking render (should use next/font)
   - Polyfills loaded unnecessarily
   - For each: script, current loading method, strategy (defer/worker/afterInteractive)

4. FONT OPTIMIZATION: Detect font performance issues.
   - Google Fonts not using next/font (causes layout shift)
   - Font files not subsetting (loading full character set)
   - System fonts fallback not optimal
   - Font preload not configured
   - Font-display: block or swap causing CLS
   - For each: font, current method, next/font implementation

5. DYNAMIC IMPORTS & CODE SPLITTING: Identify splitting opportunities.
   - Large components not using dynamic imports
   - Modals/drawers pre-loaded even if not immediately needed
   - Heavy libraries imported at top level (should use dynamic imports)
   - Route transitions not using loading states
   - Analytics code not code-split
   - For each: component/library, load trigger, dynamic import implementation

6. API ROUTES STRUCTURE: Analyze API route organization.
   - API routes mixing concerns (auth + business logic + database)
   - Missing error handling in API routes
   - Missing input validation in API routes
   - Security issues: exposed secrets, missing CORS, SQL injection risk
   - API routes without proper HTTP method handling
   - Missing rate limiting
   - For each: API route, issue, security fix needed

7. DATA FETCHING STRATEGY: Evaluate data fetching approach.
   - Using getServerSideProps for cacheable data (should use getStaticProps)
   - Using getStaticProps without revalidate (stale forever)
   - Missing SWR/React Query for client-side data (causes waterfalls)
   - Unnecessary API calls in components (should use getServerSideProps or SWR)
   - For each: page/component, current strategy, optimization

8. MIDDLEWARE & REDIRECTS: Check for missing middleware benefits.
   - Redirects hardcoded in components (should use middleware)
   - Authentication checks in every page (should use middleware)
   - Locale detection not using middleware
   - Bot detection not using middleware
   - For each: use case, current implementation, middleware solution

9. ENVIRONMENT VARIABLES & CONFIG: Analyze configuration management.
   - Secrets exposed in .env.local not in .gitignore
   - Environment variables not properly namespaced
   - Runtime config vs build config confusion
   - API URLs not environment-specific
   - For each: variable, current handling, security improvement

10. DEPLOYMENT & EDGE RUNTIME: Check for edge computing opportunities.
    - Middleware that could run on edge (faster response)
    - API routes that could run on edge
    - Image optimization not leveraging edge
    - For each: opportunity, current implementation, edge benefits

NEXT.JS OPTIMIZATION ROADMAP:

RENDERING STRATEGY:
- For each page: identify optimal rendering method
  - Static (getStaticProps): high-traffic pages, pre-generated
  - ISR (revalidate time): data that updates occasionally
  - SSR (getServerSideProps): user-specific or frequently-changing
  - Client-side (useEffect + SWR): interactive features
- For each: current method, optimization, estimated improvement

IMAGE OPTIMIZATION:
- Missing Next.js Image: refactor to use Next.js Image component
- Missing height/width: add dimensions to prevent CLS
- Missing priority: identify above-fold images and add priority={true}
- Format optimization: implement WebP/AVIF support
- For each: image, improvements, estimated size savings

PERFORMANCE METRICS:
- Identify: pages with poor Core Web Vitals
- For each: FCP, LCP, INP, CLS current values and targets
- Optimization: specific fixes for each metric

SECURITY CHECKLIST (API Routes & Environment):
- API routes: input validation, error handling, rate limiting
- Environment: secrets not in code, .env.local in .gitignore
- CORS: properly configured for API routes
- Authentication: protected API routes
- Injection risks: SQL, NoSQL, command injection

DELIVERABLE FORMAT:
Next.js optimization action plan:

RENDERING STRATEGY REVIEW:
- For each page: current rendering method, analysis, recommendation
- Code example: improving rendering method if needed
- Performance impact: estimated improvement

IMAGE OPTIMIZATION:
- List: images not using Next.js Image
- List: images without height/width
- List: images not using priority
- For each: current code, optimized code, size savings

FONT OPTIMIZATION:
- Current: how fonts are loaded now
- Issues: layout shift, performance
- Solution: next/font implementation
- Code example: before/after

SCRIPT OPTIMIZATION:
- List: scripts to optimize
- For each: current loading method, recommended strategy (defer/worker/afterInteractive)
- Code example: Next.js Script component usage

DYNAMIC IMPORTS:
- List: large components/libraries to lazy-load
- For each: component, load trigger, dynamic import implementation
- Code example: dynamic import with Suspense fallback

API ROUTES REVIEW:
- For each API route: analyze, identify issues, security improvements
- List: missing validation/error handling
- List: potential security issues
- Code example: improved API route with validation and error handling

IMPORTANT:
- Provide working code examples for each optimization
- Use Next.js 14+ features (App Router if applicable)
- Include TypeScript types if project uses TypeScript
- Security: include OWASP best practices for API routes
- Performance: quantify improvements (e.g., "LCP: 2800ms → 1400ms")
- Consider: compatibility with hosting platform (Vercel, self-hosted, etc)
```

---

### 📊 RESULTADO ESPERADO:
Um plano Next.js com:
- 🛣️ **Rendering strategy** (ex: produto detail usando SSR, deveria ser SSG com ISR)
- 🖼️ **Imagens não otimizadas** (ex: `<img>` em lugar de `<Image>`, 4MB em lugar de 40KB)
- 📜 **Scripts bloqueando** (ex: Google Analytics em `<head>`, deveria usar `<Script strategy="afterInteractive">`)
- 🔀 **Code splitting** (ex: modal 2MB lazy-load apenas quando abrir)
- 🌐 **API Routes desprotegidas** (ex: `/api/users` sem autenticação, sem validação de entrada)
- 🔤 **Font loading** (ex: Google Fonts causando layout shift, usar next/font)
- 📱 **Mobile optimization** (ex: images não responsive, diferentes tamanhos para mobile/desktop)

---

## ✅ PROMPT 7: ACESSIBILIDADE & SEO

### 📖 O QUE ESTE PROMPT FAZ:
Análise de **acessibilidade (a11y) e SEO**: estrutura semântica HTML, ARIA labels, teclado navigation, screen reader compatibility, meta tags, structured data. Garante que o site é **acessível a todos** e **descobrível pelos motores de busca**.

**Específico para Front-End:**
- ♿ WCAG 2.1 AA compliance
- 🎯 Semantic HTML
- ⌨️ Keyboard navigation
- 🔊 Screen reader support
- 🔍 SEO metadata
- 📊 Structured data (Schema.org)
- 🖼️ Image alt texts
- 🎨 Color contrast

---

### 🎯 PROMPT (EXECUTE ISTO):

```
You are an Accessibility & SEO Specialist for React/Next.js. Perform comprehensive a11y and SEO audit.

OBJECTIVE:
Ensure the application is accessible to all users and discoverable by search engines following WCAG 2.1 AA standards.
Respond always in Portuguese (PT-BR).

ACCESSIBILITY ANALYSIS (WCAG 2.1 AA):

1. SEMANTIC HTML ISSUES: Identify incorrect or missing semantic tags.
   - <div> used instead of semantic elements (<header>, <nav>, <main>, <article>, <section>, <footer>)
   - Heading hierarchy issues (h1, h2, h3 not in proper order)
   - Missing or incorrect landmark elements
   - Buttons vs links confusion
   - List markup not used for lists
   - Form labels not associated with inputs
   - For each: element, issue, semantic fix

2. ARIA & LABEL ISSUES: Find missing or incorrect ARIA usage.
   - Images without alt text
   - Icons without aria-label or title
   - Form inputs without associated labels
   - Form validation errors not announced (aria-describedby, aria-invalid)
   - Modals not marked as dialog with aria-modal
   - Hidden content not marked aria-hidden
   - Loading states not announced to screen readers
   - For each: element, missing accessibility feature, ARIA implementation

3. KEYBOARD NAVIGATION: Identify keyboard accessibility issues.
   - Elements not reachable via Tab key
   - Tab order illogical (tabindex issues)
   - Modals not trapping focus (can Tab out of modal)
   - Interactive elements not keyboard-accessible (click-only handlers)
   - Keyboard shortcuts not documented
   - No skip navigation link
   - For each: element/pattern, keyboard issue, fix

4. COLOR CONTRAST: Check for accessibility color issues.
   - Text color contrast ratio < 4.5:1 (fails WCAG AA for normal text)
   - UI elements color contrast < 3:1 (fails WCAG AA for graphics)
   - Icons relying on color alone to convey meaning
   - For each: element, current ratio, required ratio, fix

5. FOCUS MANAGEMENT: Identify focus issues.
   - No visible focus indicator (outline removed without replacement)
   - Focus not managed in modals or overlays
   - Focus not restored after closing modal
   - Single Page App doesn't announce page changes
   - For each: element/pattern, focus issue, fix

6. MOTION & ANIMATION: Check for motion accessibility.
   - Autoplaying videos/animations without controls
   - Animations that could trigger vestibular issues (spinning, flashing >3x/second)
   - No prefers-reduced-motion respect
   - For each: animation, accessibility issue, fix

7. FORM ACCESSIBILITY: Analyze form structure.
   - Labels not properly associated (for/id mismatch)
   - Error messages not linked to inputs (aria-describedby)
   - Required indicators not announced
   - Form instructions not properly announced
   - Success messages not announced
   - For each: form, accessibility gap, fix

SEO ANALYSIS:

1. META TAGS & METADATA:
   - Missing or duplicate title tags (<title>)
   - Missing or thin meta descriptions
   - Duplicate descriptions across pages
   - Missing og: tags (Open Graph) for social sharing
   - Missing twitter: tags
   - For each: page, missing metadata, recommended content

2. STRUCTURED DATA:
   - Missing Schema.org markup
   - Incorrect structured data format
   - Missing key properties for content type
   - For each: page/content, recommended structured data

3. HEADING & CONTENT STRUCTURE:
   - Missing h1 or multiple h1s per page
   - Heading hierarchy illogical
   - Content not scannable (wall of text)
   - For each: page, structural issue, fix

4. INTERNAL LINKING:
   - Poor internal link structure
   - Links with generic anchor text ("click here")
   - Missing breadcrumbs
   - For each: page, linking opportunity, suggested improvements

5. IMAGE SEO:
   - Images missing alt text (also accessibility issue)
   - Alt text not descriptive
   - File names not descriptive
   - For each: image, current alt text, improved alt text

6. ROBOTS & SITEMAPS:
   - Missing robots.txt
   - Missing sitemap.xml
   - Pages blocked from crawling unintentionally
   - For each: issue, fix needed

DELIVERABLE FORMAT:
Comprehensive a11y & SEO action plan:

ACCESSIBILITY AUDIT:
Critical Issues (fail WCAG):
- Missing alt text for images
- Color contrast < 4.5:1
- Keyboard navigation broken
- Focus management missing
- Form labels not associated

High Priority:
- Missing ARIA labels
- Semantic HTML not used
- Modals not accessible
- Focus indicator removed

Medium Priority:
- Prefers-reduced-motion not respected
- Autoplaying videos not pausable

For each issue:
- Element affected
- Current behavior
- WCAG criterion failed
- Fix implementation
- Affected users: screen reader users, keyboard users, low vision users, etc

SEO AUDIT:
For each page:
- Meta title: current, assessment, improved version
- Meta description: current, assessment, improved version
- h1: present/missing, assessment
- Structured data: missing/incorrect, recommended
- Internal links: assessment, improvements
- Images: alt text assessment, improvements
- Readability: assessment, improvements

ACTIONABLE IMPROVEMENTS:
- High-impact quick wins (easy, high value)
- Medium effort improvements
- Larger refactoring needed

TOOLS RECOMMENDATION:
- Accessibility testing: axe DevTools, WAVE, Lighthouse
- SEO testing: Google Search Console, Lighthouse, SEMrush
- Manual testing: screen reader (NVDA, JAWS), keyboard navigation

IMPORTANT:
- WCAG 2.1 AA is standard (stricter than A, easier than AAA)
- Accessibility benefits everyone (keyboard shortcuts, captions, etc)
- SEO and accessibility often overlap (alt text, semantic HTML)
- Test with real assistive technology, not just automated tools
- Include: testing procedures for manual verification
- Prioritize: issues affecting most users first
```

---

### 📊 RESULTADO ESPERADO:
Um plano de a11y & SEO com:
- ♿ **Imagens sem alt text** (ex: 47 imagens sem descrição, quebra screen reader)
- 🎯 **HTML não semântico** (ex: `<div class="button">` em lugar de `<button>`)
- ⌨️ **Navegação por teclado quebrada** (ex: modal não pode fechar com ESC, Tab sai do modal)
- 🔊 **Aria labels faltando** (ex: ícones de close sem aria-label)
- 🌐 **Meta tags** (ex: título genérico "Página 1", descrição vazia)
- 📊 **Structured data** (ex: página de produto sem Schema.org markup)
- 🎨 **Contraste de cores** (ex: cinza médio em cinza claro, ratio 2:1 em lugar de 4.5:1)
- 🔍 **SEO** (ex: heading hierarchy errada h1 → h3 → h2, links genéricos "clique aqui")

---

## 🎯 ORDEM CORRETA DE EXECUÇÃO

Execute os prompts nesta sequência para máxima eficácia:

### 1️⃣ **PROMPT 1: Análise de Código Morto**
**Por quê?** Remove o "lixo" primeiro. Sem isso, os outros analisam código que não deveria estar lá.
- Tempo: ~10-15 min | Esforço: 2-4h

### 2️⃣ **PROMPT 2: Detecção de Duplicação**
**Por quê?** Depois de limpar, consolida código. Reduz superfície de manutenção.
- Tempo: ~15-20 min | Esforço: 4-8h

### 3️⃣ **PROMPT 3: Otimização de Performance**
**Por quê?** Com código limpo, otimiza o que importa. Alterações estruturais estão feitas.
- Tempo: ~15-20 min | Esforço: 3-6h

### 4️⃣ **PROMPT 4: Tratamento de Erros**
**Por quê?** Garante UX resiliente. Não depende dos passos anteriores.
- Tempo: ~10-15 min | Esforço: 3-5h

### 5️⃣ **PROMPT 5: Separação de Responsabilidades**
**Por quê?** Reorganiza arquitetura. Último passo de refatoração estrutural.
- Tempo: ~20-25 min | Esforço: 6-12h

### 6️⃣ **PROMPT 6: Otimizações Next.js**
**Por quê?** Aproveita framework features. Faz sentido após arquitetura estar sólida.
- Tempo: ~15-20 min | Esforço: 3-8h

### 7️⃣ **PROMPT 7: Acessibilidade & SEO**
**Por quê?** Último passo. Garante que app é acessível e discoverível. Complementa todos os anteriores.
- Tempo: ~20-25 min | Esforço: 4-10h

---

## 📊 RESUMO EXECUTIVO FRONT-END

| Prompt | Objetivo | Impacto | Esforço | Duração |
|--------|----------|---------|---------|---------|
| 1. Código Morto | Limpar base | Alto | Médio | 10-15 min |
| 2. Duplicação | Consolidar | Alto | Alto | 15-20 min |
| 3. Performance | Otimizar (Core Web Vitals) | Alto | Médio | 15-20 min |
| 4. Erros | UX confiável | Alto | Médio | 10-15 min |
| 5. Arquitetura | Testabilidade | Médio | Alto | 20-25 min |
| 6. Next.js | Framework features | Alto | Médio | 15-20 min |
| 7. A11y & SEO | Acessibilidade + busca | Médio | Médio | 20-25 min |

**Total de análise:** ~110-140 minutos  
**Total de implementação:** ~25-50 horas (dependendo do tamanho do projeto)

---

## 💡 DICAS DE EXECUÇÃO

1. **Execute sequencialmente**: Cada prompt presume que os anteriores foram completados
2. **Salve os relatórios**: Guarde output de cada prompt
3. **Priorize implementação**: Use priorização sugerida em cada prompt
4. **Teste após cada etapa**: Garanta que não quebrou nada
5. **Git branching**: Crie branch para cada grande refatoração
6. **Code review**: Faça review de cada mudança se trabalhar em equipe

---

## 🔗 RECURSOS & FERRAMENTAS

**Performance:**
- Lighthouse: Chrome DevTools → Lighthouse tab
- Web Vitals: web.dev/vitals
- Bundle Analysis: `npm run build -- --analyze`

**Acessibilidade:**
- axe DevTools: browser extension
- WAVE: wave.webaim.org
- NVDA: free screen reader

**SEO:**
- Google Search Console: search.google.com/search-console
- Google PageSpeed Insights: pagespeed.web.dev
- Structured Data Markup: schema.org

**Code Quality:**
- ESLint: linting
- Prettier: formatting
- SonarQube: static analysis

**Monitoramento:**
- Sentry: error tracking
- LogRocket: session replay
- Datadog: observability

---

**Documento gerado com Engenharia de Prompt Profissional**  
**Especialização: Front-End (React/Next.js) | Status: Pronto para Execução 10/10**
