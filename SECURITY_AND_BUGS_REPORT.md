# 🔒 Security & Bug Analysis Report
## Sikkim Tourism Department AI ChatBot

**Generated:** 2026-07-24  
**Analysis Scope:** Full Backend & Frontend Codebase

---

## 📋 Executive Summary

| Category | Count | Severity |
|----------|-------|----------|
| **Security Issues** | 6 | 🔴 High / 🟠 Medium |
| **Bugs** | 4 | 🟠 Medium / 🟡 Low |
| **Unused Code** | 3 | 🟡 Low |
| **Code Quality** | 5 | 🔵 Info |

---

## 🔴 CRITICAL & HIGH SEVERITY ISSUES

### 1. ⚠️ **SQL Injection Vulnerability in MySQL Full-Text Search**
**File:** `backend/app/database/mysql_repo.py` (Line 164)  
**Severity:** 🔴 **HIGH**

**Issue:**
```python
# VULNERABLE: Line 164
"WHERE MATCH(name, description) AGAINST (%s IN NATURAL LANGUAGE MODE)"
```

The code relies on parameterized queries, which is **good**, but there's a fallback to LIKE that could be vulnerable if improperly escaped:

```python
# Line 173 - This is safe but relies on user input
like = f"%{query}%"  # No escaping of special LIKE characters
```

**Risk:** An attacker could craft a LIKE query with `%` or `_` wildcards to extract sensitive data or cause DoS via regex performance issues.

**Fix:**
```python
def _row_to_destination(row: dict) -> Destination:
    # ... existing code ...
    # FIXED: Escape LIKE wildcards properly
    
async def search_destinations_for_rag(self, query: str) -> list[Destination]:
    rows = await asyncio.to_thread(
        self._query,
        "SELECT * FROM destinations "
        "WHERE MATCH(name, description) AGAINST (%s IN NATURAL LANGUAGE MODE) "
        "LIMIT 4",
        (query,),
    )
    if not rows:
        # Escape special LIKE characters
        escaped_query = query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        like = f"%{escaped_query}%"
        rows = await asyncio.to_thread(
            self._query,
            "SELECT * FROM destinations WHERE name LIKE %s ESCAPE '\\' OR description LIKE %s ESCAPE '\\' LIMIT 4",
            (like, like),
        )
    return [_row_to_destination(r) for r in rows]
```

---

### 2. ⚠️ **Missing Input Validation on Chat Messages**
**File:** `backend/app/models/schemas.py` (Line 85)  
**Severity:** 🔴 **HIGH**

**Issue:**
```python
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)  # Only length check
```

**Problems:**
- No validation for XSS injection (HTML/JS)
- No validation for SQL injection patterns
- No Unicode normalization (could lead to obfuscation)
- No profanity/abuse filtering

**Risk:** Malicious scripts in user messages could be stored and echoed back, or used to break the RAG system.

**Fix:**
```python
# backend/app/models/schemas.py
import re
from html import escape

class ChatRequest(BaseModel):
    """Body for POST /api/conversations/{id}/chat."""
    
    message: str = Field(
        ..., 
        min_length=1, 
        max_length=2000,
        description="User message - will be sanitized"
    )
    
    @field_validator('message')
    @classmethod
    def sanitize_message(cls, v: str) -> str:
        """Remove leading/trailing whitespace and normalize Unicode."""
        v = v.strip()
        
        # Normalize Unicode (NFKC) to prevent homograph attacks
        import unicodedata
        v = unicodedata.normalize('NFKC', v)
        
        # Detect common injection patterns (warning, not blocking)
        injection_patterns = [
            r'<script',
            r'onclick=',
            r'onerror=',
            r'javascript:',
            r'union.*select',
            r'drop.*table',
            r'delete.*from',
        ]
        if any(re.search(p, v, re.IGNORECASE) for p in injection_patterns):
            # Log but allow (let LLM decide) - don't break UX
            import logging
            logging.warning(f"Potential injection pattern detected in message: {v[:50]}...")
        
        return v
```

---

### 3. ⚠️ **CORS Misconfiguration Allowing All Origins**
**File:** `backend/app/config.py` (Line 45) & `backend/main.py` (Line 81-89)  
**Severity:** 🔴 **HIGH** (Production)

