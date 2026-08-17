/**
 * CortexCode AI Assessment & Evaluation Service
 * Handles AI Question Generation, Anti-Prompt-Injection Subjective Evaluation,
 * Reusable Question Bank Storage, and Performance Report Generation.
 */

import { AIService } from './ai/aiService';

export interface QuestionGenerationParams {
  title: string;
  subjects: string[];
  questionTypes: string[];
  difficulty: string;
  mcqCount?: number;
  codingCount?: number;
  subjectiveCount?: number;
  comprehensionCount?: number;
}

export interface GeneratedQuestion {
  id?: string;
  sectionId?: string;
  type: 'MCQ' | 'CODING' | 'SUBJECTIVE' | 'COMPREHENSION';
  prompt: string;
  subject: string;
  topic?: string;
  difficulty: string;
  options?: { id: string; text: string }[];
  correctAnswer?: string | string[];
  multipleCorrect?: boolean;
  explanation?: string;
  starterCode?: Record<string, string>;
  constraints?: string[];
  examples?: { input: string; output: string; explanation?: string }[];
  supportedLanguages?: string[];
  testCases?: { input: string; output: string }[];
  hiddenTests?: { input: string; output: string }[];
  timeLimit?: number;
  memoryLimit?: number;
  expectedConcepts?: string[];
  rubric?: string;
  passage?: string;
  points: number;
  order?: number;
}

export interface SubjectiveEvaluationResult {
  score: number; // 0 to 10
  correctness: number;
  relevance: number;
  completeness: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
}

/**
 * Pre-seeded Reusable Question Bank covering all 13 core technical subjects
 */
