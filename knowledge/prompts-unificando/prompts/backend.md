# 🏗️ Prompts Otimizados para Refatoração Backend (NestJS)
**Versão: 10/10 | Especialista Backend | Repositório Separado | Engenharia de Prompt Aplicada**

---

## 📋 Índice de Execução
1. **Arquitetura & Design Patterns NestJS**
2. **Banco de Dados & Queries Optimization**
3. **Segurança Backend (OWASP)**
4. **Performance & Escalabilidade**
5. **Testes & Observabilidade Backend**
6. **API Documentation & Contract**

---

## ✅ PROMPT 1: ARQUITETURA & DESIGN PATTERNS NESTJS

### 📖 O QUE ESTE PROMPT FAZ:
Análise arquitetural do projeto NestJS: verificação de padrões de injeção de dependência, separação de camadas (Controller, Service, Repository), módulos bem estruturados, pipes/guards/interceptors apropriados. Garante que o código é **testável, escalável e mantível**.

**NestJS Específico:**
- 🏗️ Controllers (rotas, validação)
- 🔧 Services (lógica de negócio)
- 📦 Repositories (acesso a dados)
- 🧩 Modules (organização)
- 🔐 Guards/Pipes (middlewares)
- 💉 Dependency Injection
- 🔄 Interceptors (cross-cutting concerns)
- 📝 DTOs (data validation)

---

### 🎯 PROMPT (EXECUTE ISTO):

```
You are a NestJS Architecture & Design Patterns Expert. Perform comprehensive architecture analysis.

OBJECTIVE:
Ensure NestJS application follows architectural best practices with proper separation of concerns, DI patterns, and enterprise design patterns.
Respond always in Portuguese (PT-BR).

NESTJS ARCHITECTURE ANALYSIS REQUIREMENTS:

1. CONTROLLER RESPONSIBILITIES: Check if controllers follow single responsibility.
   - Controllers with business logic (should be in Services)
   - Direct database queries in controllers (should use Repositories)
   - Complex validation in controller (should use Pipes or DTOs)
   - Multiple concerns mixed in single controller
   - Controllers too large (too many route handlers)
   - For each: controller, responsibility violations, refactoring needed

2. SERVICE LAYER QUALITY: Analyze service organization.
   - Services doing too much (multiple concerns)
   - Business logic scattered across multiple services
   - Services with hard dependencies (tight coupling)
   - Missing services for reusable logic
   - Services calling other services in chain (could be dependency injection issue)
   - For each: service, issue, refactoring needed

3. REPOSITORY PATTERN: Check data access layer.
   - Database queries in services (should be in repositories)
   - Repository abstraction missing (tightly coupled to ORM)
   - Custom repository methods missing (duplicated query logic)
   - No abstraction over database (hard to mock in tests)
   - For each: location, abstraction issue, repository pattern implementation

4. DEPENDENCY INJECTION: Analyze DI container usage.
   - Hard-coded dependencies (new SomeService()) instead of DI
   - Circular dependencies
   - Provider configuration issues
   - Module structure allowing inappropriate cross-module dependencies
   - Missing service abstraction/interfaces
   - For each: dependency, DI issue, proper injection setup

5. MODULE STRUCTURE: Check module organization.
   - Modules too large (too many providers)
   - Modules with mixed concerns
   - Inappropriate dependencies between modules
   - Missing feature modules (should be organized by features)
   - Shared module misuse
   - For each: module, organizational issue, refactoring

6. PIPES & VALIDATION: Analyze validation strategy.
   - Duplicate validation logic (pipes, decorators, services)
   - No input validation (security risk)
   - Validation errors not standardized
   - Custom pipes not properly documented
   - Missing DTO validation
   - For each: validation point, current implementation, improvement

7. GUARDS & AUTHENTICATION: Check auth/authz implementation.
   - Hard-coded permission checks in services (should be in guards)
   - Inconsistent auth checks across endpoints
   - No guard enforcement
   - Guards not properly composable
   - For each: endpoint, auth implementation, guard usage

8. INTERCEPTORS & CROSS-CUTTING CONCERNS: Analyze interceptor usage.
   - Logging duplicated across services (should be interceptor)
   - Response formatting inconsistent (should be interceptor)
   - Error handling duplicated (should be filter)
   - Performance tracking not centralized
   - For each: concern, current implementation, interceptor pattern

9. ERROR HANDLING: Check exception hierarchy and handling.
   - Generic exceptions (all errors are generic Error)
   - No custom exception types
   - Exception filters not handling all error types
   - No standard error response format
   - For each: error type, handling, custom exception needed

10. DTO VALIDATION: Analyze Data Transfer Objects.
    - No DTOs (receiving raw request data)
    - Validation in controllers instead of DTOs
    - DTOs too large (mixing multiple concerns)
    - Missing class-validator decorators
    - No transformation from entity to DTO (exposing internals)
    - For each: endpoint, DTO status, validation implementation

11. DEPENDENCY CYCLES: Identify circular dependencies.
    - Module A imports Module B imports Module A
    - Service A depends on Service B depends on Service A
    - Causing issues: import errors, initialization problems
    - For each: cycle, refactoring strategy to break cycle

12. CONFIGURATION MANAGEMENT: Check env/config handling.
    - Hard-coded values instead of config
    - .env in git (security risk)
    - No environment-specific configuration
    - Config accessed directly from process.env
    - For each: configuration, current handling, improvement

NESTJS DESIGN PATTERNS:

1. LAYERED ARCHITECTURE:
   Controller → Service → Repository → Database
   - Controller: HTTP request handling, routing
   - Service: business logic, orchestration
   - Repository: data access, queries
   - Database: persistence

2. DEPENDENCY INJECTION:
   @Injectable() services
   constructor(private dependency: Dependency) {}
   - Modules define providers
   - NestJS container manages injection

3. GUARD PATTERN (Authentication/Authorization):
   @UseGuards(AuthGuard('jwt'))
   - Guards check permissions before handler
   - Can be controller-level or method-level

4. PIPE PATTERN (Validation/Transformation):
   @Body(new ValidationPipe()) dto: CreateUserDto
   - Pipes validate/transform input
   - Can be global or method-specific

5. INTERCEPTOR PATTERN (Cross-Cutting Concerns):
   @UseInterceptors(LoggingInterceptor)
   - Interceptors wrap handler execution
   - Can modify request/response

6. EXCEPTION FILTER PATTERN:
   @Catch(CustomException)
   - Filters catch exceptions and return response
   - Standardizes error handling

DELIVERABLE FORMAT:
NestJS architecture improvement roadmap:

ARCHITECTURAL ANALYSIS:
- Current structure: modules, layers, dependencies
- Architectural issues: identified anti-patterns
- Design patterns: which are properly used, which are missing

RESPONSIBILITY ANALYSIS:
- Controller responsibilities: appropriate routing/validation?
- Service responsibilities: business logic isolation?
- Repository responsibilities: data access abstraction?
- For each layer: current state, improvements needed

MODULE ORGANIZATION:
- Current modules: list and purposes
- Issues: mixed concerns, inappropriate dependencies
- Feature modules: organization by features
- Shared module: reusable components

DEPENDENCY INJECTION:
- Current DI usage: proper or hard-coded?
- Circular dependencies: any cycles detected?
- Module providers: appropriate configuration?
- Testing: are services properly injectable?

VALIDATION STRATEGY:
- Current: where validation happens (controller, service, pipe)
- DTOs: are they using class-validator?
- Custom pipes: documented and tested?
- Standardization: consistent validation across app

SECURITY PATTERNS:
- Guard usage: authentication and authorization implemented?
- Role-based access: RBAC implementation via guards?
- Consistent auth: all protected endpoints have guards?

ERROR HANDLING:
- Exception types: custom exceptions defined?
- Error filters: handling different exception types?
- Response format: consistent error responses?
- Stack traces: exposed in production?

TESTING IMPLICATIONS:
- Dependency injection: can services be easily mocked?
- Testability: are layers properly separated?
- Test setup: what fixtures/mocks needed?
- Code examples: unit test examples for refactored code

REFACTORING ROADMAP:
- High priority: identify and fix anti-patterns
- Implementation: step-by-step refactoring guide
- Code examples: before/after for each improvement
- Risk assessment: what could break during refactoring

IMPORTANT:
- Use @nestjs/common decorators appropriately
- Leverage NestJS module system for organization
- Use Guards for authentication/authorization consistently
- Use Pipes for validation and transformation
- Use Interceptors for cross-cutting concerns
- Define custom exception types
- Use DTOs for request/response validation
- Keep Controllers thin, Services focused
- Write testable code via proper DI
- Document custom patterns with examples
```

