# 🔗 Prompts Otimizados para Refatoração Full-Stack (Next.js)
**Versão: 10/10 | Especialista Full-Stack | Integração Front + Back | Engenharia de Prompt Aplicada**

---

## 📋 Índice de Execução
1. **Integração Front-Back & Fluxo de Dados**
2. **Validação & Segurança (End-to-End)**
3. **Performance End-to-End**
4. **Tratamento de Erros (Full-Stack)**
5. **Testes & Observabilidade**

---

## ✅ PROMPT 1: INTEGRAÇÃO FRONT-BACK & FLUXO DE DADOS

### 📖 O QUE ESTE PROMPT FAZ:
Análise de como **frontend e backend se comunicam** em um projeto Next.js: eficiência de chamadas API, validação em dupla camada, tipos compartilhados, transformação de dados, caching strategy. Garante que o fluxo é **eficiente e seguro**.

**Full-Stack Context:**
- 🔄 Chamadas API (fetch, axios, SWR, React Query)
- 📨 Validação front vs back
- 🏗️ Tipagem compartilhada (TypeScript)
- 💾 Caching strategy (browser, server, ISR)
- 🔀 Transformação de dados
- 📡 API design (REST, GraphQL)

---

### 🎯 PROMPT (EXECUTE ISTO):

```
You are a Full-Stack Next.js Architect specializing in front-backend integration. Analyze the communication layer between frontend and backend.

OBJECTIVE:
Optimize frontend-backend integration for efficiency, type safety, and seamless data flow while maintaining security boundaries.
Respond always in Portuguese (PT-BR).

FULL-STACK INTEGRATION ANALYSIS REQUIREMENTS:

1. API CALL EFFICIENCY: Analyze data fetching patterns.
   - N+1 problems: frontend making multiple API calls that could be consolidated
   - Over-fetching: API returning more data than needed
   - Under-fetching: frontend needing multiple calls to get required data
   - Waterfalls: sequential API calls that could be parallel
   - Unnecessary round trips: data available via getServerSideProps but fetched client-side
   - Polling vs webhooks: inefficient polling patterns
   - For each: call location, issue type, optimization strategy

2. DUPLICATE VALIDATION: Identify validation repeated on both sides.
   - Validation logic in frontend (React hook form, Zod, Yup) duplicated in backend
   - Backend validation but no frontend pre-validation (bad UX)
   - Email validation coded different ways on front vs back
   - Phone, date, custom field validation not shared
   - For each: validation rule, front location, back location, suggested shared approach

3. TYPE SAFETY ACROSS BOUNDARIES: Find type mismatches between layers.
   - TypeScript types not shared between frontend and backend
   - API response types defined twice (frontend expectations vs server reality)
   - Form input types not matching API expectations
   - Type changes in API not reflected in frontend (causes bugs)
   - No type generation from API spec (Swagger, GraphQL)
   - For each: type, mismatch risk, suggested solution (shared types file or generation)

4. DATA TRANSFORMATION: Identify unnecessary data manipulation.
   - Frontend formatting data that should be formatted by backend
   - Backend returning raw data requiring extensive client-side transformation
   - Date formatting, number formatting, enum mapping inconsistently done
   - Database field names exposed to frontend (should map to API contracts)
   - For each: data type, current transformation location, optimization

5. CACHING STRATEGY: Analyze cache usage (browser, HTTP, ISR, SWR).
   - Static pages using getServerSideProps (could use getStaticProps + ISR)
   - API responses not cached (repeated calls for same data)
   - Browser cache headers not set on API responses
   - Stale cache not invalidated after mutations
   - SWR/React Query cache not configured optimally
   - For each: endpoint/page, caching issue, strategy

6. API ROUTE ORGANIZATION: Check API route structure.
   - API routes mixed with page logic (pages/api/ files with rendering code)
   - No API versioning (breaking changes affect all clients)
   - API routes not following REST conventions
   - Missing API documentation
   - Inconsistent request/response formats across endpoints
   - For each: API route, organizational issue, structure improvement

7. ERROR PROPAGATION: Analyze how errors flow from back to front.
   - Backend errors not properly serialized for frontend (lose context)
   - Generic error messages sent to frontend (backend error details not useful)
   - Error types not distinguished (network vs validation vs server error)
   - Error recovery information not sent from backend
   - For each: error scenario, propagation issue, fix

8. REQUEST/RESPONSE CONTRACTS: Identify contract mismatches.
   - Frontend expecting different response format than backend sends
   - Optional vs required fields not documented
   - Enum values different between front (labels) and back (database values)
   - Pagination format inconsistent across API endpoints
   - For each: endpoint, contract issue, suggested standard

9. AUTHENTICATION/AUTHORIZATION FLOW: Analyze security integration.
   - Token refresh logic duplicated
   - CSRF protection not implemented
   - Credentials not sent with requests (withCredentials)
   - Protected API routes not verifying auth properly
   - Role-based access not consistent across endpoints
   - For each: auth scenario, current flow, security improvement

10. GRAPHQL VS REST: If applicable, analyze API design choice.
    - GraphQL over-complexity for simple CRUD operations
    - REST with too many endpoints for related data
    - Query depth/complexity limits not implemented (security risk)
    - DataLoader pattern not used (N+1 queries)
    - For each: endpoint, design assessment, optimization

FULL-STACK OPTIMIZATION PATTERNS:

1. SHARED TYPE DEFINITIONS:
   - Create shared types file (types/api.ts)
   - Use TypeScript to generate types from runtime values
   - Share validation schemas between front/back (Zod, Yup)
   - Document API contracts (OpenAPI/Swagger)

2. API AGGREGATION PATTERN:
   - Consolidate multiple small API calls into single endpoint
   - Use getServerSideProps to fetch all needed data server-side
   - Implement API composition layer

3. CACHE-THEN-NETWORK STRATEGY:
   - SWR/React Query: cache + revalidate
   - HTTP Cache-Control headers on API routes
   - ISR: static generation with periodic revalidation
   - For each: endpoint, appropriate caching strategy

4. OPTIMISTIC UPDATES:
   - Frontend optimistically update UI while request in-flight
   - Rollback if server rejects
   - Maintain consistency between optimistic UI and server state

DELIVERABLE FORMAT:
Full-Stack integration optimization roadmap:

FRONTEND-BACKEND ALIGNMENT:
- Current communication patterns: diagram or description
- Identified inefficiencies: N+1, over/under-fetching, waterfalls
- Data transformation: current locations, optimization
- Type safety: current state, gaps, improvement plan

API ROUTE AUDIT:
- For each API endpoint:
  - Purpose and usage
  - Request/response contract (documented or inferred)
  - Authentication/authorization
  - Error handling
  - Performance (caching, optimization)
  - Issues and improvements

VALIDATION STRATEGY:
- Current validation locations (frontend, backend, both)
- Duplicated validation logic
- Missing validation points
- Recommended: shared validation schemas

CACHING STRATEGY:
- For each page/endpoint: current caching, recommendation
- Browser caching: cache headers, HTTP caching
- Server-side caching: ISR, SWR, API caching
- Cache invalidation strategy

TYPE SAFETY IMPLEMENTATION:
- Current: how types are handled
- Gaps: type mismatches, undocumented contracts
- Solution: shared types file, schema generation
- Code example: TypeScript setup for shared types

SECURITY INTEGRATION:
- Auth flow: token handling, refresh strategy
- CSRF protection: implementation
- Cookie security: httpOnly, secure, sameSite
- Rate limiting: per endpoint, suggested limits
- Input validation: shared across front/back

ERROR HANDLING FLOW:
- Error types: network, validation, server, client
- Error propagation: how backend errors reach frontend
- Error recovery: suggested user-facing messages
- Logging: centralized error tracking

IMPORTANT:
- Provide working code examples for shared types
- Include: API route examples with validation
- Security: implement proper auth/CSRF/input validation
- Performance: quantify improvements (fewer API calls, faster response)
- Testing: how to test integration between layers
```