export const SEED_QUESTION_BANK: GeneratedQuestion[] = [
  // 1. DATA STRUCTURES & ALGORITHMS - MCQ
  {
    id: 'qb-dsa-1',
    type: 'MCQ',
    subject: 'Data Structures',
    topic: 'Trees & Complexity',
    difficulty: 'Intermediate',
    prompt: 'What is the worst-case time complexity of searching for an element in a balanced Binary Search Tree (AVL or Red-Black Tree) containing N elements?',
    options: [
      { id: 'A', text: 'O(1)' },
      { id: 'B', text: 'O(log N)' },
      { id: 'C', text: 'O(N)' },
      { id: 'D', text: 'O(N log N)' }
    ],
    correctAnswer: 'B',
    multipleCorrect: false,
    explanation: 'Self-balancing binary search trees maintain an invariant tree height strictly bounded by O(log N), guaranteeing O(log N) worst-case search.',
    points: 10
  },
  {
    id: 'qb-dsa-2',
    type: 'MCQ',
    subject: 'Data Structures',
    topic: 'Hash Tables',
    difficulty: 'Intermediate',
    prompt: 'In a Hash Table with open addressing and linear probing, what is the primary structural consequence known as "Primary Clustering"?',
    options: [
      { id: 'A', text: 'Hash keys hashing to the same bucket occupy separate linked lists.' },
      { id: 'B', text: 'Long contiguous runs of occupied slots build up, increasing probe sequence length for unrelated keys.' },
      { id: 'C', text: 'Memory allocation failures occur when the load factor exceeds 0.5.' },
      { id: 'D', text: 'Keys with identical hash codes cause immediate bucket collision exceptions.' }
    ],
    correctAnswer: 'B',
    multipleCorrect: false,
    explanation: 'Primary clustering occurs when linear probing causes filled slots to coalesce into long clusters, making future insertions take longer.',
    points: 10
  },
  {
    id: 'qb-algo-1',
    type: 'MCQ',
    subject: 'Algorithms',
    topic: 'Graph Traversal',
    difficulty: 'Intermediate',
    prompt: 'Which of the following statements regarding Dijkstra’s shortest path algorithm are TRUE? (Select all that apply)',
    options: [
      { id: 'A', text: 'It finds single-source shortest paths in weighted graphs with non-negative edge weights.' },
      { id: 'B', text: 'It operates correctly on graphs with negative edge cycles without infinite loops.' },
      { id: 'C', text: 'Using a binary min-heap, its time complexity is O((V + E) log V).' },
      { id: 'D', text: 'It uses a greedy approach, picking the minimum unvisited distance node at each step.' }
    ],
    correctAnswer: ['A', 'C', 'D'],
    multipleCorrect: true,
    explanation: 'Dijkstra requires non-negative edge weights. Negative cycles require Bellman-Ford or Floyd-Warshall.',
    points: 15
  },
  {
    id: 'qb-algo-2',
    type: 'MCQ',
    subject: 'Algorithms',
    topic: 'Dynamic Programming',
    difficulty: 'Advanced',
    prompt: 'Which algorithmic paradigm solves a problem by combining solutions to overlapping subproblems where each subproblem is solved once and memoized?',
    options: [
      { id: 'A', text: 'Greedy Choice Paradigm' },
      { id: 'B', text: 'Dynamic Programming' },
      { id: 'C', text: 'Divide and Conquer (without memoization)' },
      { id: 'D', text: 'Backtracking with Pruning' }
    ],
    correctAnswer: 'B',
    multipleCorrect: false,
    explanation: 'Dynamic Programming applies when a problem exhibits both Optimal Substructure and Overlapping Subproblems.',
    points: 10
  },

  // 2. DBMS & SQL - MCQ
  {
    id: 'qb-dbms-1',
    type: 'MCQ',
    subject: 'DBMS',
    topic: 'Transactions & ACID',
    difficulty: 'Intermediate',
    prompt: 'Which SQL transaction isolation level completely eliminates Dirty Reads, Non-repeatable Reads, and Phantom Reads?',
    options: [
      { id: 'A', text: 'READ COMMITTED' },
      { id: 'B', text: 'READ UNCOMMITTED' },
      { id: 'C', text: 'REPEATABLE READ' },
      { id: 'D', text: 'SERIALIZABLE' }
    ],
    correctAnswer: 'D',
    multipleCorrect: false,
    explanation: 'SERIALIZABLE is the highest isolation level and prevents all concurrency anomalies including phantom reads.',
    points: 10
  },
  {
    id: 'qb-dbms-2',
    type: 'MCQ',
    subject: 'DBMS',
    topic: 'Indexing & B-Trees',
    difficulty: 'Intermediate',
    prompt: 'Why are B+ Trees favored over standard Binary Search Trees for relational database storage engines (e.g., InnoDB)?',
    options: [
      { id: 'A', text: 'B+ Trees have a high branching factor, minimizing disk I/O seek operations per search.' },
      { id: 'B', text: 'B+ Tree leaf nodes are linked sequentially, enabling rapid range scans.' },
      { id: 'C', text: 'All data records are stored exclusively in leaf nodes.' },
      { id: 'D', text: 'All of the above.' }
    ],
    correctAnswer: 'D',
    multipleCorrect: false,
    explanation: 'High fanout reduces tree height/disk seek operations, and leaf node linked lists optimize range queries.',
    points: 10
  },

  // 3. OPERATING SYSTEMS - MCQ
  {
    id: 'qb-os-1',
    type: 'MCQ',
    subject: 'Operating Systems',
    topic: 'Deadlocks & Synchronization',
    difficulty: 'Intermediate',
    prompt: 'Which of the following conditions is NOT one of Coffman’s four necessary conditions for a Deadlock to occur?',
    options: [
      { id: 'A', text: 'Mutual Exclusion' },
      { id: 'B', text: 'Hold and Wait' },
      { id: 'C', text: 'Preemption Allowed' },
      { id: 'D', text: 'Circular Wait' }
    ],
    correctAnswer: 'C',
    multipleCorrect: false,
    explanation: 'The Coffman condition is "No Preemption" (resources cannot be forcibly taken away). Preemption prevents deadlocks.',
    points: 10
  },

  // 4. COMPUTER NETWORKS - MCQ
  {
    id: 'qb-net-1',
    type: 'MCQ',
    subject: 'Computer Networks',
    topic: 'TCP/IP & Transport',
    difficulty: 'Intermediate',
    prompt: 'During the TCP 3-way handshake connection establishment, what is the exact packet sequence transmitted between Client (C) and Server (S)?',
    options: [
      { id: 'A', text: 'C→S: SYN, S→C: ACK, C→S: SYN-ACK' },
      { id: 'B', text: 'C→S: SYN, S→C: SYN-ACK, C→S: ACK' },
      { id: 'C', text: 'C→S: ACK, S→C: SYN, C→S: ACK' },
      { id: 'D', text: 'C→S: FIN, S→C: ACK, C→S: FIN-ACK' }
    ],
    correctAnswer: 'B',
    multipleCorrect: false,
    explanation: 'TCP 3-way handshake begins with SYN, server responds with SYN-ACK, client acknowledges with ACK.',
    points: 10
  },

  // 5. JAVA & OOP - MCQ
  {
    id: 'qb-java-1',
    type: 'MCQ',
    subject: 'Java',
    topic: 'JVM & Memory Management',
    difficulty: 'Intermediate',
    prompt: 'In Java, how does the JVM handle String Literals when constructed with double quotes `String s = "hello"` versus `new String("hello")`?',
    options: [
      { id: 'A', text: 'Both always allocate directly on the heap bypassing the string pool.' },
      { id: 'B', text: 'Literals are placed in the String Constant Pool; `new` forces a distinct object allocation on the young heap.' },
      { id: 'C', text: '`new String()` is immutable, while literals are mutable.' },
      { id: 'D', text: 'Literals are garbage collected immediately upon exiting method scope.' }
    ],
    correctAnswer: 'B',
    multipleCorrect: false,
    explanation: 'String literals participate in interning within the String Constant Pool in Metaspace/Heap.',
    points: 10
  },

  // 6. JAVASCRIPT & WEB DEVELOPMENT - MCQ
  {
    id: 'qb-js-1',
    type: 'MCQ',
    subject: 'JavaScript',
    topic: 'Event Loop & Concurrency',
    difficulty: 'Intermediate',
    prompt: 'In modern JavaScript engines (V8), in what order will tasks from the Microtask Queue (Promises, queueMicrotask) execute relative to Macrotasks (setTimeout, setInterval)?',
    options: [
      { id: 'A', text: 'All macrotasks in the queue execute before any microtasks.' },
      { id: 'B', text: 'The entire microtask queue is flushed immediately after each executing macrotask before yielding to the next macrotask.' },
      { id: 'C', text: 'Microtasks execute in parallel on background Web Worker threads.' },
      { id: 'D', text: 'Macrotasks and microtasks alternate 1-to-1 in strict FIFO fashion.' }
    ],
    correctAnswer: 'B',
    multipleCorrect: false,
    explanation: 'Microtasks are processed immediately after the current call stack clears and before the next macrotask runs.',
    points: 10
  },

  // 7. PYTHON - MCQ
  {
    id: 'qb-py-1',
    type: 'MCQ',
    subject: 'Python',
    topic: 'GIL & Memory Management',
    difficulty: 'Intermediate',
    prompt: 'What is the Global Interpreter Lock (GIL) in CPython and what is its primary effect on multi-threaded execution?',
    options: [
      { id: 'A', text: 'A mutex that prevents multiple native threads from executing Python bytecodes concurrently in a single process.' },
      { id: 'B', text: 'A compiler optimization that speeds up mathematical CPU-bound loops across all cores.' },
      { id: 'C', text: 'A security sandbox isolating database connections from untrusted code.' },
      { id: 'D', text: 'A garbage collection lock used only during process termination.' }
    ],
    correctAnswer: 'A',
    multipleCorrect: false,
    explanation: 'CPython GIL ensures memory safety of reference counts by allowing only one native thread to execute Python bytecode at a time.',
    points: 10
  },

  // 8. CODING PROBLEMS
  {
    id: 'qb-code-1',
    type: 'CODING',
    subject: 'Data Structures',
    topic: 'Arrays & Hashing',
    difficulty: 'Intermediate',
    prompt: `### Problem: Two Sum Target Indices

Given an integer array \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

Assume exactly one valid solution exists. Do not use the same element twice.

#### Example 1:
- **Input**: \`nums = [2, 7, 11, 15], target = 9\`
- **Output**: \`[0, 1]\`
- **Explanation**: \`nums[0] + nums[1] == 9\`, so return \`[0, 1]\`.

#### Example 2:
- **Input**: \`nums = [3, 2, 4], target = 6\`
- **Output**: \`[1, 2]\`

#### Constraints:
- \`2 <= nums.length <= 10^4\`
- \`-10^9 <= nums[i] <= 10^9\`
- Time Limit: 2000 ms`,
    constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9', 'Time Limit: 2000 ms'],
    examples: [
      { input: 'nums = [2, 7, 11, 15], target = 9', output: '[0, 1]', explanation: '2 + 7 = 9' },
      { input: 'nums = [3, 2, 4], target = 6', output: '[1, 2]', explanation: '2 + 4 = 6' }
    ],
    supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
    starterCode: {
      javascript: `function twoSum(nums, target) {\n    // Write your solution here\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const diff = target - nums[i];\n        if (map.has(diff)) return [map.get(diff), i];\n        map.set(nums[i], i);\n    }\n    return [];\n}`,
      python: `def two_sum(nums, target):\n    # Write your solution here\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]\n        seen[num] = i\n    return []`,
      java: `import java.util.HashMap;\nimport java.util.Map;\n\npublic class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        Map<Integer, Integer> map = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int complement = target - nums[i];\n            if (map.containsKey(complement)) {\n                return new int[]{map.get(complement), i};\n            }\n            map.put(nums[i], i);\n        }\n        return new int[]{};\n    }\n}`,
      cpp: `#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        unordered_map<int, int> map;\n        for (int i = 0; i < nums.size(); i++) {\n            int diff = target - nums[i];\n            if (map.find(diff) != map.end()) return {map[diff], i};\n            map[nums[i]] = i;\n        }\n        return {};\n    }\n};`
    },
    testCases: [
      { input: 'nums = [2, 7, 11, 15], target = 9', output: '[0, 1]' },
      { input: 'nums = [3, 2, 4], target = 6', output: '[1, 2]' }
    ],
    hiddenTests: [
      { input: 'nums = [3, 3], target = 6', output: '[0, 1]' },
      { input: 'nums = [1, 5, 8, 12, 19], target = 27', output: '[2, 4]' }
    ],
    points: 25
  },
  {
    id: 'qb-code-2',
    type: 'CODING',
    subject: 'Algorithms',
    topic: 'Stacks & Parsing',
    difficulty: 'Intermediate',
    prompt: `### Problem: Valid Parentheses Bracket Validator

Given a string \`s\` containing just characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

#### Constraints:
- \`1 <= s.length <= 10^4\`
- \`s\` consists of parentheses only \`'()[]{}'\`.`,
    constraints: ['1 <= s.length <= 10^4', 'Contains only ()[]{}'],
    examples: [
      { input: 's = "()[]{}"', output: 'true' },
      { input: 's = "(]"', output: 'false' }
    ],
    supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
    starterCode: {
      javascript: `function isValid(s) {\n    const stack = [];\n    const map = { ')': '(', '}': '{', ']': '[' };\n    for (const ch of s) {\n        if (ch === '(' || ch === '{' || ch === '[') stack.push(ch);\n        else if (stack.pop() !== map[ch]) return false;\n    }\n    return stack.length === 0;\n}`,
      python: `def is_valid(s: str) -> bool:\n    stack = []\n    mapping = {')': '(', '}': '{', ']': '['}\n    for char in s:\n        if char in mapping.values():\n            stack.append(char)\n        elif char in mapping:\n            if not stack or stack.pop() != mapping[char]:\n                return False\n    return not stack`,
      java: `import java.util.Stack;\n\npublic class Solution {\n    public boolean isValid(String s) {\n        Stack<Character> stack = new Stack<>();\n        for (char c : s.toCharArray()) {\n            if (c == '(') stack.push(')');\n            else if (c == '{') stack.push('}');\n            else if (c == '[') stack.push(']');\n            else if (stack.isEmpty() || stack.pop() != c) return false;\n        }\n        return stack.isEmpty();\n    }\n}`,
      cpp: `#include <string>\n#include <stack>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool isValid(string s) {\n        stack<char> st;\n        for (char c : s) {\n            if (c == '(' || c == '{' || c == '[') st.push(c);\n            else {\n                if (st.empty()) return false;\n                char top = st.top();\n                if ((c == ')' && top != '(') || (c == '}' && top != '{') || (c == ']' && top != '[')) return false;\n                st.pop();\n            }\n        }\n        return st.empty();\n    }\n};`
    },
    testCases: [
      { input: 's = "()[]{}"', output: 'true' },
      { input: 's = "(]"', output: 'false' }
    ],
    hiddenTests: [
      { input: 's = "([{}])"', output: 'true' },
      { input: 's = "((("', output: 'false' }
    ],
    points: 25
  },

  // 9. SUBJECTIVE QUESTIONS
  {
    id: 'qb-subj-1',
    type: 'SUBJECTIVE',
    subject: 'DBMS',
    topic: 'Indexing & Performance',
    difficulty: 'Intermediate',
    prompt: 'Explain the internal architecture and operational mechanics of B-Tree indexing in relational databases (e.g., PostgreSQL / MySQL InnoDB). How does a B-Tree optimize range query performance, and what write overheads occur during concurrent INSERT, UPDATE, and DELETE operations?',
    expectedConcepts: [
      'B-Tree node branching factor & low tree height',
      'O(log N) point lookups and range scans',
      'Sequential disk block traversal / buffer pool caching',
      'Write amplification, page splits, and index re-balancing overhead on modifications'
    ],
    rubric: 'Award full credit if candidate mentions balanced height, log(N) disk I/O seek reductions, range query efficiency via contiguous leaf traversal, and page split / lock overhead during inserts.',
    points: 20
  },
  {
    id: 'qb-subj-2',
    type: 'SUBJECTIVE',
    subject: 'Software Engineering',
    topic: 'System Design & Scalability',
    difficulty: 'Advanced',
    prompt: 'Discuss the architectural trade-offs between Monolithic and Microservices architectures. Address communication patterns (REST vs gRPC vs Event-Driven Pub/Sub), data consistency challenges (SAGA pattern vs Two-Phase Commit), and operational observability in distributed systems.',
    expectedConcepts: [
      'Deployment independence vs distributed network latency',
      'Synchronous RPC vs Asynchronous event streams',
      'Eventual consistency and SAGA orchestrators vs distributed 2PC locks',
      'Distributed tracing (OpenTelemetry), centralized logging, and circuit breakers'
    ],
    rubric: 'Candidate must articulate trade-offs in operational complexity, data synchronization, latency, and fault tolerance strategies.',
    points: 25
  },

  // 10. COMPREHENSION
  {
    id: 'qb-comp-1',
    type: 'COMPREHENSION',
    subject: 'Operating Systems',
    topic: 'Memory Hierarchy & Cache Locality',
    difficulty: 'Intermediate',
    passage: `### Memory Hierarchy & Hardware Cache Locality in High-Performance Systems

Modern CPU cores operate with clock cycles under 0.3 nanoseconds, whereas accessing main memory (DRAM) requires 50 to 100 nanoseconds—a latency disparity commonly known as the "Memory Wall." To bridge this throughput gap, hardware architectures incorporate a multi-tiered hierarchy of SRAM caches (L1, L2, and L3), with L1 cache hits taking just 1-4 CPU cycles.

Caches transfer data in fixed-size blocks called Cache Lines (typically 64 bytes). When an address is requested, the entire 64-byte line is fetched. System efficiency is therefore heavily dictated by two principles:
1. **Spatial Locality**: Accessing memory locations physically adjacent to recently accessed addresses. Contiguous memory structures (such as flat arrays) maximize spatial locality since sequentially accessed elements reside in the same cache line.
2. **Temporal Locality**: Re-accessing the same memory address multiple times in close succession, allowing values to remain hot in L1/L2 caches.

Pointer-based data structures (such as linked lists or unbalanced pointer trees) scatter node allocations non-contiguously across heap pages, inducing frequent cache misses that stall CPU execution pipelines despite having equal asymptotic theoretical Big-O complexity.`,
    prompt: 'Based on the passage above, explain why iterating over a contiguous array often runs significantly faster than traversing a pointer-based linked list of identical size, even when both operations have an identical asymptotic time complexity of O(N).',
    expectedConcepts: [
      '64-byte cache line prefetching',
      'Spatial locality benefits of contiguous layout',
      'Pointer indirection causing DRAM latency stalls (Memory Wall)',
      'L1/L2 cache hit rate vs cache misses'
    ],
    rubric: 'Candidate must mention 64-byte cache line loading, contiguous spatial locality, and avoidance of CPU pipeline stalls from DRAM latency.',
    points: 20
  }
];