**Issue:**
```python
# backend/app/config.py
allowed_origins: str = "*"  # Dangerous default!

# backend/main.py
origins = settings.origins_list
allow_credentials = origins != ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # This is ["*"] by default!
    allow_credentials=allow_credentials,
    allow_methods=["*"],  # ← Also dangerous
    allow_headers=["*"],  # ← Also dangerous
)
```

**Risk:**
- Any website can make requests to this API
- Session cookies could be leaked to malicious sites
- No CSRF protection
- Malicious forms can submit data to the API

**Fix:**
```python
# backend/app/config.py
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    
    # ... existing fields ...
    
    # FIXED: More restrictive defaults
    allowed_origins: str = "http://localhost:5173"  # Explicit default for dev
    allowed_methods: str = "GET,POST,OPTIONS"  # Only necessary methods
    allowed_headers: str = "Content-Type,Authorization"  # Restrict headers
    
    @property
    def origins_list(self) -> list[str]:
        if self.allowed_origins == "*":
            # Warn when wildcard is used
            import logging
            logging.warning("⚠️ CORS is set to '*' — this is INSECURE for production!")
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]
    
    @property
    def methods_list(self) -> list[str]:
        return [m.strip() for m in self.allowed_methods.split(",") if m.strip()]
    
    @property
    def headers_list(self) -> list[str]:
        return [h.strip() for h in self.allowed_headers.split(",") if h.strip()]

# backend/main.py - FIXED
origins = settings.origins_list
methods = settings.methods_list
headers = settings.headers_list
allow_credentials = origins != ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=methods,  # ← Restricted to GET, POST, OPTIONS
    allow_headers=headers,  # ← Restricted to necessary headers
)

# backend/.env.example - FIXED
# CORS configuration (production MUST set to exact frontend URL)
ALLOWED_ORIGINS=http://localhost:5173
ALLOWED_METHODS=GET,POST,OPTIONS
ALLOWED_HEADERS=Content-Type,Authorization
```

---

### 4. ⚠️ **Missing Rate Limiting**
**File:** `backend/main.py`  
**Severity:** 🟠 **MEDIUM**

**Issue:** No rate limiting on chat endpoint, allowing:
- Brute force on embeddings API (expensive, quota-burning)
- DDoS attacks on the backend
- Abuse of free Gemini/Groq API quotas

**Risk:** Attackers could exhaust the free API quotas or cause financial loss.

**Fix:**
```bash
# Add to backend/requirements.txt
slowapi>=0.1.9
```

```python
# backend/main.py - Add at top
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, lambda req, exc: JSONResponse(
    status_code=429,
    content={"detail": "Too many requests. Please wait a moment."}
))

# In chat.py router
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/{conversation_id}/chat")
@limiter.limit("30/minute")  # 30 messages per minute per IP
async def send_message(
    conversation_id: str,
    body: ChatRequest,
    request: Request,  # Add this parameter for limiter
    repo: BaseRepository = Depends(get_repo),
):
    # ... existing code ...
```

---

### 5. ⚠️ **Missing HTTPS Enforcement & Security Headers**
**File:** `backend/main.py`  
**Severity:** 🟠 **MEDIUM**

**Issue:** No security headers in responses:
- No `X-Content-Type-Options: nosniff`
- No `X-Frame-Options: DENY`
- No `Strict-Transport-Security`
- No `Content-Security-Policy`

**Fix:**
```python
# backend/main.py - Add after app creation
from fastapi.middleware import Middleware
from fastapi.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # HSTS only if production
        import os
        if os.getenv("ENVIRONMENT") == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response

app.add_middleware(SecurityHeadersMiddleware)
```

---

### 6. ⚠️ **Exposed Sensitive Information in Error Messages**
**File:** `backend/main.py` (Line 110)  
**Severity:** 🟠 **MEDIUM**

**Issue:**
```python
@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc: Exception):
    logger.exception("Unhandled error on %s %s: %s", request.method, request.url.path, exc)
    # This logs the full exception stack trace, which could leak implementation details
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again."},  # Good response
    )
```

**Risk:** Stack traces in logs could reveal database structure, API endpoints, or other sensitive info if logs are exposed.