---

### 📊 RESULTADO ESPERADO:
Um mapa de integração mostrando:
- 🔄 **N+1 problem** (ex: listar usuários → 100 API calls para carregar avatar de cada um)
- 📨 **Validação duplicada** (ex: validação de email em React Hook Form E em API routes)
- 🏗️ **Tipos não compartilhados** (ex: frontend espera `{id, name}`, API retorna `{user_id, full_name}`)
- 💾 **Caching ineficiente** (ex: getServerSideProps a cada request, deveria ser ISR)
- 🔀 **Transformação no lugar errado** (ex: frontend formata datas que backend deveria enviar formatadas)
- 📊 **Erro genérico** (ex: "Error 500" em vez de "Email já cadastrado")
- 🔐 **Auth sem refresh** (ex: token expira, sem mecanismo de refresh automático)

---

## ✅ PROMPT 2: VALIDAÇÃO & SEGURANÇA (END-TO-END)

### 📖 O QUE ESTE PROMPT FAZ:
Auditoria de **segurança em ambas as camadas**: validação de entrada, sanitização, proteção contra XSS, CSRF, SQL injection (NÃO relevante em Next.js com ORM, mas em queries raw), autenticação/autorização, secrets management. **Crítico para produção**.

**Full-Stack Security:**
- 🛡️ Validação de entrada (front + back)
- 🔐 Autenticação (JWT, sessions, next-auth)
- 🚫 Autorização (roles, permissions)
- 🔒 Proteção CSRF
- 🧹 Sanitização (XSS prevention)
- 🔑 Secrets management
- 🚨 Rate limiting
- 📝 Audit logging

---

### 🎯 PROMPT (EXECUTE ISTO):