---

### 📊 RESULTADO ESPERADO:
Um plano arquitetural mostrando:
- 🏗️ **Lógica em Controller** (ex: `UserController` faz query diretamente, deveria usar `UserService`)
- 🔧 **Service muito grande** (ex: `UserService` faz autenticação, autorização, cache, audit - deve ser separado)
- 📦 **Sem Repository** (ex: queries SQL espalhadas em Services, deveria estar em `UserRepository`)
- 💉 **Hard-coded dependencies** (ex: `new UserService()` em lugar de injetar)
- 🔐 **Sem Guards** (ex: endpoint `/admin` sem verificação de permissão)
- ✅ **Validação duplicada** (ex: validar email em Pipe E em Service)
- 🧩 **Módulos mistos** (ex: Users, Products, Orders em um único módulo)
- 📝 **Sem DTOs** (ex: recebe objeto raw, não valida)

---

## ✅ PROMPT 2: BANCO DE DADOS & QUERIES OPTIMIZATION

### 📖 O QUE ESTE PROMPT FAZ:
Análise de **performance e otimização de banco de dados**: N+1 queries, missing indexes, query efficiency, ORM usage (Prisma, TypeORM), migrations strategy, data modeling. Garante que **banco é eficiente e escalável**.

**Database Backend:**
- 🔍 Query optimization (indexes, execution plans)
- 🔄 N+1 problem detection
- 🏗️ Schema design & relationships
- 📊 Data modeling
- 🔐 Data integrity (constraints)
- 📈 Connection pooling
- 🗂️ Migrations
- 📋 Query caching

---

### 🎯 PROMPT (EXECUTE ISTO):

```
You are a Database Optimization & Backend Performance Expert. Perform comprehensive database analysis.

OBJECTIVE:
Optimize database performance, eliminate inefficiencies, and ensure scalable, maintainable database layer.
Respond always in Portuguese (PT-BR).

DATABASE ANALYSIS REQUIREMENTS:

1. N+1 QUERY PROBLEMS: Identify queries in loops.
   - Load users → loop through each user loading their posts (N+1)
   - Load posts → loop through each post loading comments (N+1)
   - Load products → loop through each product loading reviews (N+1)
   - For each: location (file, function), query pattern, eager loading solution

2. QUERY EFFICIENCY: Analyze query performance.
   - Missing SELECT columns (SELECT * instead of specific columns)
   - Slow JOINs (should use indexes on foreign keys)
   - Filtering applied after query (filter in application instead of database)
   - Sorting applied after query (should sort in database)
   - Pagination not offset-based (should use LIMIT/OFFSET)
   - For each: query, inefficiency, optimization

3. MISSING INDEXES: Detect slow query issues.
   - Frequently filtered columns without index
   - Sort columns without index
   - JOIN columns without index (foreign keys)
   - Partial indexes missing (filtered queries)
   - For each: column, usage pattern, index recommendation

4. SCHEMA DESIGN: Check data modeling.
   - Denormalization where normalization better (and vice versa)
   - Missing unique constraints (allows duplicate emails)
   - Missing not-null constraints (allows invalid data)
   - Foreign key constraints missing (referential integrity)
   - Table structure: appropriate for access patterns?
   - For each: issue, data integrity risk, schema improvement

5. RELATIONSHIP QUERIES: Analyze relationship handling.
   - Many-to-many relationships using raw join table
   - Relationship loading strategy (eager vs lazy vs SELECT * vs specific columns)
   - Recursive relationships not optimized
   - For each: relationship, loading strategy, optimization

6. TRANSACTION HANDLING: Check transaction usage.
   - Race conditions: concurrent updates without transaction
   - Transaction scope too large (locks too much)
   - Transaction scope too small (consistency issues)
   - Deadlock risks in concurrent scenarios
   - For each: operation, transaction strategy improvement

7. CONNECTION POOLING: Analyze database connection management.
   - No connection pool (new connection per query = slow)
   - Pool size not configured (default might be too small/large)
   - Connection leaks (connections not returned to pool)
   - For database setup: pool configuration recommendation

8. ORM USAGE EFFICIENCY: Check if ORM is used effectively.
   - Not using ORM features (using raw SQL everywhere = no abstraction)
   - Over-using ORM (ORM query complexity > raw SQL)
   - Query building inefficient (loading extra data)
   - For each: pattern, ORM usage assessment, recommendation

9. MIGRATION STRATEGY: Analyze schema change management.
   - No migrations (manual schema changes = error-prone)
   - Migrations not version-controlled
   - Large migrations (hard to roll back)
   - Data migrations not tested
   - For each: issue, migration setup improvement

10. DATA TYPE CHOICES: Check column type optimization.
    - Using VARCHAR(500) when VARCHAR(50) sufficient (wastes space)
    - Using TEXT for small strings
    - Using INT for IDs when BIGINT needed (overflow risk)
    - Using DECIMAL improperly for currency
    - For each: column, type issue, optimization

11. QUERY CACHING: Identify caching opportunities.
    - Expensive queries run on every request (should cache)
    - Cache invalidation strategy missing
    - Cache invalidation too aggressive (defeats purpose)
    - For each: query, caching strategy, implementation

12. SOFT DELETES VS HARD DELETES: Check deletion strategy.
    - Data permanently deleted (can't restore, audit trail lost)
    - Soft deletes everywhere (impacts query complexity)
    - Inconsistent deletion strategy
    - For each: entity, deletion strategy review

OPTIMIZATION PATTERNS:

1. EAGER LOADING:
   TypeORM/Prisma: load relationships with main query
   Instead of: SELECT * FROM users → then SELECT * FROM posts FOR EACH user
   Use: SELECT users.*, posts.* FROM users LEFT JOIN posts ON users.id = posts.userId

2. INDEXED LOOKUPS:
   For frequently filtered/sorted columns: CREATE INDEX idx_email ON users(email)
   For composite filters: CREATE INDEX idx_user_status ON users(user_id, status)

3. PAGINATION:
   SELECT * FROM users LIMIT 10 OFFSET 0
   SELECT * FROM users LIMIT 10 OFFSET 10
   (more efficient than loading all records)

4. CONNECTION POOLING:
   NestJS + Prisma/TypeORM: configure pool size
   Example: pool: { min: 2, max: 20 }

5. QUERY OPTIMIZATION:
   Use EXPLAIN ANALYZE to see query plan
   Add indexes on WHERE, JOIN, ORDER BY columns

DELIVERABLE FORMAT:
Database optimization roadmap:

QUERY PERFORMANCE AUDIT:
- Slow queries: identified queries taking >100ms
- For each: query, execution time, bottleneck
- Optimization: index, query rewrite, eager loading

N+1 ANALYSIS:
- Locations: files/functions with N+1 patterns
- For each: current query pattern, eager loading solution
- Implementation: code example with eager loading

SCHEMA REVIEW:
- Data types: review and optimization recommendations
- Constraints: missing NOT NULL, UNIQUE, FOREIGN KEY
- Relationships: appropriate normalization level
- Indexes: missing or inefficient indexes

ORM USAGE:
- Current: Prisma, TypeORM, other
- Patterns: well-used patterns, anti-patterns
- Optimization opportunities: query efficiency improvements

CONNECTION POOLING:
- Current: pool configuration
- Optimization: recommended pool size
- Monitoring: connection usage metrics

MIGRATION STRATEGY:
- Current: using Prisma migrations, TypeORM migrations, or manual
- Issues: identified migration problems
- Improvement: migration workflow setup

CACHING STRATEGY:
- Expensive queries: identified for caching
- Cache layer: Redis or in-memory cache
- Invalidation: cache invalidation strategy
- Implementation: code example with caching

TESTING:
- How to test database layer
- How to test migrations
- How to test query performance

IMPORTANT:
- Use EXPLAIN ANALYZE to verify optimizations
- Add indexes before denormalizing
- Keep migrations small and reversible
- Test migrations in production-like environment
- Monitor query performance in production
- Use connection pooling
- Avoid SELECT *, explicitly select columns
- Use transactions for data consistency
- Plan for scale (think about 1M rows)
```