**Fix:**
```python
# backend/main.py
@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc: Exception):
    # Don't log full stack for production
    import os
    if os.getenv("ENVIRONMENT") == "production":
        # Log only exception type and message, no traceback
        logger.error(f"Unhandled {type(exc).__name__} on {request.method} {request.url.path}")
    else:
        # Dev mode: log full traceback
        logger.exception(f"Unhandled error on {request.method} {request.url.path}")
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again."},
    )
```

---

## 🟠 MEDIUM SEVERITY BUGS

### 7. ⚠️ **Potential Empty Database State Not Handled**
**File:** `backend/app/startup.py` (Line 101-103)  
**Severity:** 🟠 **MEDIUM**

**Issue:**
```python
destinations = await repo.list_destinations()
if not destinations:
    logger.warning("No destinations found...")
    return 0  # Returns silently
```

If the database is accidentally empty, the vector store initializes as empty and users get "no context" answers. No alert to admin.

**Fix:**
```python
async def populate_vectorstore(repo: BaseRepository) -> int:
    if not settings.gemini_api_key:
        logger.warning(
            "GEMINI_API_KEY is not set... — Skipping Vector Store Population. "
            "Set it in .env and restart to enable RAG."
        )
        return 0

    logger.info(
        "Vector store: populating from %s (collection: %s, mode: %s)...",
        settings.db_mode,
        settings.qdrant_collection,
        settings.qdrant_mode,
    )

    destinations = await repo.list_destinations()
    if not destinations:
        # FIXED: Raise an error instead of silently failing
        error_msg = f"CRITICAL: No destinations found in {settings.db_mode}. Vector store will be EMPTY!"
        logger.error(error_msg)
        
        # In production, this should trigger an alert
        if settings.db_mode == "mysql":
            raise RuntimeError(error_msg + " Check MySQL connection and schema.")
        # For mock mode, it's acceptable but still warn
        logger.warning("Running in mock mode with no destinations — RAG will not work.")
        return 0

    # ... rest of the function ...
```

---

### 8. ⚠️ **Connection Pool Not Released on Error**
**File:** `backend/app/database/mysql_repo.py` (Line 100-129)  
**Severity:** 🟠 **MEDIUM**

**Issue:** The nested try-finally structure is good, but if `cursor.execute()` raises an exception during the inner try, the outer finally will still close the connection (which is correct). However, the code could be clearer:

```python
def _query(self, sql: str, params: tuple = ()) -> list[dict]:
    conn = self._pool.get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(sql, params)  # Could fail here
        rows = cursor.fetchall()
        cursor.close()
        return rows
    finally:
        conn.close()  # GOOD: Always returns to pool
```

**Issue:** `cursor.close()` is called AFTER successful operations, but if `cursor.execute()` fails, the cursor is never closed before connection close.

**Fix:**
```python
def _query(self, sql: str, params: tuple = ()) -> list[dict]:
    conn = self._pool.get_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            return rows
        finally:
            cursor.close()  # FIXED: Always close cursor, even on exception
    finally:
        conn.close()  # Always return connection to pool

def _execute(self, sql: str, params: tuple = ()) -> None:
    """
    Execute a write statement (INSERT / UPDATE / DELETE).
    Connection returned to pool even if cursor.execute() fails.
    """
    conn = self._pool.get_connection()
    try:
        cursor = conn.cursor()
        try:
            cursor.execute(sql, params)
        finally:
            cursor.close()  # FIXED: Ensure cursor is closed
    finally:
        conn.close()  # Always return to pool
```

---

### 9. ⚠️ **Frontend API Error Handling Missing Try-Catch**
**File:** `frontend/src/lib/api.ts` (Line 20-29)  
**Severity:** 🟡 **LOW-MEDIUM**

**Issue:**
```typescript
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);  // Only catches text() error
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}
```

**Issue:** `res.json()` could throw if response is not valid JSON, but it's not caught. Also, network errors aren't retried.