```
You are a Full-Stack Security Expert specializing in Next.js applications. Perform comprehensive security audit across frontend and backend.

OBJECTIVE:
Eliminate security vulnerabilities and implement security best practices across all layers (frontend, API routes, database).
Respond always in Portuguese (PT-BR).

CRITICAL SECURITY ANALYSIS REQUIREMENTS:

1. INPUT VALIDATION GAPS: Find missing or weak input validation.
   FRONTEND:
   - Client-side validation providing only UX feedback, not security
   - Type validation missing (users can send wrong types to API)
   - File upload validation (size, type, malicious files)
   - For each: input, validation status, backend validation needed

   BACKEND:
   - API routes accepting input without validation
   - No schema validation on API route handlers
   - File uploads not validated/scanned
   - Query parameters not validated
   - For each: API route, input, validation to add

2. INJECTION VULNERABILITIES: Identify injection attack vectors.
   - SQL injection: raw queries without parameterization
   - NoSQL injection: Mongo queries with user input
   - Command injection: exec() with user input
   - Template injection: rendering user data in templates
   - For each: location, injection type, parameterized query fix

3. AUTHENTICATION ISSUES: Analyze auth implementation.
   - Passwords stored in plain text (should be bcrypt/argon2)
   - JWT tokens without expiration
   - Session tokens not secure (predictable, not httpOnly)
   - "Remember me" functionality storing credentials
   - Password reset tokens without expiration/invalidation
   - For each: auth scenario, current implementation, security improvement

4. AUTHORIZATION FAILURES: Identify access control issues.
   - No checks for resource ownership (user can delete other user's data)
   - Role-based access control (RBAC) not enforced
   - API routes returning data without permission checks
   - Frontend hiding features but backend not enforcing (security theater)
   - Direct object references exploitable (user ID in URL without validation)
   - For each: resource, permission check missing, fix

5. SENSITIVE DATA EXPOSURE: Find data security issues.
   - Secrets in code/environment files not gitignored
   - API keys in frontend code (exposed to users)
   - Sensitive data in browser localStorage (no encryption)
   - Database credentials in frontend config
   - Passwords/tokens in logs
   - For each: data type, exposure method, secure handling

6. CSRF PROTECTION: Check CSRF token implementation.
   - POST/PUT/DELETE endpoints without CSRF tokens
   - Tokens not validated server-side
   - SameSite cookie attribute not set
   - For each: endpoint, CSRF protection status, implementation

7. CORS MISCONFIGURATION: Analyze cross-origin requests.
   - CORS header allowing all origins (Access-Control-Allow-Origin: *)
   - CORS allowing credentials with wildcard origin
   - Unnecessary CORS exposure
   - For each: endpoint, CORS config, recommended fix

8. XSS (CROSS-SITE SCRIPTING): Identify XSS vulnerabilities.
   - User input rendered without escaping
   - dangerouslySetInnerHTML used with user content
   - URL parameters used in href without encoding
   - Content Security Policy not configured
   - For each: location, XSS vector, escaping/sanitization fix

9. SECURITY HEADERS MISSING: Check HTTP security headers.
   - Missing Strict-Transport-Security (HSTS)
   - Missing Content-Security-Policy (CSP)
   - Missing X-Content-Type-Options: nosniff
   - Missing X-Frame-Options (clickjacking protection)
   - Missing Referrer-Policy
   - For each: header, purpose, configuration

10. RATE LIMITING: Analyze protection against abuse.
    - No rate limiting on login endpoints (brute force risk)
    - No rate limiting on file upload (DOS risk)
    - No rate limiting on public API endpoints
    - For each: endpoint, rate limit needed, strategy (IP-based, user-based)

11. DEPENDENCY VULNERABILITIES: Check security of dependencies.
    - Outdated packages with known vulnerabilities
    - Vulnerable transitive dependencies
    - No security audit process
    - For each: package, vulnerability, update/patch

12. ERROR HANDLING SECURITY: Analyze information disclosure.
    - Stack traces exposed to users in production
    - Database errors shown in UI
    - Revealing user existence (forgot password: "User not found" vs generic "Check email")
    - Debug information in production builds
    - For each: error type, information disclosed, generic error message

13. FILE UPLOAD SECURITY: Check file handling.
    - No file type validation (user uploads executable)
    - No file size limits
    - Files saved with original names (path traversal risk)
    - Files saved in web-accessible directory
    - No virus/malware scanning
    - For each: upload handler, security issue, fix

14. SESSION MANAGEMENT: Analyze session security.
    - Sessions not invalidated after logout
    - Session tokens stored in localStorage (XSS vulnerable)
    - Session tokens without secure/httpOnly flags
    - Sessions without timeout/auto-logout
    - Concurrent session management issues
    - For each: session handling, security improvement

SECURITY IMPLEMENTATION PATTERNS:

1. VALIDATION SCHEMA (Shared):
   - Use Zod or Yup for frontend validation
   - Server: import same schema for API validation
   - Type-safe: schema generates TypeScript types
   - Example: email format, password strength, custom rules

2. PASSWORD HASHING:
   - Use bcrypt (industry standard) or argon2 (more secure)
   - Never store plain-text passwords
   - Proper salt rounds configuration

3. JWT IMPLEMENTATION:
   - Short-lived access tokens (15 minutes)
   - Long-lived refresh tokens (7 days, httpOnly)
   - Token rotation on refresh
   - Signature verification on each request

4. NEXT-AUTH SETUP:
   - Use NextAuth.js for auth abstraction
   - Supports multiple providers (OAuth, credentials, etc)
   - Built-in CSRF protection
   - Session management handled

5. RATE LIMITING:
   - Use middleware for API route protection
   - IP-based or user-based limits
   - Example: 10 login attempts per 15 minutes

DELIVERABLE FORMAT:
Full-Stack security audit report:

CRITICAL VULNERABILITIES:
- Vulnerability: description
- Location: affected files/endpoints
- Impact: security risk, exploitability
- Fix: implementation
- Severity: Critical/High/Medium/Low

INPUT VALIDATION AUDIT:
- For each API route: validation status
- Missing validation: list fields
- Validation logic: current implementation vs recommended
- Code example: improved route with validation

AUTHENTICATION & AUTHORIZATION:
- Current auth method: JWT, sessions, other
- Issues: identified security gaps
- Implementation: improved auth flow
- Code example: secure login/register endpoints

SENSITIVE DATA HANDLING:
- Current: where secrets stored, how accessed
- Issues: exposure risks
- Implementation: secure handling with environment variables
- Code example: env setup, secret access

SECURITY HEADERS:
- Current: which headers implemented
- Missing: recommended headers
- Configuration: HTTP headers or Next.js middleware
- Code example: middleware/next.config.js setup

DEPENDENCY AUDIT:
- Outdated packages: list with versions
- Vulnerabilities: known CVEs
- Updates needed: which packages and versions

SECURITY CHECKLIST (Go/No-Go):
- [ ] No secrets in code
- [ ] Input validation on API routes
- [ ] Password hashing (bcrypt/argon2)
- [ ] CSRF protection
- [ ] CORS properly configured
- [ ] No XSS vulnerabilities
- [ ] Security headers set
- [ ] Rate limiting implemented
- [ ] Error handling doesn't leak info
- [ ] Sessions secure (httpOnly, secure flags)
- [ ] Dependencies updated

IMPORTANT:
- Security is defense in depth (multiple layers)
- Don't rely on client-side validation alone
- Assume users will try to break things
- Implement logging for security events (failed auth, rate limit hits)
- Use Next.js built-in security: CSP headers, secure cookies
- Regular security audits: dependency updates, code review
- Test security: penetration testing, OWASP Top 10
- GDPR/privacy: handle user data securely and legally
```

---

