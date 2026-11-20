export interface AssessmentQuestion {
  id: string;
  type: 'MCQ' | 'Coding' | 'Subjective' | 'Comprehension';
  title: string;
  description: string;
  points: number;
  subject?: string;
  topic?: string;
  options?: { id: string; text: string; isCorrect: boolean }[];
  starterCode?: string;
  testCases?: { id: string; input: string; expectedOutput: string; isHidden?: boolean }[];
  sampleAnswer?: string;
  comprehensionPassage?: string;
}

export interface Assessment {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  subjects: string[];
  questionTypes?: string[];
  sections?: { id: string; name: string; questionCount: number; durationMinutes?: number }[];
  canNavigateBackwards?: boolean;
  questions: AssessmentQuestion[];
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  totalPoints?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_ASSESSMENTS: Assessment[] = [
  {
    id: 'asm-fullstack-101',
    title: 'Full Stack Software Engineer Assessment',
    description: 'Comprehensive evaluation covering React components, Node.js REST APIs, SQL indexing, and algorithmic problem-solving.',
    durationMinutes: 60,
    difficulty: 'Intermediate',
    subjects: ['React', 'Node.js', 'PostgreSQL', 'Algorithms'],
    questionTypes: ['MCQ', 'Coding', 'Subjective'],
    status: 'PUBLISHED',
    totalPoints: 100,
    questions: [
      {
        id: 'q1',
        type: 'MCQ',
        title: 'React 18 Automatic Batching',
        description: 'Which of the following statements accurately describes state batching behavior in React 18?',
        points: 15,
        subject: 'React',
        topic: 'State Management',
        options: [
          { id: 'opt1', text: 'Batching only occurs inside native React synthetic event handlers.', isCorrect: false },
          { id: 'opt2', text: 'State updates inside promises, setTimeout, and native event handlers are automatically batched together.', isCorrect: true },
          { id: 'opt3', text: 'Batching requires wrapping updates inside unstable_batchedUpdates.', isCorrect: false },
          { id: 'opt4', text: 'Automatic batching is disabled when using async/await.', isCorrect: false }
        ]
      },
      {
        id: 'q2',
        type: 'Coding',
        title: 'Two Sum Optimized Hash Search',
        description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target` in O(n) time complexity.',
        points: 35,
        subject: 'Algorithms',
        topic: 'Hash Maps',
        starterCode: `function twoSum(nums, target) {\n  // Write your O(n) solution using a Hash Map\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}`,
        testCases: [
          { id: 'tc1', input: '[2,7,11,15], 9', expectedOutput: '[0, 1]', isHidden: false },
          { id: 'tc2', input: '[3,2,4], 6', expectedOutput: '[1, 2]', isHidden: false },
          { id: 'tc3', input: '[3,3], 6', expectedOutput: '[0, 1]', isHidden: true }
        ]
      },
      {
        id: 'q3',
        type: 'MCQ',
        title: 'Database Indexing Trade-offs',
        description: 'What is the primary trade-off of adding a B-Tree composite index on high-write relational database tables?',
        points: 20,
        subject: 'PostgreSQL',
        topic: 'Query Optimization',
        options: [
          { id: 'opt1', text: 'Faster SELECT query lookups at the expense of higher disk I/O and slower INSERT/UPDATE operations.', isCorrect: true },
          { id: 'opt2', text: 'Faster write operations but slower range queries.', isCorrect: false },
          { id: 'opt3', text: 'Elimination of all table locking mechanisms.', isCorrect: false },
          { id: 'opt4', text: 'Lower memory footprint on buffer pool caches.', isCorrect: false }
        ]
      },
      {
        id: 'q4',
        type: 'Subjective',
        title: 'Microservices Idempotency & Distributed Transactions',
        description: 'Explain how you would design an idempotent payment processing endpoint that prevents duplicate credit card charges during network timeouts.',
        points: 30,
        subject: 'System Design',
        topic: 'Distributed Systems',
        sampleAnswer: 'Use unique Idempotency-Key headers passed by clients stored in Redis/DB with atomic conditional lock insertion (SETNX). Cache response payloads to return identical receipts for retried requests.'
      }
    ]
  },
  {
    id: 'asm-python-algo-102',
    title: 'Python Algorithms & Data Structures Challenge',
    description: 'Test your algorithmic mastery in Python 3 covering binary trees, dynamic programming, and Big-O efficiency.',
    durationMinutes: 45,
    difficulty: 'Advanced',
    subjects: ['Python', 'Data Structures', 'Dynamic Programming'],
    questionTypes: ['MCQ', 'Coding'],
    status: 'PUBLISHED',
    totalPoints: 100,
    questions: [
      {
        id: 'py-q1',
        type: 'MCQ',
        title: 'Python Global Interpreter Lock (GIL)',
        description: 'How does the Python Global Interpreter Lock affect multithreaded CPU-bound tasks versus I/O-bound tasks?',
        points: 25,
        subject: 'Python',
        topic: 'Concurrency',
        options: [
          { id: 'p1', text: 'GIL prevents multiple native threads from executing Python bytecodes simultaneously, restricting CPU-bound multithreading to a single core.', isCorrect: true },
          { id: 'p2', text: 'GIL prevents network sockets from performing non-blocking reads.', isCorrect: false },
          { id: 'p3', text: 'GIL automatically converts multi-threaded programs to multi-process pools.', isCorrect: false },
          { id: 'p4', text: 'GIL only applies to async/await coroutines in asyncio.', isCorrect: false }
        ]
      },
      {
        id: 'py-q2',
        type: 'Coding',
        title: 'Valid Parentheses String Validation',
        description: 'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid using a Stack in O(n) time.',
        points: 45,
        subject: 'Data Structures',
        topic: 'Stack',
        starterCode: `def isValid(s: str) -> bool:\n    stack = []\n    mapping = {')': '(', '}': '{', ']': '['}\n    for char in s:\n        if char in mapping:\n            top = stack.pop() if stack else '#'\n            if mapping[char] != top:\n                return False\n        else:\n            stack.append(char)\n    return not stack`,
        testCases: [
          { id: 'py-tc1', input: '"()"', expectedOutput: 'True', isHidden: false },
          { id: 'py-tc2', input: '"()[]{}"', expectedOutput: 'True', isHidden: false },
          { id: 'py-tc3', input: '"(]"', expectedOutput: 'False', isHidden: false },
          { id: 'py-tc4', input: '"([{}])"', expectedOutput: 'True', isHidden: true }
        ]
      },
      {
        id: 'py-q3',
        type: 'MCQ',
        title: 'Binary Search Tree Balancing',
        description: 'What is the worst-case time complexity of searching a value in an unbalanced Binary Search Tree with N nodes?',
        points: 30,
        subject: 'Data Structures',
        topic: 'Trees',
        options: [
          { id: 't1', text: 'O(log N)', isCorrect: false },
          { id: 't2', text: 'O(N) when the tree degenerates into a linked list.', isCorrect: true },
          { id: 't3', text: 'O(1)', isCorrect: false },
          { id: 't4', text: 'O(N log N)', isCorrect: false }
        ]
      }
    ]
  },
  {
    id: 'asm-distributed-103',
    title: 'Distributed Systems & Cloud Architecture Exam',
    description: 'Senior engineering assessment on CAP theorem, distributed caching, event streams, and fault tolerance.',
    durationMinutes: 60,
    difficulty: 'Advanced',
    subjects: ['Distributed Systems', 'Cloud', 'Kafka', 'Redis'],
    questionTypes: ['MCQ', 'Subjective'],
    status: 'PUBLISHED',
    totalPoints: 100,
    questions: [
      {
        id: 'ds-q1',
        type: 'MCQ',
        title: 'CAP Theorem Partition Tolerance',
        description: 'Under the CAP theorem, when a network partition (P) occurs in a distributed cluster, what fundamental choice must the system make?',
        points: 30,
        subject: 'Distributed Systems',
        topic: 'CAP Theorem',
        options: [
          { id: 'cap1', text: 'Choose between Consistency (returning error or waiting for sync) and Availability (returning stale or local data).', isCorrect: true },
          { id: 'cap2', text: 'Choose between database sharding and vertical CPU scaling.', isCorrect: false },
          { id: 'cap3', text: 'Choose between synchronous encryption and asynchronous TLS.', isCorrect: false },
          { id: 'cap4', text: 'Choose between ACID and Raft consensus.', isCorrect: false }
        ]
      },
      {
        id: 'ds-q2',
        type: 'Subjective',
        title: 'Cache Stampede & Thundering Herd Prevention',
        description: 'Describe 3 strategies to prevent cache stampede (thundering herd problem) when a high-traffic hot cache key expires in Redis.',
        points: 40,
        subject: 'Cloud Architecture',
        topic: 'Caching',
        sampleAnswer: '1. Probabilistic Early Expiration (XFetch algorithm). 2. Mutex Distributed Locking around DB fetch. 3. Asynchronous background cache refresh with long soft TTLs.'
      },
      {
        id: 'ds-q3',
        type: 'MCQ',
        title: 'Apache Kafka Consumer Groups',
        description: 'If a Kafka topic has 4 partitions and a consumer group has 6 active consumer instances, how many consumer instances will remain idle?',
        points: 30,
        subject: 'Kafka',
        topic: 'Event Streaming',
        options: [
          { id: 'k1', text: '2 consumers will remain idle because each partition is assigned to at most one consumer in a group.', isCorrect: true },
          { id: 'k2', text: '0 consumers will remain idle (round-robin message distribution).', isCorrect: false },
          { id: 'k3', text: '4 consumers will remain idle.', isCorrect: false },
          { id: 'k4', text: 'Kafka will dynamically create 2 extra partitions.', isCorrect: false }
        ]
      }
    ]
  }
];

const PUBLISHED_KEY = 'cortexcode_published_assessments';
const CREATOR_KEY = 'cortexcode_creator_assessments';

export function getPublishedAssessments(): Assessment[] {
  if (typeof window === 'undefined') return DEFAULT_ASSESSMENTS;
  try {
    const stored = localStorage.getItem(PUBLISHED_KEY);
    if (!stored) {
      localStorage.setItem(PUBLISHED_KEY, JSON.stringify(DEFAULT_ASSESSMENTS));
      return DEFAULT_ASSESSMENTS;
    }
    const parsed: Assessment[] = JSON.parse(stored);
    return parsed.filter(a => a.status === 'PUBLISHED');
  } catch {
    return DEFAULT_ASSESSMENTS;
  }
}

export function getCreatorAssessments(): Assessment[] {
  if (typeof window === 'undefined') return DEFAULT_ASSESSMENTS;
  try {
    const stored = localStorage.getItem(CREATOR_KEY);
    if (!stored) {
      localStorage.setItem(CREATOR_KEY, JSON.stringify(DEFAULT_ASSESSMENTS));
      return DEFAULT_ASSESSMENTS;
    }
    return JSON.parse(stored);
  } catch {
    return DEFAULT_ASSESSMENTS;
  }
}

export function saveAssessmentToStorage(assessment: Assessment): void {
  if (typeof window === 'undefined') return;
  try {
    // 1. Update Creator List
    const allCreator = getCreatorAssessments();
    const existingIndex = allCreator.findIndex(a => a.id === assessment.id);
    let updatedCreator: Assessment[];
    if (existingIndex >= 0) {
      updatedCreator = [...allCreator];
      updatedCreator[existingIndex] = { ...assessment, updatedAt: new Date().toISOString() };
    } else {
      updatedCreator = [{ ...assessment, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...allCreator];
    }
    localStorage.setItem(CREATOR_KEY, JSON.stringify(updatedCreator));

    // 2. Update Published List
    const allPublished = getPublishedAssessments();
    let updatedPublished: Assessment[];
    if (assessment.status === 'PUBLISHED') {
      const pubIndex = allPublished.findIndex(a => a.id === assessment.id);
      if (pubIndex >= 0) {
        updatedPublished = [...allPublished];
        updatedPublished[pubIndex] = { ...assessment, updatedAt: new Date().toISOString() };
      } else {
        updatedPublished = [{ ...assessment, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...allPublished];
      }
    } else {
      updatedPublished = allPublished.filter(a => a.id !== assessment.id);
    }
    localStorage.setItem(PUBLISHED_KEY, JSON.stringify(updatedPublished));
  } catch (err) {
    console.error('Failed to save assessment to storage:', err);
  }
}

export function publishAssessmentInStorage(id: string): void {
  const creatorList = getCreatorAssessments();
  const target = creatorList.find(a => a.id === id);
  if (target) {
    target.status = 'PUBLISHED';
    saveAssessmentToStorage(target);
  }
}

export function archiveAssessmentInStorage(id: string): void {
  const creatorList = getCreatorAssessments();
  const target = creatorList.find(a => a.id === id);
  if (target) {
    target.status = 'ARCHIVED';
    saveAssessmentToStorage(target);
  }
}

export function deleteAssessmentInStorage(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const creatorList = getCreatorAssessments().filter(a => a.id !== id);
    const publishedList = getPublishedAssessments().filter(a => a.id !== id);
    localStorage.setItem(CREATOR_KEY, JSON.stringify(creatorList));
    localStorage.setItem(PUBLISHED_KEY, JSON.stringify(publishedList));
  } catch (err) {
    console.error('Failed to delete assessment:', err);
  }
}