---

### 📊 RESULTADO ESPERADO:
Um plano de otimização mostrando:
- 🔄 **N+1 queries** (ex: listar 100 usuários → 101 queries no BD: 1 users + 100 posts por user)
- 🔍 **Query lenta** (ex: SELECT * com WHERE sem índice, varre tabela inteira)
- 📊 **Missing index** (ex: filtro por `email` sem índice em tabela de 1M registros)
- 🏗️ **Schema ruim** (ex: VARCHAR(500) para email, INT para ID com risco de overflow)
- 📋 **Sem migration** (ex: mudanças de schema manuais, impossível versionamento)
- 🔐 **Sem constraint** (ex: permite email duplicado, FK referencing não existe)
- 📈 **Sem connection pool** (ex: nova conexão por query, lento)
- ⚠️ **Transaction missing** (ex: transferência de valores sem transação, race condition)

---

## ✅ PROMPT 3: SEGURANÇA BACKEND (OWASP)

### 📖 O QUE ESTE PROMPT FAZ:
Auditoria de **segurança em OWASP Top 10** para Backend: autenticação, autorização, input validation, SQL injection, command injection, XSS (API responses), CSRF, rate limiting, secrets management, logging de eventos sensíveis. **Crítico em produção**.

**Backend Security (OWASP):**
- 🔐 Autenticação & tokens
- 👤 Autorização (RBAC, ABAC)
- ✅ Input validation & sanitização
- 💉 Injection prevention (SQL, NoSQL, command)
- 🔑 Secrets management
- 📝 Audit logging
- 🚫 Rate limiting
- 🛡️ CORS & CSRF
- 🔒 Data encryption
- 📊 Security headers

---

### 🎯 PROMPT (EXECUTE ISTO):