### 📊 RESULTADO ESPERADO:
Um relatório de segurança com:
- 🛡️ **Validação faltando** (ex: API route aceita qualquer arquivo, deveria validar tipo/tamanho)
- 💉 **Injection risk** (ex: query com interpolação de string, deveria usar parameterized)
- 🔐 **Senha em plain text** (ex: senhas não fazer hash antes de salvar)
- 🚫 **Sem CSRF token** (ex: POST endpoints sem validação de CSRF)
- 🔑 **Secrets em código** (ex: API key hardcoded, deveria estar em .env.local)
- 👤 **Sem autorização** (ex: usuário A acessa dados de usuário B)
- 🛑 **Sem rate limiting** (ex: login atacável por brute force)
- ⚠️ **Stack trace exposta** (ex: erro 500 mostra caminho do arquivo e linha)

---

## ✅ PROMPT 3: PERFORMANCE END-TO-END

### 📖 O QUE ESTE PROMPT FAZ:
Análise de **performance em ambas as camadas**: tempo de resposta da API, otimizações de banco de dados, caching strategy, lazy loading, bundle size, métricas Core Web Vitals. Garante experiência **rápida e responsiva**.

**Full-Stack Performance:**
- 🚀 API response time
- 📊 Database queries (N+1, missing indexes)
- 💾 Caching (browser, CDN, server)
- 📦 Bundle optimization
- 🔀 Code splitting
- 🖼️ Image optimization
- ⚡ Metrics (FCP, LCP, INP, CLS, TTFB)

---

### 🎯 PROMPT (EXECUTE ISTO):

```
You are a Full-Stack Performance Engineer specializing in Next.js. Conduct comprehensive end-to-end performance analysis.

OBJECTIVE:
Optimize performance across frontend, API routes, and database layer for fast, responsive user experience with excellent Core Web Vitals.
Respond always in Portuguese (PT-BR).

FULL-STACK PERFORMANCE ANALYSIS:

1. API RESPONSE TIME: Analyze API route performance.
   - Slow endpoints: identify which endpoints take >200ms
   - Database query performance: missing indexes, N+1 queries
   - API route handler efficiency: unnecessary processing
   - External API calls: timeouts, cascading failures
   - Middleware overhead: auth/logging/tracking adding latency
   - For each: endpoint, current time, optimization

2. DATABASE QUERY OPTIMIZATION: Identify slow queries.
   - Missing indexes on frequently-queried fields
   - N+1 queries: loop making separate queries per item
   - Unoptimized JOIN operations
   - Full table scans instead of indexed lookups
   - Missing database connection pooling
   - For each: query, issue, optimization (index, eager loading, etc)

3. CACHING STRATEGY: Analyze caching across layers.
   - Server-side caching: Redis, in-memory cache (if applicable)
   - HTTP caching: Cache-Control headers on API responses
   - Browser caching: SWR/React Query revalidation strategy
   - ISR: getStaticProps with revalidate time
   - Page rendering: SSR vs SSG timing
   - For each: endpoint/page, caching opportunity, strategy

4. FRONTEND PERFORMANCE BOTTLENECKS (see Frontend document for details):
   - Component re-renders
   - Image optimization
   - Bundle size
   - Code splitting
   - Core Web Vitals

5. INITIAL PAGE LOAD TIME: Analyze critical rendering path.
   - Time to First Byte (TTFB): server processing + network
   - First Contentful Paint (FCP): when first content visible
   - Largest Contentful Paint (LCP): when main content loaded
   - Cumulative Layout Shift (CLS): layout stability
   - For each: metric, current value, bottleneck, optimization

6. API ROUTE MIDDLEWARE OVERHEAD: Check middleware impact.
   - Authentication check latency
   - Logging/monitoring overhead
   - CORS headers adding delay
   - Request validation adding delay
   - For each: middleware, impact, optimization

7. DATA TRANSFORMATION EFFICIENCY: Identify expensive transformations.
   - Frontend transforming large datasets
   - Backend returning unoptimized data structure
   - Repeated calculations
   - Memory-intensive operations
   - For each: transformation, location, optimization

8. THIRD-PARTY SERVICE IMPACT: Analyze external integrations.
   - Analytics scripts blocking render
   - API gateway/proxy latency
   - Payment processor slow response
   - Email service/queue delays
   - For each: service, impact, optimization (async, deferred loading)

9. DEPLOYMENT & INFRASTRUCTURE: Check hosting optimization.
   - Geolocation: CDN edge locations
   - Serverless cold starts (if applicable)
   - Database region: proximity to app
   - Connection pooling: database connections
   - For each: service, optimization opportunity

10. RESOURCE UTILIZATION: Monitor server resources.
    - Memory usage: memory leaks, inefficient structures
    - CPU usage: expensive operations
    - Disk I/O: unoptimized file operations
    - Network bandwidth: oversized responses
    - For each: resource, usage pattern, optimization

PERFORMANCE MEASUREMENT & METRICS:

BACKEND METRICS:
- API endpoint latency: p50, p95, p99 (e.g., "95% of requests <150ms")
- Database query time: slow query logs
- Middleware overhead: timing breakdown
- Error rate: timeouts, failures

FRONTEND METRICS (Core Web Vitals):
- FCP: First Contentful Paint (<1.8s target)
- LCP: Largest Contentful Paint (<2.5s target)
- INP: Interaction to Next Paint (<200ms target)
- CLS: Cumulative Layout Shift (<0.1 target)
- TTFB: Time to First Byte (<200ms target)

BUSINESS METRICS:
- User engagement: bounce rate vs performance
- Conversion: impact of slow pages on conversion
- User satisfaction: RUM (Real User Monitoring)

OPTIMIZATION ROADMAP:

CRITICAL (immediate impact, <1 hour):
- List: slow API endpoints with optimization
- List: missing database indexes
- List: N+1 queries to fix

HIGH (significant impact, 1-4 hours):
- List: images without optimization
- List: large bundles to code-split
- List: caching opportunities (HTTP caching, ISR)

MEDIUM (measurable impact, 4-8 hours):
- List: component re-render optimization
- List: third-party script optimization
- List: database connection pooling setup

For each optimization:
- Current state: metric, timing, bottleneck
- Issue: why it's slow
- Solution: exact optimization
- Expected improvement: metric improvement
- Effort: estimated hours
- Implementation: code example

DELIVERABLE FORMAT:
Full-Stack performance optimization roadmap:

PERFORMANCE AUDIT:
- Current state: FCP, LCP, INP, CLS, TTFB metrics
- Bottlenecks: identified slow components/endpoints
- Impact: user experience, conversion, engagement

API PERFORMANCE:
- For each slow endpoint:
  - Current latency: p50, p95, p99
  - Bottleneck: query, middleware, logic
  - Optimization: specific fix with impact
  - Implementation: code example

DATABASE OPTIMIZATION:
- Slow queries: identified queries, execution time
- Missing indexes: recommended indexes
- N+1 queries: examples, eager loading solution
- Connection pooling: setup if needed
- Code example: optimized query or schema

CACHING STRATEGY:
- Frontend: browser caching, SWR strategy
- HTTP: Cache-Control headers per endpoint
- Server-side: Redis/in-memory cache if applicable
- ISR: revalidate times for static pages
- For each: endpoint/page, strategy, implementation

IMAGE OPTIMIZATION:
- Missing Next.js Image: refactor
- Missing height/width: add dimensions
- Format optimization: WebP/AVIF
- Size: current, optimized, savings

BUNDLING & CODE-SPLITTING:
- Current bundle size: total, main chunk
- Large components: lazy loading candidates
- Code splitting opportunities: routes, components
- Dependency bloat: removable dependencies

IMPORTANT:
- Measure actual performance (Real User Monitoring)
- Don't optimize premature: profile first, optimize bottlenecks
- Consider: trade-offs (complexity vs performance gain)
- Test on real devices/networks (not just localhost)
- Monitor continuously: performance regression detection
- Include: before/after metrics for each optimization
- Use tools: Lighthouse, Chrome DevTools, database profilers
```