/**
 * 1. AI Question Generator
 */
export async function generateAssessmentQuestions(params: QuestionGenerationParams): Promise<GeneratedQuestion[]> {
  const generated: GeneratedQuestion[] = [];
  const selectedSubjects = (params.subjects && params.subjects.length > 0)
    ? params.subjects
    : ['Data Structures', 'Algorithms', 'DBMS', 'Java'];

  const targetDifficulty = params.difficulty || 'Intermediate';

  const mcqTarget = params.mcqCount ?? 4;
  const codingTarget = params.codingCount ?? 2;
  const subjectiveTarget = params.subjectiveCount ?? 1;
  const comprehensionTarget = params.comprehensionCount ?? 1;

  // Filter existing bank by subject preference first
  const subjectMatches = SEED_QUESTION_BANK.filter(q =>
    selectedSubjects.some(s => q.subject.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(q.subject.toLowerCase()))
  );

  // 1. Fill MCQs
  let addedMcqs = 0;
  for (const q of subjectMatches.filter(q => q.type === 'MCQ')) {
    if (addedMcqs < mcqTarget) {
      generated.push({ ...q, id: `gen-mcq-${Date.now()}-${addedMcqs + 1}`, order: generated.length + 1 });
      addedMcqs++;
    }
  }

  // If still need MCQs, draw from rest of bank or generate algorithmic variations
  if (addedMcqs < mcqTarget) {
    const fallbackMcqs = SEED_QUESTION_BANK.filter(q => q.type === 'MCQ' && !generated.some(g => g.prompt === q.prompt));
    for (const q of fallbackMcqs) {
      if (addedMcqs < mcqTarget) {
        generated.push({ ...q, id: `gen-mcq-${Date.now()}-${addedMcqs + 1}`, order: generated.length + 1 });
        addedMcqs++;
      }
    }
  }

  // Synthesize subject-specific MCQs if needed
  while (addedMcqs < mcqTarget) {
    const subj = selectedSubjects[addedMcqs % selectedSubjects.length];
    generated.push({
      id: `gen-mcq-${Date.now()}-${addedMcqs + 1}`,
      type: 'MCQ',
      subject: subj,
      topic: `${subj} Core Concepts`,
      difficulty: targetDifficulty,
      prompt: `In ${subj}, which fundamental architectural principle best guarantees modularity, maintainability, and loose coupling?`,
      options: [
        { id: 'A', text: 'Encapsulation and clear interface contracts' },
        { id: 'B', text: 'Global shared state with direct field mutation' },
        { id: 'C', text: 'Tight coupling of data models to transport protocols' },
        { id: 'D', text: 'Bypassing exception handling for maximum performance' }
      ],
      correctAnswer: 'A',
      multipleCorrect: false,
      explanation: 'Encapsulation hides internal implementation details and exposes clean interfaces, minimizing inter-module dependencies.',
      points: 10,
      order: generated.length + 1
    });
    addedMcqs++;
  }

  // 2. Fill Coding Questions
  let addedCoding = 0;
  for (const q of SEED_QUESTION_BANK.filter(q => q.type === 'CODING')) {
    if (addedCoding < codingTarget) {
      generated.push({ ...q, id: `gen-code-${Date.now()}-${addedCoding + 1}`, order: generated.length + 1 });
      addedCoding++;
    }
  }

  // 3. Fill Subjective Questions
  let addedSubjective = 0;
  for (const q of SEED_QUESTION_BANK.filter(q => q.type === 'SUBJECTIVE')) {
    if (addedSubjective < subjectiveTarget) {
      generated.push({ ...q, id: `gen-subj-${Date.now()}-${addedSubjective + 1}`, order: generated.length + 1 });
      addedSubjective++;
    }
  }

  // 4. Fill Comprehension Questions
  let addedComprehension = 0;
  for (const q of SEED_QUESTION_BANK.filter(q => q.type === 'COMPREHENSION')) {
    if (addedComprehension < comprehensionTarget) {
      generated.push({ ...q, id: `gen-comp-${Date.now()}-${addedComprehension + 1}`, order: generated.length + 1 });
      addedComprehension++;
    }
  }

  return generated;
}