```
You are a Backend Security Expert specializing in OWASP Top 10. Perform comprehensive security audit.

OBJECTIVE:
Eliminate security vulnerabilities following OWASP Top 10 standards and implement security best practices.
Respond always in Portuguese (PT-BR).

OWASP TOP 10 SECURITY ANALYSIS:

1. BROKEN AUTHENTICATION (OWASP #2):
   - Weak password policies
   - No multi-factor authentication (MFA)
   - Session tokens without expiration
   - Password reset tokens not expiring
   - JWT without signature verification
   - No account lockout after failed attempts
   - Plain-text password storage
   - For each: auth scenario, vulnerability, security fix

2. BROKEN AUTHORIZATION (OWASP #1):
   - No permission checks (user can access other users' data)
   - Role-based access control (RBAC) not enforced
   - Direct object references (user ID in URL exploitable)
   - No resource ownership verification
   - Privilege escalation vulnerabilities
   - For each: endpoint, authorization gap, guard implementation

3. INJECTION VULNERABILITIES (OWASP #3):
   SQL INJECTION:
   - Raw SQL queries with string concatenation
   - User input directly in WHERE clause
   - For each: query, parameterized query fix

   NOSQL INJECTION:
   - Mongo queries with user input: db.collection.find(userInput)
   - For each: query, sanitization fix

   COMMAND INJECTION:
   - exec() with user input
   - Shell commands constructed with user data
   - For each: command, input escaping fix

   OS COMMAND INJECTION:
   - child_process.exec() with unsanitized input
   - For each: location, command construction fix

4. INSECURE DESERIALIZATION:
   - Unsafe JSON.parse() of untrusted data
   - Pickle/serialization exploits
   - For each: deserialization point, validation needed

5. BROKEN ACCESS CONTROL (related to #2):
   - Horizontal access control: user accessing other users
   - Vertical access control: user accessing admin features
   - For each: endpoint, access control verification needed

6. SENSITIVE DATA EXPOSURE:
   - Passwords stored in plain text (should be hashed)
   - API keys in code or logs
   - Sensitive data in URLs (should be POST body with HTTPS)
   - No HTTPS enforcement
   - Sensitive data returned in API responses
   - For each: data type, exposure method, secure handling

7. INSUFFICIENT LOGGING & MONITORING:
   - Security events not logged (failed logins, unauthorized access)
   - Logs stored insecurely (accessible to users)
   - No alerting on suspicious activity
   - Logs not retained for audit
   - For each: event type, logging setup needed

8. SECURITY MISCONFIGURATIONS:
   - Debug mode enabled in production
   - Default credentials not changed
   - Unnecessary services/ports exposed
   - Missing security headers
   - CORS allowing all origins
   - For each: misconfiguration, security fix

9. USING COMPONENTS WITH KNOWN VULNERABILITIES:
   - Outdated packages with known CVEs
   - Unpatched dependencies
   - No security auditing process
   - For each: package, vulnerability, update needed

10. INSUFFICIENT RATE LIMITING:
    - No rate limiting on login (brute force risk)
    - No rate limiting on password reset (account takeover)
    - No rate limiting on API endpoints (DOS risk)
    - For each: endpoint, rate limit needed, implementation

11. CSRF & CORS MISCONFIGURATION:
    - CORS allowing wildcard origin + credentials
    - No CSRF tokens on state-changing operations
    - Missing same-site cookie attribute
    - For each: endpoint, CORS/CSRF configuration fix

12. BUSINESS LOGIC VULNERABILITIES:
    - Price manipulation (user changes product price in request)
    - Transaction manipulation (user changes transaction amount)
    - Race conditions (concurrent updates causing issues)
    - For each: business logic, validation missing, fix needed

SECURITY IMPLEMENTATION PATTERNS:

1. PASSWORD HASHING:
   Use bcrypt or argon2, NOT MD5, SHA1, SHA256
   Example: const hash = await bcrypt.hash(password, 10)
   Verify: const isValid = await bcrypt.compare(password, hash)

2. JWT IMPLEMENTATION:
   - Sign with secret: jwt.sign(payload, secret, { expiresIn: '15m' })
   - Verify before use: jwt.verify(token, secret)
   - Short-lived access tokens (15 min)
   - Long-lived refresh tokens (7 days, httpOnly)

3. INPUT VALIDATION:
   - Use Zod, Yup, or class-validator
   - Validate on API route BEFORE processing
   - Whitelist allowed values (not blacklist)
   - Sanitize HTML input if needed

4. RATE LIMITING:
   Use @nestjs/throttler or similar
   Example: 10 login attempts per 15 minutes

5. SECRETS MANAGEMENT:
   - Store in .env.local (NOT in git)
   - Use dotenv to load
   - Never log secrets
   - Rotate secrets regularly

6. AUDIT LOGGING:
   Log: user actions, failed auth, permission denials
   Include: user ID, action, timestamp, IP, result
   Store: centralized, protected, retained for compliance

DELIVERABLE FORMAT:
Backend security audit report:

OWASP VULNERABILITY ASSESSMENT:
For each OWASP Top 10 category:
- Status: vulnerable/protected/not applicable
- Findings: specific vulnerabilities if any
- Impact: security risk, exploitability
- Fix: implementation details

CRITICAL VULNERABILITIES:
- Vulnerability: description
- Location: affected endpoints/services
- Impact: security consequence
- Fix: implementation approach
- Code example: secure implementation

AUTHENTICATION & AUTHORIZATION:
- Current auth method: JWT, sessions, other
- Issues: identified vulnerabilities
- Password storage: hashing algorithm
- Token expiration: access token + refresh token strategy
- MFA: implemented or recommended

INJECTION PREVENTION:
- SQL: using parameterized queries?
- NoSQL: input validation for queries?
- Command: avoiding shell command construction?
- Deserialization: safely parsing untrusted data?

DATA PROTECTION:
- Sensitive data: how currently stored/transmitted
- Encryption: at-rest and in-transit?
- Secrets: environment variables, secrets manager?
- PII: data retention policy, GDPR compliance?

RATE LIMITING & DOS PROTECTION:
- Login endpoint: rate limit configured?
- API endpoints: rate limit per IP or user?
- File upload: size limits?
- Threshold: recommended limits

LOGGING & MONITORING:
- Events logged: authentication, authorization, data access
- Log storage: centralized, protected?
- Alerting: critical security events trigger alert?
- Retention: how long logs kept for audit?

DEPENDENCY SECURITY:
- Audit: npm audit, snyk, dependabot
- Vulnerabilities: list of packages with CVEs
- Updates: which packages need updating
- Process: how often to audit

SECURITY HEADERS:
- Server responses: including security headers?
- Recommended: HSTS, CSP, X-Frame-Options, etc
- Implementation: code example

SECURITY CHECKLIST (Go/No-Go):
- [ ] No secrets in code
- [ ] Passwords hashed (bcrypt/argon2)
- [ ] JWT with expiration
- [ ] Input validation on all endpoints
- [ ] SQL injection prevented (parameterized)
- [ ] Authorization checks on protected endpoints
- [ ] Rate limiting on sensitive operations
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Security events logged
- [ ] No debug mode in production
- [ ] Dependencies up-to-date
- [ ] Security headers configured

IMPORTANT:
- Security is multi-layered (defense in depth)
- Assume users will try to break things
- Test security with penetration testing
- Regular security audits (quarterly minimum)
- Security training for team
- Incident response plan
- GDPR/privacy compliance if applicable
- Use NIST Cybersecurity Framework as reference
- Follow principle of least privilege
```

---

### 📊 RESULTADO ESPERADO:
Um relatório de segurança com:
- 🔐 **Senha em plain text** (ex: salva diretamente, deveria ser bcrypt)
- 🚫 **Sem autorização** (ex: usuário A acessa dados de usuário B)
- 💉 **SQL injection** (ex: `SELECT * FROM users WHERE email = '${email}'`, deveria usar prepared statement)
- 🔑 **Secrets em código** (ex: API key hardcoded, deveria estar em .env)
- 🛡️ **Sem rate limiting** (ex: login atacável por brute force)
- 📝 **Sem audit log** (ex: deletou usuário, nenhuma auditoria registrada)
- ⚠️ **Token sem expiration** (ex: JWT válido para sempre)
- 🔐 **Sem MFA** (ex: apenas password, deveria ter 2FA)

---

## ✅ PROMPT 4: PERFORMANCE & ESCALABILIDADE

### 📖 O QUE ESTE PROMPT FAZ:
Análise de **performance e escalabilidade do backend**: response time das APIs, bottlenecks de CPU/memória, caching estratégico, async operations, queue systems para operações lentas, monitoring de métricas. Garante que **sistema cresce com a demanda**.