---

### 📊 RESULTADO ESPERADO:
Um roadmap de performance mostrando:
- 🚀 **API lenta** (ex: `/api/users` leva 2s, N+1 queries ou missing index)
- 📊 **Queries sem índice** (ex: `WHERE email = ?` em tabela de 1M registros sem índice)
- 💾 **Caching ausente** (ex: `GET /api/products` sempre consulta DB, deveria cache 5 min)
- 📦 **Bundle grande** (ex: 500KB JS, 3 bibliotecas fazem o mesmo)
- 🖼️ **Imagens não otimizadas** (ex: imagens 4MB em lugar de 100KB)
- ⚡ **LCP lento** (ex: 3.5s, deveria ser <2.5s - otimizar imagem principal)
- 🔀 **Sem code-splitting** (ex: componente 200KB carrega mesmo que user não acesse)

---

## ✅ PROMPT 4: TRATAMENTO DE ERROS (FULL-STACK)

### 📖 O QUE ESTE PROMPT FAZ:
Auditoria de **tratamento de erros em ambas as camadas**: API routes com try/catch adequados, propagação de erros para frontend, feedback ao usuário, logging/monitoring, recuperação automática. Garante **experiência resiliente e confiável**.

**Full-Stack Error Handling:**
- 🛡️ API route error handling
- 📡 Error propagation (back to front)
- 👤 User feedback (toast, modal, inline)
- 📝 Logging & monitoring
- 🔄 Retry & recovery
- 🚨 Error boundaries React
- ⚠️ Validation errors

---

### 🎯 PROMPT (EXECUTE ISTO):