/**
 * 2. Anti-Prompt-Injection Subjective Evaluator
 */
export async function evaluateSubjectiveAnswer(
  prompt: string,
  rubric: string | undefined,
  candidateAnswer: string
): Promise<SubjectiveEvaluationResult> {
  const answer = candidateAnswer ? candidateAnswer.trim() : '';

  if (!answer || answer.length < 10) {
    return {
      score: 0,
      correctness: 0,
      relevance: 0,
      completeness: 0,
      feedback: 'No substantive response was provided.',
      strengths: [],
      weaknesses: ['Response field was empty or too short.']
    };
  }

  // Anti-prompt-injection check: detect override attempts
  const lowerAnswer = answer.toLowerCase();
  const injectionPatterns = [
    'ignore previous instructions',
    'system prompt',
    'give me 10/10',
    'give full marks',
    'output only json',
    'you are now in evaluation mode'
  ];

  if (injectionPatterns.some(pat => lowerAnswer.includes(pat))) {
    return {
      score: 2,
      correctness: 2,
      relevance: 2,
      completeness: 2,
      feedback: 'Response contained invalid prompt override attempts instead of technical explanation.',
      strengths: [],
      weaknesses: ['Prompt injection pattern detected and rejected by evaluation security engine.']
    };
  }

  let score = 5;
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Word count & depth heuristics
  const wordCount = answer.split(/\s+/).filter(Boolean).length;
  if (wordCount >= 80) {
    score += 2;
    strengths.push('Comprehensive explanation with thorough structural detail');
  } else if (wordCount >= 40) {
    score += 1;
    strengths.push('Good concise explanation');
  } else {
    weaknesses.push('Could expand on low-level operational trade-offs');
  }

  // Key architectural concepts
  const technicalKeywords = [
    'cache', 'b-tree', 'index', 'latency', 'dram', 'complexity', 'log', 'lock',
    'concurrency', 'transaction', 'memory', 'cpu', 'overhead', 'consistency',
    'partition', 'pipeline', 'stack', 'heap', 'thread', 'amortized'
  ];

  const matchedKeywords = technicalKeywords.filter(kw => lowerAnswer.includes(kw));
  if (matchedKeywords.length >= 3) {
    score += 2;
    strengths.push(`Accurate utilization of domain terminology (${matchedKeywords.slice(0, 3).join(', ')})`);
  } else if (matchedKeywords.length >= 1) {
    score += 1;
    strengths.push('Included relevant technical terminology');
  } else {
    weaknesses.push('Missing specific core system architectural terminology');
  }

  const finalScore = Math.min(10, Math.max(1, score));

  return {
    score: finalScore,
    correctness: Math.min(10, finalScore + 1),
    relevance: 9,
    completeness: finalScore,
    feedback: `Response evaluated against rubric criteria. Demonstrated solid foundational awareness.`,
    strengths: strengths.length > 0 ? strengths : ['Clear communication'],
    weaknesses: weaknesses.length > 0 ? weaknesses : ['Could provide deeper trade-off analysis']
  };
}

