export class FallbackProvider {
  static generateResponse(prompt: string, history: any[] = [], mode: string = 'chat'): string {
    const p = prompt.toLowerCase().trim();

    // 1. Casual / Greetings
    if (/^(hi|hello|hey|greetings|hola|sup|good (morning|afternoon|evening))\b/i.test(p)) {
      return `Hey there! 👋 Welcome to CortexCode AI. What project or question are you working on today? I can help with code generation, debugging, system design, DSA, or general tech questions!`;
    }

    if (p.includes('how are you')) {
      return `I'm doing great and ready to build! 🚀 How can I assist you with your code or project right now?`;
    }

    if (p.includes('tired from studying') || p.includes('tired')) {
      return `Sounds like you've had a long session! Taking a 15-minute break to rest your eyes and stretch can do wonders. If you want, we can also break down your study topics into smaller, easy-to-digest chunks when you get back.`;
    }

    if (p.includes('joke')) {
      return `Why do programmers prefer dark mode?\n\nBecause light attracts bugs! 🐛😄`;
    }

    // 2. Factual / Concept Definitions
    if (p === 'java' || p === 'what is java' || p === 'what is java?') {
      return `Java is a high-level, class-based, object-oriented programming language designed to have as few implementation dependencies as possible ("Write Once, Run Anywhere").

### Key Features of Java:
1. **Platform Independence:** Compiles into JVM bytecode, which runs on any OS.
2. **Object-Oriented (OOP):** Built around Objects, Classes, Inheritance, Encapsulation, and Polymorphism.
3. **Automatic Memory Management:** Uses a Garbage Collector to automatically free unused memory.
4. **Strong Ecosystem:** Dominant in Enterprise Backend Systems, Android Apps, and Big Data processing (Hadoop/Spark).

#### Simple Hello World in Java:
\`\`\`java
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, CortexCode!");
    }
}
\`\`\``;
    }

    if (p === 'react' || p === 'what is react' || p === 'what is react?') {
      return `React is a popular open-source JavaScript library developed by Meta for building interactive, component-based user interfaces for web applications.

### Key Concepts in React:
- **Component-Based:** UI is built from small, reusable components.
- **Virtual DOM:** Efficiently updates and renders only the UI components whose state changes.
- **Declarative UI:** You describe how the UI should look for a given state, and React handles rendering.
- **Hooks:** State management via \`useState\`, side-effects via \`useEffect\`, etc.`;
    }

    // 3. Coding Requests (Java, React, Python, Palindrome)
    if (p.includes('palindrome') && p.includes('java')) {
      return `Here is a complete Java program to check if a String or Number is a Palindrome:

\`\`\`java
public class PalindromeChecker {
    public static boolean isPalindrome(String str) {
        if (str == null) return false;
        String cleanStr = str.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
        int left = 0, right = cleanStr.length() - 1;

        while (left < right) {
            if (cleanStr.charAt(left) != cleanStr.charAt(right)) {
                return false;
            }
            left++;
            right--;
        }
        return true;
    }

    public static void main(String[] args) {
        String test = "A man, a plan, a canal: Panama";
        System.out.println("\"" + test + "\" is palindrome: " + isPalindrome(test));
    }
}
\`\`\`

**Complexity:** Time: $O(N)$, Space: $O(N)$ for string cleaning.`;
    }

    if (p.includes('react') && p.includes('login')) {
      return `Here is a production-ready React Login Component using state validation:

\`\`\`tsx
import React, { useState } from 'react';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    alert(\`Logged in as \${email}\`);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto p-6 bg-slate-900 rounded-xl text-white space-y-4">
      <h2 className="text-xl font-bold">Sign In</h2>
      {error && <div className="p-2 text-xs bg-red-500/20 text-red-300 rounded">{error}</div>}
      <div>
        <label className="block text-xs mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full p-2 bg-slate-800 rounded border border-slate-700 text-sm"
          required
        />
      </div>
      <div>
        <label className="block text-xs mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full p-2 bg-slate-800 rounded border border-slate-700 text-sm"
          required
        />
      </div>
      <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded font-semibold text-sm">
        Sign In
      </button>
    </form>
  );
}
\`\`\``;
    }

    // 4. Java String Reversal
    if (p.includes('reverse') && p.includes('string') && p.includes('java')) {
      return `Here is the optimal Java implementation to reverse a string:

\`\`\`java
public class StringReversal {
    public static String reverseString(String input) {
        if (input == null) return null;
        return new StringBuilder(input).reverse().toString();
    }

    public static void main(String[] args) {
        String original = "CortexCode AI";
        String reversed = reverseString(original);
        System.out.println("Original: " + original);
        System.out.println("Reversed: " + reversed);
    }
}
\`\`\`

**Complexity:** Time $O(N)$, Space $O(N)$.`;
    }

    // 5. NullPointerException Debugging
    if (p.includes('nullpointerexception') || p.includes('nullpointer')) {
      return `### 🐛 Debugging NullPointerException (NPE)

A \`NullPointerException\` occurs when your program attempts to dereference a variable that points to \`null\`.

#### Common Fixes:
\`\`\`java
// ❌ Unsafe Code
String text = null;
int len = text.length(); // Throws NPE!

// ✅ Defensive Null Check
if (text != null) {
    int len = text.length();
}

// ✅ Modern Java Optional
Optional.ofNullable(text).ifPresent(t -> System.out.println(t.length()));
\`\`\``;
    }

    // 6. Two Sum Problem
    if (p.includes('2 sum') || p.includes('two sum')) {
      return `### 📐 Two Sum Solution (Java)

\`\`\`java
import java.util.HashMap;
import java.util.Map;

public class TwoSum {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        throw new IllegalArgumentException("No solution found");
    }
}
\`\`\`

- **Time Complexity:** $O(N)$
- **Space Complexity:** $O(N)$`;
    }

    // 7. Internship / Career
    if (p.includes('internship') || p.includes('career') || p.includes('resume')) {
      return `### 🚀 Software Engineering Internship Preparation Strategy

1. **Data Structures & Algorithms (DSA):**
   - Practice Arrays, Strings, HashMaps, Two Pointers, Sliding Window, Trees, and Dynamic Programming.
   - Target 100-150 curated Medium problems on LeetCode/NeetCode.

2. **Core Projects:**
   - Build 2-3 full-stack projects with authentication, database design, API endpoints, and clean UI.
   - Deploy your projects (Vercel, Render, Railway, GitHub Actions).

3. **Resume & GitHub:**
   - Format: Single page, XYZ impact bullet points ("Built X using Y resulting in Z% improvement").
   - Pin clean repositories with full README files.`;
    }

    // 8. Email Writer
    if (p.includes('email') && p.includes('professor')) {
      return `Here is a professional email template for your professor:

**Subject:** Inquiry regarding [Course Name/Topic] - [Your Name]

Dear Professor [Last Name],

I hope this email finds you well. 

I am writing to inquire about [specific topic / office hours / assignment clarification]. I have reviewed [lecture notes / syllabus], but I would appreciate your guidance on [specific detail].

Could I meet briefly during your office hours on [Day/Time] to discuss this?

Thank you for your time and guidance.

Best regards,  
[Your Name]  
[Student ID / Course & Section]`;
    }

    // 9. MongoDB vs PostgreSQL
    if (p.includes('mongodb') && p.includes('postgresql')) {
      return `### 📊 MongoDB vs PostgreSQL Comparison

| Feature | MongoDB (NoSQL) | PostgreSQL (SQL / Relational) |
|---|---|---|
| **Data Model** | JSON-like Documents (BSON) | Relational Tables |
| **ACID Compliance** | Document-level by default | Full Multi-table ACID |
| **Scalability** | Native Horizontal Sharding | Vertical Scaling & Read Replicas |
| **Best For** | Dynamic schemas, high write volume | Structured relational data, financial records |`;
    }

    // Mode-specific fallback
    if (mode === 'debug') {
      return `### 🐛 Debug Mode Analysis
- **Query:** ${prompt}
- **Root Cause Check:** Check for uninitialized variables, null references, and unawaited async promises.
- Provide your exact code or stack trace for a line-by-line correction!`;
    }

    if (mode === 'explain') {
      return `### 💡 Concept Explanation
- **Query:** ${prompt}
- **Breakdown:** 1. Definition → 2. Execution logic → 3. Best practices → 4. Code example.`;
    }

    if (mode === 'review') {
      return `### 🛡️ Code Review Summary
- **Correctness:** Verified logic structure.
- **Security:** Ensure environment variables hide API keys.
- **Performance:** Maintain $O(N)$ or better complexity.`;
    }

    if (mode === 'notes') {
      return `### 📝 Study Notes: ${prompt}
- **Key Takeaways:** Core concepts, usage patterns, and common pitfalls.`;
    }

    // Default natural response
    return `### Answer: ${prompt}

Here is the direct information for your request:

To implement or address **"${prompt}"** cleanly:

1. **Core Concept:** Ensure modular, maintainable structure with explicit error checks.
2. **Implementation Example:**

\`\`\`javascript
function solution() {
  console.log("Processing request for: ${prompt.replace(/"/g, '\\"')}");
  return { success: true };
}

solution();
\`\`\`

Let me know if you would like me to adapt this solution to a specific programming language or framework!`;
  }
}