**Backend Performance:**
- ⚡ API response time
- 📊 Database optimization
- 💾 Caching (Redis, in-memory)
- 🔀 Async operations & queues
- 📈 Horizontal scalability
- 🧪 Load testing
- 📉 Memory leaks
- 🔍 Profiling & bottlenecks

---

### 🎯 PROMPT (EXECUTE ISTO):

```
You are a Backend Performance & Scalability Expert. Perform comprehensive performance and scalability analysis.

OBJECTIVE:
Optimize backend performance and ensure system can scale horizontally with increasing load.
Respond always in Portuguese (PT-BR).

BACKEND PERFORMANCE ANALYSIS:

1. SLOW ENDPOINTS: Identify API endpoints with poor response time.
   - Endpoints taking >200ms (target: <100ms for simple operations)
   - Blocking operations in request handler
   - Slow database queries
   - Unnecessary processing
   - For each: endpoint, current latency, bottleneck, optimization

2. BLOCKING OPERATIONS: Find sync operations that should be async.
   - File I/O (disk reads/writes)
   - Network calls (HTTP requests)
   - Database queries
   - Image processing, PDF generation
   - Email sending
   - For each: operation, async implementation suggestion

3. MEMORY USAGE: Analyze memory consumption.
   - Memory leaks (growing memory over time)
   - Inefficient data structures (loading entire dataset in memory)
   - Cache bloat (unbounded cache growing)
   - Connection pool issues
   - For each: issue, memory impact, fix

4. CPU USAGE: Identify CPU-intensive operations.
   - Expensive computations in request handler
   - Inefficient algorithms (n^2 instead of n)
   - Unnecessary processing
   - For each: operation, CPU impact, optimization

5. DATABASE PERFORMANCE: (See Prompt 2 for detailed DB analysis)
   - N+1 queries
   - Missing indexes
   - Inefficient query patterns
   - Connection pool saturation

6. CACHING STRATEGY: Identify caching opportunities.
   - Frequently accessed, slow-to-compute data not cached
   - Cache invalidation strategy missing
   - Cache not properly invalidated (stale data)
   - Caching overhead vs benefit (over-caching small data)
   - For each: data, caching opportunity, strategy

7. QUEUE SYSTEMS: Find operations that should be async.
   - Email sending in request handler (blocks response)
   - Image resizing in request handler
   - Report generation in request handler
   - Analytics event processing
   - For each: operation, queue system recommendation (Bull, RabbitMQ, etc)

8. HORIZONTAL SCALABILITY: Check if system can scale horizontally.
   - Session/state stored locally (can't scale across instances)
   - In-memory cache (doesn't work with multiple instances)
   - File uploads to local filesystem (doesn't work with multiple servers)
   - Background jobs on local process (doesn't scale)
   - For each: component, scalability issue, distributed solution

9. CONCURRENCY ISSUES: Identify race conditions and deadlocks.
   - Race conditions: concurrent updates without locks
   - Deadlocks: circular lock dependencies
   - Stale reads: reading old data
   - Lost updates: concurrent modifications losing data
   - For each: scenario, concurrency issue, locking strategy

10. MONITORING & METRICS: Check performance monitoring.
    - Metrics tracked: response time, error rate, throughput
    - Performance degradation: alerts on slow endpoints?
    - Capacity monitoring: how close to limits?
    - For each: metric, current monitoring, improvement

SCALABILITY PATTERNS:

1. CACHING LAYERS:
   - Application-level cache: Redis
   - Database-level cache: query cache (if available)
   - HTTP-level cache: ETag, Cache-Control headers

2. QUEUE SYSTEMS:
   - Bull.js: Redis-backed job queue
   - RabbitMQ: message broker
   - Background workers: process jobs asynchronously

3. HORIZONTAL SCALING:
   - Load balancer: distribute traffic
   - Stateless services: no session/state locally
   - Distributed cache: Redis for shared state
   - Database replication: read replicas

4. ASYNC OPERATIONS:
   - Promises/async-await: non-blocking I/O
   - Worker threads: CPU-intensive tasks
   - Stream processing: large data handling

DELIVERABLE FORMAT:
Backend performance and scalability roadmap:

PERFORMANCE AUDIT:
- Baseline metrics: current API response time, throughput
- Bottlenecks: identified slow operations
- For each bottleneck: location, impact, optimization

SLOW ENDPOINTS ANALYSIS:
- Endpoint: path and method
- Current latency: p50, p95, p99
- Bottleneck: database, compute, network
- Optimization: specific fix
- Expected improvement: latency reduction
- Code example: optimized endpoint

DATABASE PERFORMANCE:
- (See Prompt 2: Database Analysis)

BLOCKING OPERATIONS:
- For each sync operation that should be async:
  - Current: synchronous implementation
  - Issue: blocking request handler
  - Optimization: async pattern (Promise, async-await)
  - Code example: async implementation

CACHING STRATEGY:
- Frequently accessed data: identify
- Cache layer: Redis or in-memory
- Invalidation strategy: TTL or event-based
- Implementation: code example
- Monitoring: cache hit ratio

QUEUE SYSTEMS:
- Operations for queuing: identify
- Queue system: Bull, RabbitMQ, etc
- Implementation: code example
- Monitoring: queue depth, processing time

MEMORY OPTIMIZATION:
- Current memory usage: baseline
- Memory leaks: identified issues
- Optimization: fix memory leaks, optimize data structures
- Monitoring: memory usage tracking

SCALING READINESS:
- Horizontal scaling: can run multiple instances?
- Session management: distributed or stateless?
- Cache: shared (Redis) or local?
- Database: replicated or single?
- File storage: distributed or local?
- For each: current approach, scaling readiness

LOAD TESTING:
- Baseline: API latency under normal load
- Stress test: behavior at high load
- Bottleneck: where does system fail?
- Capacity: max requests/second

MONITORING & ALERTING:
- Metrics to track: response time, error rate, throughput, database latency
- Dashboards: performance visualization
- Alerts: notify on performance degradation

IMPORTANT:
- Measure actual performance before optimizing
- Profile to identify real bottlenecks
- Optimize database first (usually highest ROI)
- Use caching strategically (invalidation is hard)
- Queue slow operations (email, reports, heavy compute)
- Test scalability (load testing)
- Monitor continuously (performance regression detection)
- Design for stateless operation (horizontal scaling)
```

---

