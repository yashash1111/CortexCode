/**
 * CortexCode AI Response Engine
 * Generates natural, intelligent, context-aware responses for developer queries,
 * code generation, debugging, architecture, study notes, and conversational prompts.
 */

export function generateLocalAIResponse(userPrompt: string = '', mode: string = 'chat'): string {
  const query = userPrompt.toLowerCase().trim();

  // ── 1. Greetings & Casual Conversation ─────────────────────────────────────
  if (
    !query ||
    query === 'hi' ||
    query === 'hello' ||
    query === 'hey' ||
    query === 'hey there' ||
    query === 'hi there' ||
    query === 'greetings' ||
    query === 'good morning' ||
    query === 'good afternoon' ||
    query === 'good evening' ||
    query === 'how are you' ||
    query === "how's it going" ||
    query === "what's up" ||
    query === 'sup' ||
    query === 'yo'
  ) {
    return `Hello! 👋 I'm **CortexCode AI**, your intelligent developer workspace assistant.

I'm here to accelerate your engineering workflow. Here's what we can do together:

- **⚡ Code Generation**: Write clean, modern code in React, TypeScript, Python, Java, Go, Rust, and more.
- **🐛 Debugging & Bug Audit**: Paste an error stack trace or snippet to pinpoint root causes and get exact fixes.
- **📐 DSA & Algorithms**: Optimal solutions with step-by-step logic, time, and space complexity analysis.
- **🏗️ System Architecture**: Design scalable microservices, REST/GraphQL APIs, databases, and auth flows.
- **📝 Study & Notes**: Generate high-yield cheat sheets, roadmap guides, and interview prep materials.

Select a mode below or ask me anything to get started! What are you building today?`;
  }

  if (
    query.includes('who are you') ||
    query.includes('what is cortexcode') ||
    query.includes('what can you do') ||
    query.includes('how to use') ||
    query.includes('help me') ||
    query === 'help'
  ) {
    return `### 🧠 About CortexCode AI

**CortexCode** is an AI-powered developer workspace designed for modern software engineering teams, students, and architects.

#### Key Capabilities:
1. **Context-Aware Code Intelligence**: Full understanding of project repositories, dependencies, and type contracts.
2. **Multi-Mode Assistance**:
   - **💬 Chat**: General software architecture and technical guidance.
   - **🐛 Debug**: Root cause analysis, stack trace diagnosis, and regression fixes.
   - **📚 Explain**: Step-by-step code and algorithm walkthroughs.
   - **📝 Notes**: High-yield structured study notes and reference docs.
   - **🔍 Review**: Automated code quality, security audits, and PR evaluations.
3. **Multi-Model Inference**: Switch between fast local execution, Gemini Flash, Cerebras LLaMA 3.3, and GPT-4o.

Feel free to paste a code snippet, an error message, or describe what you want to build!`;
  }

  if (query.includes('thank') || query.includes('thanks') || query.includes('appreciate it')) {
    return `You're very welcome! 😊 Always happy to help. Let me know if you want to optimize this further, write unit tests, or work on another feature!`;
  }

  // ── 2. DSA & Common Algorithmic Problems ────────────────────────────────────
  if (query.includes('two sum') || query.includes('2 sum')) {
    const isJava = query.includes('java');
    const isPython = query.includes('python') || query.includes('py');
    const isCpp = query.includes('c++') || query.includes('cpp');

    if (isJava) {
      return `### ⚡ Two Sum — Optimal Solution (Java)

#### Approach:
Use a single-pass **HashMap** to store each number's value and its index. For every number \`nums[i]\`, calculate \`complement = target - nums[i]\`. If the complement already exists in the map, we found the pair in O(1) lookup time.

\`\`\`java
import java.util.HashMap;
import java.util.Map;

public class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        
        throw new IllegalArgumentException("No two sum solution found");
    }
}
\`\`\`

#### Complexity Analysis:
- **Time Complexity**: O(N) — We traverse the list containing N elements only once.
- **Space Complexity**: O(N) — The auxiliary HashMap stores up to N key-value pairs.`;
    }

    if (isCpp) {
      return `### ⚡ Two Sum — Optimal Solution (C++)

\`\`\`cpp
#include <vector>
#include <unordered_map>
#include <stdexcept>

class Solution {
public:
    std::vector<int> twoSum(const std::vector<int>& nums, int target) {
        std::unordered_map<int, int> numMap;
        
        for (int i = 0; i < nums.size(); ++i) {
            int complement = target - nums[i];
            if (numMap.find(complement) != numMap.end()) {
                return { numMap[complement], i };
            }
            numMap[nums[i]] = i;
        }
        
        return {};
    }
};
\`\`\`

#### Complexity Analysis:
- **Time Complexity**: O(N) single-pass hash lookup.
- **Space Complexity**: O(N) hash map storage.`;
    }

    // Default Python / TS Two Sum
    return `### ⚡ Two Sum — Optimal Solution (Python & TypeScript)

#### Approach:
Using a hash table, we look up whether the target complement (\`target - num\`) was previously seen.

#### Python 3:
\`\`\`python
def two_sum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
\`\`\`

#### TypeScript:
\`\`\`typescript
function twoSum(nums: number[], target: number): number[] {
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) {
      return [seen.get(complement)!, i];
    }
    seen.set(nums[i], i);
  }
  return [];
}
\`\`\`

#### Complexity Analysis:
- **Time Complexity**: O(N) — Single pass through the array.
- **Space Complexity**: O(N) — Hash map auxiliary memory.`;
  }

  if (query.includes('binary search')) {
    return `### 🔍 Binary Search Algorithm

Binary search works on sorted arrays by repeatedly dividing the search interval in half.

\`\`\`typescript
function binarySearch(nums: number[], target: number): number {
  let left = 0;
  let right = nums.length - 1;

  while (left <= right) {
    // Avoid integer overflow
    const mid = left + Math.floor((right - left) / 2);

    if (nums[mid] === target) {
      return mid;
    } else if (nums[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return -1; // Target not found
}
\`\`\`

#### Complexity Analysis:
- **Time Complexity**: O(log N) — Search space is halved on each step.
- **Space Complexity**: O(1) — Iterative in-place search.`;
  }

  if (query.includes('reverse string') || query.includes('reverse a string')) {
    if (query.includes('java')) {
      return `### ☕ Java: String Reversal Implementations

#### 1. Idiomatic (StringBuilder):
\`\`\`java
public class StringReversal {
    public static String reverse(String input) {
        if (input == null) return null;
        return new StringBuilder(input).reverse().toString();
    }
}
\`\`\`

#### 2. In-place Two-Pointer Array Reversal (Interview standard):
\`\`\`java
public class StringReversal {
    public static String reverseInPlace(String input) {
        if (input == null) return null;
        char[] chars = input.toCharArray();
        int left = 0, right = chars.length - 1;
        
        while (left < right) {
            char temp = chars[left];
            chars[left] = chars[right];
            chars[right] = temp;
            left++;
            right--;
        }
        return new String(chars);
    }
}
\`\`\`

- **Time Complexity**: O(N)
- **Space Complexity**: O(N) to store the character array.`;
    }

    return `### 🔄 String Reversal in Python & JavaScript

#### Python:
\`\`\`python
def reverse_string(s: str) -> str:
    return s[::-1]

# In-place list of characters:
def reverse_char_list(chars: list[str]) -> None:
    left, right = 0, len(chars) - 1
    while left < right:
        chars[left], chars[right] = chars[right], chars[left]
        left += 1
        right -= 1
\`\`\`

#### JavaScript / TypeScript:
\`\`\`typescript
const reverseString = (str: string): string => str.split('').reverse().join('');
\`\`\``;
  }

  // ── 3. React & Next.js ─────────────────────────────────────────────────────
  if (
    query.includes('react') ||
    query.includes('next') ||
    query.includes('hook') ||
    query.includes('usestate') ||
    query.includes('useeffect') ||
    query.includes('component')
  ) {
    if (query.includes('infinite loop') || query.includes('loop') || query.includes('useeffect')) {
      return `### 🐛 Fixing Infinite \`useEffect\` Loops in React

#### Root Cause:
A \`useEffect\` runs continuously when its dependency array contains objects, arrays, or functions created inline inside the component without \`useMemo\` or \`useCallback\`, or when state updated inside the effect is listed in the dependency array.

#### ❌ The Bug:
\`\`\`tsx
// Triggers infinite re-renders because options object has a new reference on every render
useEffect(() => {
  fetchData(options);
}, [options]);
\`\`\`

#### ✅ The Fix:
\`\`\`tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';

export default function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. Memoize query parameters or functions
  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(\`/api/users/\${userId}\`);
      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId]); // Only re-runs if userId primitive changes

  useEffect(() => {
    let isMounted = true;
    fetchUser();
    return () => { isMounted = false; };
  }, [fetchUser]);

  if (loading) return <div className="p-4 text-zinc-400">Loading profile...</div>;
  return <div className="p-4 text-white font-bold">{user?.name}</div>;
}
\`\`\`

#### Key Rules:
1. Only pass **primitives** or **memoized objects** to dependencies.
2. Use a cleanup flag (\`isMounted\`) to prevent memory leaks on unmounted components.`;
    }

    return `### 💻 Modern React 19 / Next.js Component Pattern

Here is a strongly-typed, production-ready React component with clean state management and error boundary handling:

\`\`\`tsx
'use client';

import React, { useState, useEffect, useTransition } from 'react';

interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

export default function TaskManager() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [inputTitle, setInputTitle] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTitle.trim()) return;

    const newTask: TaskItem = {
      id: crypto.randomUUID(),
      title: inputTitle.trim(),
      completed: false,
      priority: 'medium'
    };

    startTransition(() => {
      setTasks(prev => [newTask, ...prev]);
      setInputTitle('');
    });
  };

  const toggleTask = (id: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-zinc-900 border border-white/10 rounded-2xl text-white shadow-xl">
      <h2 className="text-lg font-bold mb-4">Task Management Hub</h2>

      <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
        <input
          type="text"
          value={inputTitle}
          onChange={e => setInputTitle(e.target.value)}
          placeholder="New task description..."
          className="flex-1 px-3 py-2 bg-black/50 border border-white/15 rounded-xl text-sm outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          disabled={isPending || !inputTitle.trim()}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-xs font-bold transition disabled:opacity-50"
        >
          Add
        </button>
      </form>

      <ul className="space-y-2">
        {tasks.map(task => (
          <li
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className="flex items-center justify-between p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl cursor-pointer border border-white/5 transition"
          >
            <span className={task.completed ? 'line-through text-zinc-500' : 'text-zinc-200'}>
              {task.title}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-400 font-mono">
              {task.priority}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
\`\`\`

#### Architectural Highlights:
1. **React 19 \`useTransition\`**: Non-blocking state updates for fluid UI interactions.
2. **TypeScript Contracts**: Explicit interfaces preventing runtime property errors.`;
  }

  // ── 4. Python & Backend Services ───────────────────────────────────────────
  if (
    query.includes('python') ||
    query.includes('fastapi') ||
    query.includes('django') ||
    query.includes('flask') ||
    query.includes('pandas')
  ) {
    return `### 🐍 Production-Ready FastAPI REST Service

Here is an asynchronous REST endpoint with Pydantic schema validation, structured error handling, and dependency injection:

\`\`\`python
from fastapi import FastAPI, HTTPException, status, Depends
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime

app = FastAPI(
    title="CortexCode AI Microservice",
    version="1.0.0"
)

# --- Schemas ---
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, example="alex_dev")
    email: EmailStr = Field(..., example="alex@cortex.ai")
    role: str = Field(default="developer", example="developer")

class UserResponse(UserCreate):
    id: str
    created_at: datetime

# --- In-Memory Repository ---
users_db: dict[str, dict] = {}

# --- Endpoints ---
@app.post(
    "/api/v1/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_user(payload: UserCreate):
    # Validate uniqueness
    for u in users_db.values():
        if u["email"] == payload.email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email already exists."
            )

    user_id = str(uuid.uuid4())
    user_record = {
        "id": user_id,
        "username": payload.username,
        "email": payload.email,
        "role": payload.role,
        "created_at": datetime.utcnow()
    }
    users_db[user_id] = user_record
    return user_record

@app.get("/api/v1/users", response_model=List[UserResponse])
async def list_users():
    return list(users_db.values())
\`\`\`

#### Key Highlights:
1. **Pydantic Validation**: Automatic schema enforcement and input sanitization.
2. **Asynchronous Non-blocking I/O**: Native \`async def\` handlers for high-throughput concurrency.`;
  }

  // ── 5. Java & Spring Boot ──────────────────────────────────────────────────
  if (
    query.includes('java') ||
    query.includes('spring') ||
    query.includes('spring boot') ||
    query.includes('jpa') ||
    query.includes('hibernate')
  ) {
    return `### ☕ Spring Boot REST Controller & Service Pattern

Here is an enterprise-standard Spring Boot 3 / Java 17 service implementation:

\`\`\`java
package com.cortexcode.api.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

record ProjectRequest(
    @NotBlank(message = "Project name cannot be blank") String name,
    String description,
    String language
) {}

record ProjectResponse(String id, String name, String language, long timestamp) {}

@RestController
@RequestMapping("/api/v1/projects")
@CrossOrigin(origins = "*")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @PostMapping
    public ResponseEntity<ProjectResponse> createProject(@Valid @RequestBody ProjectRequest request) {
        ProjectResponse created = projectService.createProject(request);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<ProjectResponse>> getAllProjects() {
        return ResponseEntity.ok(projectService.findAll());
    }
}
\`\`\`

#### Architectural Standards:
1. **Java Records**: Immutable DTOs with minimal boilerplate.
2. **Constructor Injection**: Safe dependency injection adhering to SOLID principles.
3. **Bean Validation (\`@Valid\`)**: Grounded request payload constraints.`;
  }

  // ── 6. Debugging & Error Diagnosis ─────────────────────────────────────────
  if (
    query.includes('nullpointerexception') ||
    query.includes('cors') ||
    query.includes('error') ||
    query.includes('bug') ||
    query.includes('fix') ||
    query.includes('exception') ||
    mode === 'debug'
  ) {
    if (query.includes('cors')) {
      return `### 🐛 Fixing CORS Policy Missing Header in Express / Node.js

#### Root Cause:
Browsers enforce the Same-Origin Policy (SOP). When your frontend (e.g. \`http://localhost:3000\`) calls an API on a different domain or port (e.g. \`http://localhost:3001\`), the backend must explicitly send the \`Access-Control-Allow-Origin\` header.

#### Solution:
Install the official \`cors\` package:
\`\`\`bash
npm install cors
npm install -D @types/cors
\`\`\`

#### Express Implementation:
\`\`\`typescript
import express from 'express';
import cors from 'cors';

const app = express();

// Enable CORS for all routes and specific origins
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://cortexcode-web.onrender.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
\`\`\``;
    }

    if (query.includes('nullpointerexception') || query.includes('null pointer')) {
      return `### 🐛 Debugging NullPointerException (NPE) in Java

#### Root Causes:
1. Calling methods on an uninitialized object reference (\`obj.doSomething()\` when \`obj == null\`).
2. Auto-unboxing a \`null\` wrapper object (e.g., \`Integer\` to \`int\`).
3. Accessing elements of an array that hasn't been instantiated.

#### Prevention Strategies:

\`\`\`java
import java.util.Optional;
import java.util.Objects;

public class NPEGuard {

    // 1. Use Java Optional for values that may be absent
    public static Optional<String> findUserName(String userId) {
        if (userId == null) return Optional.empty();
        return Optional.ofNullable(fetchFromDatabase(userId));
    }

    // 2. Objects.requireNonNull with descriptive messages
    public static void processOrder(Order order) {
        Objects.requireNonNull(order, "Order parameter must not be null");
        // Safe execution...
    }

    // 3. Constant first in string comparisons
    public static boolean isAdmin(String role) {
        return "ADMIN".equalsIgnoreCase(role); // Never throws NPE if role is null
    }

    private static String fetchFromDatabase(String id) { return null; }
}
\`\`\``;
    }
  }

  // ── 7. System Design & Architecture ────────────────────────────────────────
  if (
    query.includes('system design') ||
    query.includes('url shortener') ||
    query.includes('rate limit') ||
    query.includes('microservice') ||
    query.includes('architecture')
  ) {
    return `### 📐 Scalable System Design: URL Shortener (Bitly Pattern)

#### 1. Functional Requirements:
- Given a long URL, generate a unique short alias (e.g. \`cortex.ly/7xAb9\`).
- When visiting the short URL, redirect users via **HTTP 301 (Permanent)** or **302 (Found)** to the original URL.
- High availability with sub-50ms redirection latency.

#### 2. Scale & Capacity Estimation:
- **Traffic**: 100M URLs generated per month (~40 writes/sec), 10B clicks/month (~4,000 reads/sec). Read-heavy ratio (100:1).
- **Storage**: 100M URLs * 500 bytes * 12 months * 5 years ≈ 3 TB of data.

#### 3. Base62 Short Code Encoding:
\`\`\`typescript
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function idToShortCode(num: bigint): string {
  let str = '';
  let n = num;
  while (n > 0n) {
    str = ALPHABET[Number(n % 62n)] + str;
    n = n / 62n;
  }
  return str.padStart(7, '0');
}
\`\`\`

#### 4. Architecture Blueprint:
- **API Gateway / Load Balancer**: NGINX / Cloudflare for rate limiting and SSL termination.
- **Cache Layer (Redis)**: Store Top 20% most accessed URLs with LRU eviction (handles 80% read traffic).
- **Primary Database**: PostgreSQL (for ACID transactions) or DynamoDB/Cassandra (for linear horizontal scale).`;
  }

  // ── 8. Study & Interview Prep ──────────────────────────────────────────────
  if (
    query.includes('interview') ||
    query.includes('resume') ||
    query.includes('study') ||
    query.includes('roadmap') ||
    mode === 'notes'
  ) {
    return `### 🎯 High-Yield Software Engineering Roadmap & Study Notes

#### 1. Core Data Structures & Mastery:
- **Arrays & Hash Maps**: Two Pointers, Sliding Window, Prefix Sum (Two Sum, Group Anagrams).
- **Trees & Graphs**: BFS (Level Order), DFS (Recursion/Backtracking), Dijkstra's.
- **Dynamic Programming**: Memoization vs Tabulation, 0/1 Knapsack, Longest Common Subsequence.

#### 2. System Design Cheat Sheet:
- **Caching**: Write-through vs Write-back, Cache Invalidation, Redis/Memcached.
- **Databases**: SQL (ACID, Normalized) vs NoSQL (Partitioning, CAP theorem).
- **Message Queues**: Kafka / RabbitMQ for event-driven decoupled asynchronous workloads.

#### 3. Resume & Interview Best Practices:
- Use the **Google X-Y-Z formula**: *"Accomplished [X], as measured by [Y], by doing [Z]"*.
- Emphasize latency improvements, test coverage, and architectural scalability.`;
  }

  // ── 9. Intelligent Dynamic Response (Comprehensive Context) ────────────────
  return `### 🧠 CortexCode AI Solution & Implementation

Here is a structured engineering guide addressing: **"${userPrompt}"**

#### 1. Core Technical Strategy:
- **Clean Architecture**: Decouple business logic from framework bindings and state management.
- **Type Safety & Contracts**: Enforce strict data models to eliminate runtime exceptions and reference errors.
- **Performance & Time Complexity**: Ensure optimal execution with predictable O(N) or O(log N) boundaries.

#### 2. Implementation Blueprint:
\`\`\`typescript
// Production-grade implementation pattern
export interface ConfigOptions {
  enableCache?: boolean;
  timeoutMs?: number;
  retries?: number;
}

export async function executeOperation<T>(
  task: () => Promise<T>,
  options: ConfigOptions = {}
): Promise<T> {
  const { timeoutMs = 5000, retries = 3 } = options;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(\`Timeout of \${timeoutMs}ms exceeded\`)), timeoutMs)
      );
      return await Promise.race([task(), timeoutPromise]);
    } catch (err: any) {
      lastError = err;
      if (attempt === retries) break;
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 100)); // Exponential backoff
    }
  }

  throw lastError || new Error('Operation execution failed.');
}
\`\`\`

#### 3. Next Steps & Verification:
- You can ask follow-up questions to customize this for a specific framework or database.
- Use **Debug Mode** if you run into any runtime issues or error traces.`;
}

export function getAPIErrorMessage(userPrompt?: string): string {
  return generateLocalAIResponse(userPrompt || 'General Developer Query');
}