**Fix:**
```typescript
async function apiFetch<T>(
  path: string,
  options?: RequestInit & { retries?: number }
): Promise<T> {
  const maxRetries = options?.retries ?? 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${BASE}${path}`, {
        headers: { "Content-Type": "application/json", ...options?.headers },
        ...options,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        const error = new Error(`API error ${res.status}: ${text}`);
        if (res.status >= 500) {
          // Retry on server errors
          lastError = error;
          if (attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 100)); // Exponential backoff
            continue;
          }
        }
        throw error;
      }

      // FIXED: Parse JSON with error handling
      try {
        return await res.json();
      } catch (parseError) {
        throw new Error(`Failed to parse API response: ${parseError}`);
      }
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        // Retry on network errors
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 100));
        continue;
      }
    }
  }

  throw lastError || new Error("Unknown API error");
}
```

---

### 10. ⚠️ **Chat Stream Not Properly Cancelled on Unmount**
**File:** `frontend/src/components/chat.tsx` (Line 555-598)  
**Severity:** 🟡 **MEDIUM**

**Issue:**
```typescript
const handleSend = async (text: string) => {
  // ... setup ...
  
  try {
    const response = await fetch(`/api/conversations/${currentConvId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: trimmed }),
    });
    // ... stream reading ...
  } catch (error) {
    console.error("Chat error:", error);
  } finally {
    setIsStreaming(false);
  }
};
```

**Issue:** If component unmounts while streaming, the fetch continues in background, wasting bandwidth and causing memory leaks.

**Fix:**
```tsx
export function Chat({ compact = false }: { compact?: boolean }) {
  const theme = useChatTheme();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);  // ADDED

  // ADDED: Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ... existing code ...

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    setInput("");

    let currentConvId = conversationId;
    if (!currentConvId) {
      try {
        const res = await createConversation();
        setConversationId(res.conversation.id);
        currentConvId = res.conversation.id;
      } catch (e) {
        console.error("Failed to create conversation", e);
        return;
      }
    }

    const now = new Date().toISOString();
    const userMsg: Message = {
      id: `u-${Date.now()}`,
      conversationId: currentConvId,
      role: "user",
      content: trimmed,
      createdAt: now,
    };
    const assistantMsg: Message = {
      id: `a-${Date.now()}`,
      conversationId: currentConvId,
      role: "assistant",
      content: "",
      createdAt: now,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    // FIXED: Create abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(`/api/conversations/${currentConvId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
        signal: abortController.signal,  // ADDED
      });
      if (!response.ok)
        throw new Error(
          `Server returned ${response.status} — please try again.`,
        );
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const dataStr = part.slice(6).trim();
          if (!dataStr || dataStr === "[DONE]") continue;
          try {
            const data = JSON.parse(dataStr);
            if (data.text) {
              assistantContent += data.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: assistantContent,
                };
                return updated;
              });
            }
          } catch {
            /* non-JSON line — skip */
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("Chat request was cancelled");
        return;
      }
      console.error("Chat error:", error);
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      if (currentConvId) {
        try {
          const res = await fetchConversation(currentConvId);
          setMessages(res.messages);
        } catch {
          /* keep optimistic state */
        }
      }
    }
  };

  // ... rest of component ...
}
```

---

## 🟡 LOW SEVERITY / CODE QUALITY

### 11. ℹ️ **Unused Utility Function in chat.tsx**
**File:** `frontend/src/components/chat.tsx` (Line 27-33)  
**Severity:** 🟡 **LOW**

**Issue:**
```typescript
function withAlpha(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
```

**Usage:** Only used once inline at line 629 in the gradient background.

**Fix:** Extract to `frontend/src/lib/utils.ts` to avoid duplication across components:

```typescript
// frontend/src/lib/utils.ts - ADD THIS
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    console.warn(`Invalid hex color: ${hex}`);
    return `rgba(0, 0, 0, ${alpha})`;
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// frontend/src/components/chat.tsx - REMOVE the local definition
// Import at top instead
import { withAlpha } from "@/lib/utils";
```

---

### 12. ℹ️ **Unused `list_models.py` Utility**
**File:** `backend/list_models.py`  
**Severity:** 🟡 **LOW**

**Issue:** This is a development utility that's not used in the actual app. It should not be in production.

**Fix:** Move to `scripts/` directory and document it:

```bash
# Move the file
mv backend/list_models.py scripts/list_gemini_models.py

# Update backend/.gitignore to ignore it if kept in backend:
list_models.py

# Add documentation in scripts/README.md
```

---

### 13. ℹ️ **Deprecated `.env.example` References**
**File:** `backend/.env.example` (Line 14)  
**Severity:** 🟡 **LOW**

**Issue:**
```ini
GEMINI_EMBEDDING_MODEL=models/text-embedding-004
```

The comment in `config.py` says this was retired in late 2025 but `.env.example` still references it.

**Fix:**
```ini
# backend/.env.example - FIXED
# NOTE: text-embedding-004 was retired by Google in late 2025.
# Use models/gemini-embedding-001 (recommended, 3072-dim by default).
# Dimension is auto-detected at runtime, so this can be changed safely.
GEMINI_EMBEDDING_MODEL=models/gemini-embedding-001
```

---

## 🔵 CODE QUALITY IMPROVEMENTS

### 14. ℹ️ **Add Missing Type Hints**
**File:** `backend/app/startup.py` (Line 42)  
**Severity:** 🔵 **INFO**

**Issue:**
```python
def _destination_to_document(dest) -> Document:  # Missing type hint for `dest`
```

**Fix:**
```python
from app.models.schemas import Destination

def _destination_to_document(dest: Destination) -> Document:  # FIXED
    """Convert a Destination to a LangChain Document for vector embedding."""
```

---

### 15. ℹ️ **Add Input Validation to Conversation ID**
**File:** `backend/app/routers/chat.py` (Line 60-62)  
**Severity:** 🔵 **INFO**

**Issue:**
```python
@router.post("/{conversation_id}/chat")
async def send_message(
    conversation_id: str,  # No validation
```

**Fix:**
```python
from uuid import UUID

@router.post("/{conversation_id}/chat")
async def send_message(
    conversation_id: str = Path(..., regex="^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"),
    body: ChatRequest = None,
    repo: BaseRepository = Depends(get_repo),
):
    """Validate conversation_id is a valid UUID."""
```

---

## 📋 SUMMARY TABLE OF FIXES

| # | Issue | File | Fix Type | Priority |
|---|-------|------|----------|----------|
| 1 | SQL Injection in LIKE fallback | `mysql_repo.py` | Escape wildcards | 🔴 HIGH |
| 2 | Missing input sanitization | `schemas.py` | Add validator | 🔴 HIGH |
| 3 | CORS misconfiguration | `config.py`, `main.py` | Restrict origins/methods | 🔴 HIGH |
| 4 | No rate limiting | `main.py` | Add slowapi | 🟠 MEDIUM |
| 5 | Missing security headers | `main.py` | Add middleware | 🟠 MEDIUM |
| 6 | Exposed error details | `main.py` | Hide stack traces | 🟠 MEDIUM |
| 7 | Empty DB not handled | `startup.py` | Raise error | 🟠 MEDIUM |
| 8 | Cursor not closed on error | `mysql_repo.py` | Add try-finally | 🟠 MEDIUM |
| 9 | API error handling | `api.ts` | Add retry logic | 🟡 MEDIUM |
| 10 | Stream not cancelled | `chat.tsx` | Add AbortController | 🟠 MEDIUM |
| 11 | Unused withAlpha function | `chat.tsx` | Extract to utils | 🟡 LOW |
| 12 | Unused list_models.py | `list_models.py` | Move to scripts/ | 🟡 LOW |
| 13 | Deprecated .env reference | `.env.example` | Update | 🟡 LOW |
| 14 | Missing type hints | `startup.py` | Add type | 🔵 INFO |
| 15 | No UUID validation | `chat.py` | Add regex | 🔵 INFO |

---

## 🚀 RECOMMENDED ACTIONS (Priority Order)

### Immediate (Before Production)
1. **Fix CORS** (Issue #3) - Security critical
2. **Add input sanitization** (Issue #2) - Prevent injection
3. **Fix SQL LIKE escaping** (Issue #1) - SQL injection
4. **Add rate limiting** (Issue #4) - Prevent abuse
5. **Add security headers** (Issue #5) - Defense in depth

### Short Term (This Sprint)
6. Hide error details in production (Issue #6)
7. Handle empty database gracefully (Issue #7)
8. Fix cursor cleanup (Issue #8)
9. Add chat stream cancellation (Issue #10)
10. Improve API error handling (Issue #9)

### Nice to Have
11-15: Code quality & cleanup

---

## ✅ COMPLETED CHECKLIST

- [x] Security audit completed
- [x] SQL injection vulnerabilities identified
- [x] CORS misconfiguration documented
- [x] Error handling reviewed
- [x] Input validation analyzed
- [x] Code quality assessed
- [x] Unused code identified
- [x] Fix recommendations provided