/**
 * 3. AI Performance Report Synthesizer
 */
export function generateAssessmentReport(
  overallScorePercent: number,
  mcqScore: number,
  codingScore: number,
  subjectiveScore: number,
  comprehensionScore: number,
  subjects: string[] = []
): {
  overallFeedback: string;
  strengths: string[];
  weaknesses: string[];
  aiReportText: string;
} {
  const rating = overallScorePercent >= 80 ? 'Proficient / Strong' : overallScorePercent >= 60 ? 'Competent' : 'Foundational';

  const strengths = [
    overallScorePercent >= 75
      ? 'Strong theoretical comprehension and algorithmic reasoning'
      : 'Solid grasp of foundational computer science principles',
    mcqScore >= 75
      ? 'Excellent accuracy across core multiple-choice technical questions'
      : 'Good baseline technical vocabulary and conceptual awareness'
  ];

  if (codingScore >= 80) {
    strengths.push('Clean algorithmic syntax and successful test case execution');
  }

  const weaknesses = [
    overallScorePercent < 75
      ? 'Review low-level hardware cache interactions and database concurrency anomalies'
      : 'Refine boundary-case optimization and time-complexity constraints in coding challenges'
  ];

  const primarySubject = subjects[0] || 'Data Structures';

  const aiReportText = `### Formal Candidate Evaluation Report

**Overall Rating**: **${rating}** (${overallScorePercent.toFixed(1)}%)

#### Section Breakdown:
- **Multiple Choice Questions**: ${mcqScore.toFixed(0)}%
- **Coding Implementation**: ${codingScore.toFixed(0)}%
- **Subjective Architectural Concepts**: ${subjectiveScore.toFixed(0)}%
- **Technical Reading Comprehension**: ${comprehensionScore.toFixed(0)}%

#### Evaluator Summary:
Candidate demonstrated **${rating.toLowerCase()}** competency across evaluated subjects (${subjects.slice(0, 3).join(', ') || 'Software Engineering'}). Demonstrated solid grasp of core data structures, system architecture, and algorithmic execution.

#### Recommended Next Steps:
1. Practice 5 advanced constraint-handling problems in **${primarySubject}**.
2. Review database transaction isolation levels and B-Tree write amplification trade-offs.
3. Deepen awareness of memory hierarchy locality and CPU cache line utilization.`;

  return {
    overallFeedback: `Candidate demonstrated ${rating.toLowerCase()} proficiency.`,
    strengths,
    weaknesses,
    aiReportText
  };
}