```
You are a Full-Stack Error Handling & Reliability Specialist. Perform comprehensive error handling analysis across frontend and backend.

OBJECTIVE:
Ensure resilient error handling across all layers, with graceful failures and clear user feedback while maintaining security and observability.
Respond always in Portuguese (PT-BR).

FULL-STACK ERROR HANDLING ANALYSIS:

1. API ROUTE ERROR HANDLING: Check server-side error management.
   - API routes without try/catch wrapping
   - Catch blocks with no error handling (empty catch)
   - Unhandled promise rejections in async handlers
   - Missing error response formatting
   - Exposing stack traces to clients (security issue)
   - No error logging/monitoring
   - For each: API route, error handling gap, fix

2. HTTP ERROR RESPONSES: Analyze error response standardization.
   - Inconsistent error response format (sometimes {error}, sometimes {message}, sometimes plain text)
   - Missing HTTP status codes or incorrect codes
   - No error codes for error recovery (should distinguish network vs validation vs server)
   - Error messages too technical for users
   - For each: endpoint, error format, standardization

3. FRONTEND API ERROR HANDLING: Check frontend-side error catching.
   - fetch() calls without error catch
   - axios/HTTP client without error interceptor
   - Unhandled promise rejections in useEffect
   - Missing error state in components
   - Silent failures with no user feedback
   - For each: location, error handling gap, fix

4. ERROR PROPAGATION: Analyze error flow from backend to frontend.
   - Errors caught on backend but not communicated to frontend
   - Error context lost in translation (user-facing message too generic)
   - Original error details not available for debugging
   - No distinguishing between different error types
   - For each: error type, propagation issue, fix

5. USER-FACING ERROR MESSAGES: Identify unhelpful error feedback.
   - Generic messages ("An error occurred")
   - Technical messages ("TypeError: Cannot read properties of undefined")
   - No actionable recovery suggestions
   - Messages in wrong language (app i18n not applied)
   - No retry mechanism offered
   - For each: error type, current message, improved user-friendly message

6. VALIDATION ERROR HANDLING: Check form validation flow.
   - Backend validation errors not matching frontend schema
   - Field-level errors not displayed to user
   - Server-side validation returning unhelpful messages
   - Race condition: user changes form while validation pending
   - No clear indication which field has error
   - For each: form, validation error handling, improvement

7. DATABASE ERROR HANDLING: Analyze database error scenarios.
   - Duplicate key errors not caught (constraint violations)
   - Foreign key constraint errors not handled
   - Connection errors causing crashes
   - Timeout errors without retry
   - Transaction rollback not propagating error
   - For each: error type, handling, improvement

8. EXTERNAL SERVICE ERROR HANDLING: Check third-party integration resilience.
   - API gateway/proxy failures causing app crash
   - Payment processor timeout with no recovery
   - Email service failure silent (user doesn't know email wasn't sent)
   - Cascading failures (one service failure bringing down app)
   - No retry strategy for transient failures
   - For each: service, failure scenario, error handling

9. NETWORK ERROR HANDLING: Analyze connection resilience.
   - No distinction between connection error vs server error
   - Timeout handling: requests hanging indefinitely
   - Offline mode not considered
   - No retry strategy for network failures
   - No fallback UI for offline state
   - For each: scenario, current handling, improvement

10. MONITORING & LOGGING: Check error observability.
    - Errors not logged anywhere (invisible failures)
    - Logs contain sensitive data (passwords, tokens)
    - No centralized error tracking (Sentry, DataDog, etc)
    - Error severity not classified
    - No alerting for critical errors
    - For each: error type, current logging, monitoring setup needed

11. ERROR BOUNDARIES: Check React error isolation.
    - No Error Boundaries (one component error crashes entire page)
    - Error Boundaries not properly scoped
    - Boundary fallback UI not helpful
    - Error Recovery (retry mechanism) not implemented
    - For each: component, boundary protection needed, fallback UI

12. RECOVERY MECHANISMS: Identify missing auto-recovery.
    - Failed requests not retried automatically
    - No exponential backoff on retries (hammers server)
    - Manual retry button not offered to user
    - Failed mutations not rolled back
    - Cache not invalidated on failure
    - For each: scenario, recovery mechanism needed

FULL-STACK ERROR PATTERNS:

1. STANDARDIZED ERROR RESPONSE:
   Backend responds consistently:
   {
     "success": false,
     "error": {
       "code": "VALIDATION_ERROR" | "NOT_FOUND" | "UNAUTHORIZED" | "INTERNAL_ERROR",
       "message": "User-friendly message",
       "details": { "field": "email", "reason": "already_taken" },
       "retryable": true | false
     }
   }

2. ERROR CLASSIFICATION:
   - VALIDATION: user input invalid
   - NOT_FOUND: resource doesn't exist
   - UNAUTHORIZED: user not authenticated
   - FORBIDDEN: user not authorized
   - CONFLICT: state conflict (duplicate, constraint violation)
   - RATE_LIMITED: too many requests
   - INTERNAL_ERROR: server error

3. RETRY STRATEGY:
   - Retryable errors: network, timeout, 429, 5xx
   - Non-retryable: 400, 401, 403, 404
   - Exponential backoff: 1s, 2s, 4s, 8s... (max 60s)
   - Max retries: typically 3-5

4. USER-FACING ERROR MESSAGES:
   - Validation: "Email is already in use. Try another email."
   - Network: "Connection failed. Check your internet and try again."
   - Server: "Something went wrong. Our team has been notified. Please try again in a moment."
   - Unauthorized: "Your session expired. Please log in again."

DELIVERABLE FORMAT:
Full-Stack error handling improvement plan:

BACKEND ERROR HANDLING:
- For each API route:
  - Current error handling: try/catch status
  - Error scenarios: what could fail
  - Error response: format, message
  - Issues: identified gaps
  - Fix: improved implementation
  - Code example: try/catch, error response

FRONTEND ERROR HANDLING:
- For each API integration:
  - Current error handling: .catch() status
  - Error UI: how errors shown to user
  - Error scenarios: network, validation, server
  - Issues: identified gaps
  - Fix: error boundary, error state, retry
  - Code example: safe API call with error handling

ERROR RESPONSE STANDARDIZATION:
- Current: how errors formatted currently
- Standard: recommended error response format
- Implementation: middleware to standardize responses
- Code example: API response wrapper

USER-FACING MESSAGES:
- For each error type:
  - Technical error: what actually happened
  - User message: clear, actionable, helpful
  - Recovery suggestion: what user should do

MONITORING & LOGGING:
- Error tracking: service setup (Sentry, DataDog, etc)
- Logging: what to log, where, how to query
- Alerting: critical errors notified
- Code example: error tracking integration

ERROR RECOVERY:
- Retry strategy: exponential backoff implementation
- Fallback UI: what to show if operation fails
- Graceful degradation: feature unavailable but app works
- Manual recovery: retry button UI

IMPORTANT:
- Don't expose stack traces to users (security)
- Log stack traces on backend (debugging)
- Distinguish error types: network vs validation vs server
- Provide actionable messages: "Email already taken" not "Error"
- Test error scenarios: offline mode, timeouts, server errors
- Monitor continuously: error rates, most common errors
- Set up alerting: critical errors should notify team
```

---

### 📊 RESULTADO ESPERADO:
Um plano de confiabilidade com:
- 🛡️ **API routes desprotegidas** (ex: `/api/delete-user` sem try/catch)
- 📡 **Erro genérico** (ex: "Error 500" em lugar de "Email já cadastrado")
- 👤 **Sem feedback** (ex: requisição falha, user não sabe se enviou ou não)
- ⛓️ **Promise rejection não tratada** (ex: async função sem catch)
- 🔄 **Sem retry automático** (ex: falha de rede = falha permanente)
- 🛡️ **Sem error boundary** (ex: página inteira quebra com erro em um componente)
- 📝 **Sem logging** (ex: erros desaparecem, impossible debugar em produção)