### 📊 RESULTADO ESPERADO:
Um roadmap de performance mostrando:
- ⚡ **Endpoint lent** (ex: `/api/dashboard` leva 5s, causa N+1 queries ou operação síncrona)
- 📧 **Email bloqueando request** (ex: enviar email dentro do handler, deveria ser queue)
- 💾 **Sem cache** (ex: query de 500ms roda 1000x/dia, poderia cache 1h)
- 📈 **Não escalável** (ex: sessão em memória local, não funciona com 2+ servidores)
- 🧵 **Memory leak** (ex: memória cresce dia a dia, nunca cai)
- 🔐 **DB sem índice** (ex: filtro `WHERE status = ?` varre tabela inteira)
- 🔄 **Operação síncrona** (ex: resize imagem no request handler, bloqueia response)

---

## ✅ PROMPT 5: TESTES & OBSERVABILIDADE BACKEND

### 📖 O QUE ESTE PROMPT FAZ:
Análise de **estratégia de testes e observabilidade**: unit tests (services, repositories), integration tests (API routes com banco), E2E tests, test coverage, logging, error tracking, performance monitoring. Garante **bugs pegos antes da produção** e **problemas identificados rápido**.

**Backend Testing & Monitoring:**
- 🧪 Unit tests (Jest)
- 🔗 Integration tests
- 🎭 E2E tests
- 📝 Test coverage
- 📊 Monitoring (Prometheus, DataDog)
- 📈 Performance metrics
- 🔔 Error tracking (Sentry)
- 📉 Alerting

---

### 🎯 PROMPT (EXECUTE ISTO):

```
You are a Backend Testing & Observability Architect. Perform comprehensive testing and observability audit.

OBJECTIVE:
Establish comprehensive testing strategy and production observability for reliability and rapid issue detection.
Respond always in Portuguese (PT-BR).

TESTING STRATEGY ANALYSIS:

1. UNIT TEST COVERAGE: Assess unit test quality.
   - Services: coverage percentage, edge cases tested?
   - Repositories: testing with mock database?
   - Guards/Pipes: validation logic tested?
   - Utils: utility functions tested?
   - Coverage target: 70-80% minimum
   - For each: component, coverage, improvement

2. INTEGRATION TESTS: Check integration test strategy.
   - API endpoints: testing with real database?
   - Authentication flow: full flow tested (login, token, refresh)?
   - Error scenarios: API error handling tested?
   - Database transactions: testing rollback?
   - For each: integration, coverage, test needed

3. E2E TESTS: Assess end-to-end test coverage.
   - Critical user flows: signup, login, main feature?
   - API integration: frontend calling API?
   - Error scenarios: testing error paths?
   - Concurrency: testing concurrent requests?
   - For each: flow, coverage, test needed

4. TEST ENVIRONMENT: Check test setup quality.
   - Database: test database or mocked?
   - Data fixtures: creating realistic test data?
   - Cleanup: test data cleaned between tests?
   - Isolation: tests independent of each other?
   - For each: issue, test environment improvement

5. TEST PERFORMANCE: Analyze test execution time.
   - Test suite: how long to run?
   - Slow tests: identifying bottlenecks?
   - Parallelization: tests running in parallel?
   - CI/CD: test time acceptable for deployment?
   - For each: issue, optimization

6. MOCKING STRATEGY: Check test doubles quality.
   - Database mocking: using test database or mock?
   - API mocking: mocking external services?
   - Time mocking: testing time-dependent code?
   - For each: component, mocking strategy

OBSERVABILITY & MONITORING ANALYSIS:

1. ERROR TRACKING: Check error monitoring.
   - Service: Sentry, DataDog, or custom logging?
   - Coverage: frontend, backend, API errors tracked?
   - Context: including user ID, request ID, environment?
   - Alerting: critical errors triggering alerts?
   - For each: error type, tracking status

2. PERFORMANCE MONITORING: Analyze metrics collection.
   - Metrics: response time, error rate, throughput?
   - Service: Prometheus, DataDog, CloudWatch?
   - Alerts: performance degradation triggers alert?
   - Baseline: normal performance metrics established?
   - For each: metric, monitoring status

3. STRUCTURED LOGGING: Check logging quality.
   - Format: JSON structured logging or plain text?
   - Levels: debug, info, warning, error used correctly?
   - Correlation IDs: tracing requests across services?
   - Aggregation: centralized logging (ELK, CloudWatch)?
   - For each: layer, logging strategy

4. DISTRIBUTED TRACING: Check request tracing.
   - Trace IDs: each request has unique ID?
   - Propagation: trace ID passed through services?
   - Tool: Jaeger, DataDog, or custom tracing?
   - For each: issue, distributed tracing improvement

5. ALERTING RULES: Assess alerting configuration.
   - Critical errors: error rate spike triggers alert?
   - Performance: response time degradation triggers alert?
   - Availability: downtime triggers alert immediately?
   - Thresholds: appropriate sensitivity?
   - Noise: avoiding false positives?
   - For each: alert, configuration review

6. DASHBOARDS: Check monitoring visibility.
   - Health dashboard: app status at a glance?
   - Performance dashboard: key metrics visualization?
   - Error dashboard: error trends, top errors?
   - Business metrics: signups, transactions, engagement?
   - For each: dashboard, metrics included

TESTING PATTERNS:

1. UNIT TEST STRUCTURE:
   describe('UserService', () => {
     it('should create user with valid input', () => {
       // arrange
       // act
       // assert
     });
   });

2. INTEGRATION TEST:
   describe('POST /users', () => {
     it('should create user with valid input', async () => {
       // act: make request
       const response = await request(app.getHttpServer())
         .post('/users')
         .send({ email, password });
       // assert: check response and database
       expect(response.status).toBe(201);
       expect(await db.user.findOne({ email })).toBeDefined();
     });
   });

3. E2E TEST:
   describe('User signup flow', () => {
     it('should signup, verify email, login', async () => {
       // signup
       // check email verification sent
       // verify email
       // login
       // check authenticated
     });
   });

DELIVERABLE FORMAT:
Backend testing and observability action plan:

TESTING COVERAGE ASSESSMENT:
- Current: unit test %, integration tests, E2E tests
- Gaps: critical paths without tests
- Coverage targets: 70-80% for unit, good coverage for integration

UNIT TEST STRATEGY:
- Testing framework: Jest, Vitest
- Mocking: mock database, mock external services
- Test structure: arrange-act-assert
- Code examples: sample unit tests

INTEGRATION TEST STRATEGY:
- Test database: test database with migrations
- API testing: testing endpoints with real database
- Error scenarios: testing error paths
- Code examples: sample integration tests

E2E TEST STRATEGY:
- Critical flows: identify critical user flows
- Test environment: testing against staging environment
- Data setup: realistic test data
- Code examples: sample E2E tests

TESTING IN CI/CD:
- Test execution: running on every commit
- Test environment: how tests isolate
- Performance: test suite execution time
- Flaky test management: identifying and fixing flaky tests

ERROR TRACKING SETUP:
- Service: Sentry or alternative
- SDK integration: frontend and backend SDKs
- Configuration: error sampling, PII filtering
- Alerting: rules for critical errors
- Code example: error tracking integration

PERFORMANCE MONITORING:
- Metrics: response time, error rate, throughput, database latency
- Tool: Prometheus, DataDog, CloudWatch
- Dashboards: performance visualization
- Alerting: performance degradation rules
- Code example: metrics collection

LOGGING STRATEGY:
- Format: structured JSON logging
- Levels: appropriate log level for each log
- Correlation IDs: tracing requests
- Aggregation: centralized log storage
- Code example: structured logging setup

DISTRIBUTED TRACING:
- Trace IDs: unique ID per request
- Propagation: passing trace ID through services
- Tool: Jaeger, DataDog, or custom
- Code example: distributed tracing implementation

ALERTING & DASHBOARDS:
- Critical alerts: list of critical alerts
- Thresholds: alert thresholds for metrics
- Dashboard: key metrics on single dashboard
- Notification: alert channels (email, Slack, PagerDuty)

IMPORTANT:
- Test critical paths first (authentication, payments)
- Write tests for bug fixes (prevent regression)
- Use test database for integration tests (isolated)
- Monitor actual production behavior (RUM data)
- Alert on critical issues (response time, error rate, availability)
- Review monitoring data regularly (identify trends)
- Structured logging enables easier debugging
- Distributed tracing helps with microservices debugging
```