---

## ✅ PROMPT 5: TESTES & OBSERVABILIDADE

### 📖 O QUE ESTE PROMPT FAZ:
Análise de **estratégia de testes e observabilidade** no projeto full-stack: cobertura de testes (unitários, integração, E2E), testing libraries, CI/CD pipeline, logging/monitoring, performance tracking. Garante que **bugs são pegos antes da produção** e **problemas são identificados rápido**.

**Full-Stack Testing & Monitoring:**
- 🧪 Unit tests (Jest, Vitest)
- 🔗 Integration tests
- 🎭 E2E tests (Playwright, Cypress)
- 📝 Test coverage
- 📊 Monitoring & observability
- 📈 Performance tracking
- 🔔 Alerting
- 📉 Error tracking

---

### 🎯 PROMPT (EXECUTE ISTO):

```
You are a Full-Stack Testing & Observability Architect. Perform comprehensive testing and observability audit.

OBJECTIVE:
Establish comprehensive testing strategy and production observability to ensure quality, reliability, and rapid issue detection.
Respond always in Portuguese (PT-BR).

TESTING STRATEGY ANALYSIS:

1. UNIT TEST COVERAGE: Assess unit test quality and coverage.
   - Utilities/helpers: coverage percentage, critical functions missing tests
   - Custom hooks: coverage percentage, edge cases tested
   - Components: coverage percentage, integration with props/state
   - API routes: coverage percentage, error scenarios tested
   - Missing tests: critical functions without tests
   - Flaky tests: tests that fail intermittently
   - For each: component/function, coverage, improvement

2. INTEGRATION TEST GAPS: Identify missing integration tests.
   - API integration: frontend calling API routes end-to-end
   - Database integration: API routes with real database queries
   - Authentication flow: login, logout, token refresh
   - Error scenarios: API errors propagating to frontend
   - Form submission: frontend form → API → database → response
   - For each: integration, coverage, test needed

3. END-TO-END (E2E) TEST COVERAGE: Check E2E test strategy.
   - Critical user flows: signup, login, main feature, payment (if applicable)
   - Error scenarios: form validation, server errors, network failures
   - Edge cases: concurrent actions, race conditions
   - Cross-browser testing: Chrome, Firefox, Safari, mobile
   - For each: user flow, coverage status, test needed

4. TEST EXECUTION & CI/CD: Analyze testing in pipeline.
   - Tests running on every commit: coverage, pass rate
   - Test environment: using real database or mocked
   - Test data: fixtures, seeding strategy
   - Flaky test investigation: timeouts, state issues
   - Test performance: how long test suite takes to run
   - For each: issue, current status, improvement

5. MOCKING & TEST DOUBLES: Check test isolation.
   - API mocking: fetch/axios mocked or real API
   - Database mocking: in-memory vs test database
   - External services mocked: payment, email, auth
   - Mock data: realistic or placeholder data
   - For each: integration point, mocking strategy, improvement

6. TESTING LIBRARIES: Assess testing tool choices.
   - Frontend: Jest, Vitest, Testing Library
   - Backend: Jest, supertest, factory libraries
   - E2E: Playwright, Cypress, WebDriver
   - For each: tool, adoption, alternative if better option

OBSERVABILITY & MONITORING ANALYSIS:

1. ERROR TRACKING: Check error monitoring setup.
   - Errors tracked: Sentry, DataDog, Bugsnag, custom logging
   - Coverage: frontend errors, backend errors, API errors
   - Context: user ID, session ID, affected feature
   - Severity: errors classified and prioritized
   - Alerting: critical errors notified to team
   - For each: error type, tracking status, setup needed

2. PERFORMANCE MONITORING: Analyze performance tracking.
   - Frontend metrics: FCP, LCP, INP, CLS measured
   - API metrics: response time, error rate, throughput
   - Database metrics: query latency, connection pool, slow queries
   - User experience: RUM (Real User Monitoring) data
   - Alerting: performance regressions detected
   - For each: metric, current tracking, monitoring setup

3. LOGGING STRATEGY: Check structured logging.
   - Frontend logging: which events logged, where sent
   - Backend logging: API requests/responses, business events
   - Log format: structured (JSON) or unstructured (text)
   - Log levels: debug, info, warning, error used appropriately
   - Log aggregation: centralized logging (CloudWatch, ELK, Datadog)
   - For each: layer, logging strategy, improvement

4. DEBUGGING TOOLS: Assess debugging capabilities.
   - Frontend: React DevTools, Redux DevTools available
   - Backend: Node debugger, IDE breakpoints configured
   - Network: DevTools Network tab shows API interactions
   - Performance: Lighthouse, Chrome Profiler accessible
   - For each: tool, setup status, debugging capability

5. ALERTING STRATEGY: Check alerting rules and thresholds.
   - Critical alerts: errors, downtime, performance degradation
   - Thresholds: error rate, response time, database latency
   - Notifications: email, Slack, PagerDuty
   - Alert fatigue: avoiding false positives
   - For each: alert type, threshold, notification channel

6. DASHBOARDS & VISIBILITY: Analyze monitoring dashboards.
   - Health dashboard: app status, key metrics
   - Performance dashboard: response times, Core Web Vitals
   - Error dashboard: error trends, most common errors
   - Business metrics: user signups, transactions, engagement
   - For each: dashboard, current status, metrics to add

TESTING & OBSERVABILITY ROADMAP:

UNIT TEST STRATEGY:
- Test coverage targets: typically 70-80% (higher for critical paths)
- Testing pyramid: many unit tests, some integration, few E2E
- Critical paths: authentication, payments, core features
- For each: component/function, coverage, test examples

INTEGRATION TEST STRATEGY:
- API integration: frontend calls API, API calls database
- Authentication: test full auth flow
- Error handling: test error scenarios end-to-end
- For each: integration, test setup, test examples

E2E TEST STRATEGY:
- Critical user flows: signup, login, main feature
- Browsers/devices: Chrome, Firefox, mobile
- Schedule: daily or on-demand
- Maintenance: updating as UI changes
- For each: user flow, E2E test setup

ERROR TRACKING SETUP:
- Tool: Sentry or similar
- Integration: frontend and backend SDKs
- Configuration: error sampling, PII filtering
- Alerting: rules for critical errors
- Code example: error tracking integration

PERFORMANCE MONITORING SETUP:
- Frontend: Web Vitals tracking
- Backend: response time monitoring
- Database: slow query monitoring
- Dashboard: metrics visualization
- Alerting: performance regression rules
- Code example: performance monitoring integration

LOGGING STRATEGY:
- Structured logging: JSON format
- Log levels: appropriate level for each log
- Correlation IDs: tracing requests across services
- Aggregation: centralized log storage
- Code example: structured logging setup

DELIVERABLE FORMAT:
Full-Stack testing and observability action plan:

TESTING COVERAGE ASSESSMENT:
- Current: unit test %, integration tests, E2E tests
- Gaps: critical paths without tests
- Improvement: testing strategy and priorities

TESTING SETUP:
- Tools: Jest, Testing Library, Playwright selections
- Configuration: test environment, mocking strategy
- CI/CD: test execution in pipeline
- Code examples: unit test, integration test, E2E test

ERROR TRACKING IMPLEMENTATION:
- Service setup: Sentry or alternative
- Integration: frontend and backend SDKs
- Configuration: environment, error sampling
- Alerting: rules for critical errors
- Code example: error tracking setup

PERFORMANCE MONITORING:
- Frontend: Web Vitals tracking
- Backend: API monitoring
- Database: query monitoring
- Dashboard: metrics visualization
- Code example: monitoring integration

LOGGING STRATEGY:
- Format: structured (JSON)
- Levels: debug, info, warning, error
- Aggregation: log storage and searching
- Code example: logging implementation

IMPORTANT:
- Test critical paths first (authentication, payments, core features)
- Write tests for bug fixes (prevent regression)
- Mock external services in tests (faster, deterministic)
- Monitor real user experience (RUM data)
- Alert on critical issues (response time, error rate)
- Review monitoring data regularly
- Use tools: Jest for unit tests, Playwright for E2E, Sentry for errors
```