---

### 📊 RESULTADO ESPERADO:
Um plano de testes & observabilidade mostrando:
- 🧪 **Cobertura baixa** (ex: 15% tests, serviços críticos sem testes)
- 🔗 **Sem integration tests** (ex: API routes nunca testadas com banco real)
- 🎭 **Sem E2E tests** (ex: fluxo de signup nunca automatizado)
- 📝 **Sem logging** (ex: erro silencioso, impossível debugar)
- 📊 **Sem monitoring** (ex: API lenta, time fica sabendo por user complaint)
- 🔔 **Sem alerting** (ex: app offline, time descobre 2h depois)
- 🐛 **Bugs em produção** (ex: issue reportada por user, não por testes)

---

## ✅ PROMPT 6: API DOCUMENTATION & CONTRACT

### 📖 O QUE ESTE PROMPT FAZ:
Análise de **documentação e contrato de API**: documentação OpenAPI/Swagger, tipos TypeScript compartilhados, versionamento de API, mudanças breaking, examples de requisição/resposta. Garante que **frontend e terceiros** podem consumir API facilmente.

**API Documentation:**
- 📋 OpenAPI/Swagger
- 🏷️ TypeScript types/interfaces
- 📝 Documentação de endpoints
- 🔄 Versionamento de API
- ⚠️ Breaking changes
- 📊 Rate limits & quotas
- 🔐 Auth documentation
- 📚 Examples & guides

---

### 🎯 PROMPT (EXECUTE ISTO):

```
You are an API Documentation & Design Expert. Perform comprehensive API documentation and contract audit.

OBJECTIVE:
Ensure API is well-documented, has clear contracts, and is easy to consume by frontend and third-party integrations.
Respond always in Portuguese (PT-BR).

API DOCUMENTATION ANALYSIS:

1. DOCUMENTATION PRESENCE: Check API documentation.
   - OpenAPI/Swagger spec: exists and accurate?
   - Endpoint documentation: each endpoint documented?
   - Authentication: how to authenticate documented?
   - Error responses: error codes documented?
   - Rate limiting: limits documented?
   - For each: area, documentation status

2. OPENAPI/SWAGGER QUALITY: Assess API specification.
   - Schema definitions: accurate and complete?
   - Endpoint examples: request/response examples provided?
   - Parameter validation: validation rules documented?
   - Authentication: auth scheme documented?
   - Response codes: all response codes documented?
   - For each: issue, documentation improvement

3. RESPONSE FORMAT CONSISTENCY: Check response standardization.
   - Success responses: consistent format across endpoints?
   - Error responses: standard error response format?
   - Status codes: correct HTTP codes used?
   - Headers: standard headers set?
   - For each: response type, standardization gap

4. VERSIONING STRATEGY: Analyze API versioning.
   - Version scheme: URL (/v1/) or header (API-Version)?
   - Breaking changes: backwards compatibility broken?
   - Deprecation: old endpoints deprecated properly?
   - Sunset policy: how long old versions supported?
   - For each: version, strategy review

5. REQUEST/RESPONSE EXAMPLES: Check documentation completeness.
   - Examples: realistic examples for each endpoint?
   - Error examples: error response examples?
   - Pagination: pagination examples documented?
   - Filtering: filtering syntax documented?
   - For each: endpoint, example quality

6. AUTHENTICATION DOCUMENTATION: Check auth clarity.
   - Scheme: OAuth, JWT, API key clearly documented?
   - Token format: token structure explained?
   - Expiration: token expiration and refresh explained?
   - Scope: permission scopes documented?
   - For each: auth aspect, documentation clarity

7. TYPESCRIPT TYPES: Check type safety.
   - Types generated from API spec?
   - Shared types: frontend and backend use same types?
   - Type completeness: all response fields typed?
   - Enums: enum values documented?
   - For each: type, TypeScript documentation

8. RATE LIMITING DOCUMENTATION: Check quota documentation.
   - Limits: rate limits documented?
   - Headers: rate limit headers explained (X-RateLimit-*)?
   - Retry: retry strategy documented?
   - Quotas: usage quotas documented?
   - For each: limit, documentation quality

9. BREAKING CHANGES: Identify breaking changes.
   - Removed endpoints: documented with alternative?
   - Changed response format: documented for clients?
   - Changed parameters: documented what's required now?
   - Migration guide: guide for clients to upgrade?
   - For each: breaking change, migration path

10. DEPRECATION POLICY: Check how old features are retired.
    - Deprecation notices: clearly marked in docs?
    - Sunset date: when feature will be removed?
    - Migration path: alternative provided?
    - Sunset header: Sunset header in responses?
    - For each: deprecated feature, policy adherence

API DESIGN PATTERNS:

1. RESTFUL API DESIGN:
   GET /api/v1/users - list users
   POST /api/v1/users - create user
   GET /api/v1/users/:id - get user
   PUT /api/v1/users/:id - update user
   DELETE /api/v1/users/:id - delete user

2. CONSISTENT RESPONSE FORMAT:
   Success:
   { "success": true, "data": {...}, "meta": {...} }
   
   Error:
   { "success": false, "error": { "code": "...", "message": "..." } }

3. PAGINATION STANDARD:
   GET /api/v1/users?limit=10&offset=0
   Response: { data: [...], pagination: { limit, offset, total } }

4. VERSIONING:
   URL-based: /api/v1/users
   Header-based: API-Version: 1

5. RATE LIMITING HEADERS:
   X-RateLimit-Limit: 100
   X-RateLimit-Remaining: 95
   X-RateLimit-Reset: 1234567890

DELIVERABLE FORMAT:
API documentation and design improvement plan:

DOCUMENTATION AUDIT:
- Current: documented endpoints, coverage %
- Gaps: undocumented endpoints or features
- OpenAPI: spec exists and accurate?

OPENAPI/SWAGGER GENERATION:
- Tool: Swagger decorators, automated generation
- Setup: how to generate spec from code
- Hosting: where spec is published

DOCUMENTATION IMPROVEMENTS:
- Missing documentation: list of undocumented endpoints
- For each: endpoint path, suggested documentation
- Examples: request/response examples to add

RESPONSE STANDARDIZATION:
- Current: response format variations
- Standard: recommended response format (success, error)
- Implementation: response serializer/formatter
- Code example: standardized response format

VERSIONING STRATEGY:
- Current: versioning scheme if any
- Recommendation: URL-based (/v1/) vs header-based
- Migration: how to transition clients
- Deprecation: policy for old versions

TYPESCRIPT TYPES:
- Generation: creating types from OpenAPI spec
- Sharing: shared types file between frontend/backend
- Validation: type safety at runtime
- Code example: using generated types

ERROR RESPONSE STANDARDIZATION:
- Current: error response format
- Standard: consistent error response format
- Error codes: enumeration of error codes
- Code example: standardized error response

AUTHENTICATION DOCUMENTATION:
- Scheme: clearly document auth method
- Token: token format and usage
- Expiration: token refresh flow
- Scopes: permission scopes if applicable

RATE LIMITING DOCUMENTATION:
- Limits: documented for each endpoint
- Headers: X-RateLimit-* headers explained
- Retry: retry strategy with backoff

BREAKING CHANGES POLICY:
- Versioning: how versions are managed
- Deprecation: notice period for breaking changes
- Migration: migration guides for clients
- Support: how long old versions supported

IMPORTANT:
- Keep API documentation in sync with implementation
- Auto-generate documentation from code (Swagger decorators)
- Provide working examples for every endpoint
- Document error scenarios, not just happy path
- Version API thoughtfully, minimize breaking changes
- Deprecate properly with notice period and migration guide
- Use consistent response format across API
- Type-safe API contract (TypeScript, OpenAPI)
```