---

### 📊 RESULTADO ESPERADO:
Um plano de testes & observabilidade mostrando:
- 🧪 **Cobertura baixa** (ex: 20% tests, componentes críticos não testados)
- 🔗 **Sem testes de integração** (ex: form submission não testa full flow)
- 🎭 **Sem E2E tests** (ex: fluxo de signup nunca testado automaticamente)
- 📝 **Sem logging** (ex: erros silenciosos, impossible debugar)
- 📊 **Sem monitoring** (ex: API lenta, ninguém sabe até user reclamar)
- 🔔 **Sem alerting** (ex: app offline, time fica sabendo por email em 2h)
- 🐛 **Bugs em produção** (ex: issue reportada por user, não por testes)

---

## 🎯 ORDEM CORRETA DE EXECUÇÃO

Execute os prompts nesta sequência para máxima eficácia:

### 1️⃣ **PROMPT 1: Integração Front-Back & Fluxo de Dados**
**Por quê?** Entender como as camadas se comunicam garante otimizações corretas depois.
- Tempo: ~15-20 min | Esforço: 3-6h

### 2️⃣ **PROMPT 2: Validação & Segurança (End-to-End)**
**Por quê?** Antes de qualquer outra otimização, segurança é crítica. Uma vulnerabilidade cancela todas as otimizações.
- Tempo: ~20-25 min | Esforço: 4-8h

### 3️⃣ **PROMPT 3: Performance End-to-End**
**Por quê?** Com segurança garantida, otimiza o que importa. Dados sobre gargalos informam priorização.
- Tempo: ~15-20 min | Esforço: 5-10h

### 4️⃣ **PROMPT 4: Tratamento de Erros (Full-Stack)**
**Por quê?** Garante UX resiliente. Complementa segurança e performance com confiabilidade.
- Tempo: ~10-15 min | Esforço: 3-5h

### 5️⃣ **PROMPT 5: Testes & Observabilidade**
**Por quê?** Último passo. Garante que mudanças não quebram nada e problemas são detectados.
- Tempo: ~15-20 min | Esforço: 5-12h

---

## 📊 RESUMO EXECUTIVO FULL-STACK

| Prompt | Objetivo | Impacto | Esforço | Duração |
|--------|----------|---------|---------|---------|
| 1. Integração F-B | Comunicação eficiente | Alto | Médio | 15-20 min |
| 2. Segurança | Proteção total | **Crítico** | Alto | 20-25 min |
| 3. Performance | Velocidade | Alto | Alto | 15-20 min |
| 4. Erros | Confiabilidade | Alto | Médio | 10-15 min |
| 5. Testes & Obs | Qualidade & visibilidade | Alto | Alto | 15-20 min |

**Total de análise:** ~75-100 minutos  
**Total de implementação:** ~20-41 horas

---

## 💡 DICAS DE EXECUÇÃO FULL-STACK

1. **Segurança primeiro**: não otimize um código inseguro
2. **Meça antes**: profile para identificar reais gargalos
3. **Teste tudo**: mudanças podem quebrar integração front-back
4. **Monitore em produção**: os reais problemas aparecem em produção
5. **Gradual**: não refatore tudo de uma vez, trabalhe em sprints

---

**Documento gerado com Engenharia de Prompt Profissional**  
**Especialização: Full-Stack (Next.js) | Status: Pronto para Execução 10/10**