---

### 📊 RESULTADO ESPERADO:
Um plano de documentação com:
- 📋 **Sem documentação** (ex: nenhuma documentação OpenAPI/Swagger)
- 📝 **Endpoints desocumentados** (ex: POST `/api/deep-sync` - o que faz? quanto tempo leva?)
- 📊 **Sem exemplos** (ex: POST `/users` documentado mas sem exemplo de request/response)
- 🔐 **Auth não documentada** (ex: como pegar token? qual formato?)
- 🔄 **Sem versionamento** (ex: mudança breaking na API quebra clientes)
- ⚠️ **Tipos não compartilhados** (ex: frontend espera `{id, name}`, API retorna `{user_id, full_name}`)
- 🚫 **Rate limit não documentado** (ex: quantas requisições por minuto?)

---

## 🎯 ORDEM CORRETA DE EXECUÇÃO

Execute os prompts nesta sequência para máxima eficácia:

### 1️⃣ **PROMPT 1: Arquitetura & Design Patterns NestJS**
**Por quê?** Base arquitetural sólida permite todas as otimizações seguintes.
- Tempo: ~20-25 min | Esforço: 6-10h

### 2️⃣ **PROMPT 2: Banco de Dados & Queries Optimization**
**Por quê?** Database é geralmente o gargalo. Otimizar BD primeiro tem maior ROI.
- Tempo: ~15-20 min | Esforço: 4-8h

### 3️⃣ **PROMPT 3: Segurança Backend (OWASP)**
**Por quê?** Crítico antes de enviar para produção. Vulnerabilidade cancela tudo.
- Tempo: ~20-25 min | Esforço: 5-10h

### 4️⃣ **PROMPT 4: Performance & Escalabilidade**
**Por quê?** Com arquitetura sólida e BD otimizado, agora aproveita caching/queues.
- Tempo: ~15-20 min | Esforço: 5-10h

### 5️⃣ **PROMPT 5: Testes & Observabilidade Backend**
**Por quê?** Garante que mudanças não quebram nada e problemas são detectados.
- Tempo: ~15-20 min | Esforço: 5-10h

### 6️⃣ **PROMPT 6: API Documentation & Contract**
**Por quê?** Último passo. Frontend e terceiros dependem de documentação clara.
- Tempo: ~15-20 min | Esforço: 2-4h

---

## 📊 RESUMO EXECUTIVO BACKEND NESTJS

| Prompt | Objetivo | Impacto | Esforço | Duração |
|--------|----------|---------|---------|---------|
| 1. Arquitetura | Design patterns | Alto | Alto | 20-25 min |
| 2. Database | Query optimization | **Crítico** | Alto | 15-20 min |
| 3. Segurança | OWASP compliance | **Crítico** | Alto | 20-25 min |
| 4. Performance | Escalabilidade | Alto | Alto | 15-20 min |
| 5. Testes & Obs | Qualidade & visibilidade | Alto | Alto | 15-20 min |
| 6. API Docs | Contract & consumo | Médio | Médio | 15-20 min |

**Total de análise:** ~95-130 minutos  
**Total de implementação:** ~27-52 horas

---

## 💡 DICAS DE EXECUÇÃO BACKEND

1. **Segurança & Database primeiro**: os critérios mais importantes
2. **Meça antes**: profile para identificar reais gargalos
3. **Testes enquanto refatora**: garante que não quebrou
4. **Monitore em produção**: os reais problemas aparecem lá
5. **Gradual**: não refatore tudo de uma vez
6. **Documentação é código**: mantém sincronizado com implementação

---

## 🔗 RECURSOS BACKEND

**Arquitetura:**
- NestJS docs: docs.nestjs.com
- Design patterns: refactoring.guru

**Database:**
- Query optimization: use EXPLAIN ANALYZE
- Indexing: database-specific guide
- Connection pooling: configure for load

**Segurança:**
- OWASP Top 10: owasp.org/top10
- Bcrypt: hashing passwords
- JWT: token-based auth

**Performance:**
- Profiling: Node.js profiler, clinic.js
- Load testing: k6, Artillery
- Caching: Redis, memcached

**Observabilidade:**
- Error tracking: Sentry
- Metrics: Prometheus, DataDog
- Logging: Winston, Pino
- Tracing: Jaeger

**Testing:**
- Unit: Jest
- Integration: supertest
- E2E: Artillery, k6

---

**Documento gerado com Engenharia de Prompt Profissional**  
**Especialização: Backend (NestJS) | Status: Pronto para Execução 10/10**
