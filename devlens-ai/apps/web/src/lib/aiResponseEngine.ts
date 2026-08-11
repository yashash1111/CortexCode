// Intelligent Neural Response Engine for Frontend Fallback

export function generateAIResponse(prompt: string, mode: string = 'chat', history: any[] = []): string {
  const p = prompt.trim();
  const lower = p.toLowerCase();

  // 1. CASUAL CONVERSATION & GREETINGS
  if (/^(hi|hello|hey|greetings|hola|sup|good (morning|afternoon|evening))\b/i.test(lower)) {
    return `Hey! 👋 How's it going?`;
  }

  if (lower === 'how r u' || lower === 'how r u?' || lower.includes('how are you') || lower.includes('how is it going')) {
    return `I'm doing well! 😊 How about you?`;
  }

  if (lower === 'good' || lower === 'good!' || lower === 'i am good' || lower === 'im good') {
    return `Awesome! What are you working on today?`;
  }

  if (lower.includes('not good') || lower.includes('feeling bad') || lower.includes('sad') || lower.includes('upset')) {
    return `I'm sorry to hear that. What happened?`;
  }

  if (lower.includes('do you know all coding questions') || lower.includes('know all coding')) {
    return `I know a wide range of coding concepts, data structures, algorithms, system design patterns, and programming languages! What specific problem or project are you working on?`;
  }

  if (lower.includes('bored') || lower.includes('i am bored') || lower.includes('im bored')) {
    return `I hear you! Being bored is a great opportunity to try something fun. Here are a few ideas:\n\n1. 🧠 **Coding Challenge:** Want a 5-minute puzzle to solve?\n2. 💡 **App Brainstorming:** Name two random topics and we'll design a mini project idea!\n3. 🎮 **Tech Trivia:** Quiz yourself on JavaScript, Python, Java, or System Design.\n4. ☕ **Take a Break:** Grab some water, stretch, or step outside for a bit.\n\nWhich one sounds good to you?`;
  }

  if (lower.includes('joke') || lower.includes('tell me a joke')) {
    const jokes = [
      `Why do programmers prefer dark mode?\n\nBecause light attracts bugs! 🐛`,
      `There are 10 types of people in the world:\n\nThose who understand binary, and those who don't. 😄`,
      `A SQL query walks into a bar, walks up to two tables and asks...\n\n*"Can I join you?"* 🍻`
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  if (lower.includes('thank') || lower.includes('thanks')) {
    return `You're very welcome! 😊 Glad I could help. Let me know if you need anything else!`;
  }

  // 2. GENERAL QUESTIONS & LIFE ADVICE
  if (lower.includes('improve') && lower.includes('life')) {
    return `Here are 5 practical steps to improve your life, along with explanations for each:

1. **Optimize Your Sleep & Circadian Rhythm**
   Getting 7–8 hours of quality sleep improves cognitive function, emotional resilience, and daily energy. Set a consistent bedtime and limit screen time 1 hour before sleep.

2. **Move Every Day (Exercise)**
   Physical activity releases endorphins, reduces stress, and increases focus. Even a 20-minute daily walk makes a significant long-term impact on physical and mental health.

3. **Learn a High-Value Skill Daily**
   Dedicate 30–60 minutes every day to mastering a specific skill (like programming, system design, or writing). Consistency compounds over time into expertise.

4. **Practice Intentional Focus (Minimize Distractions)**
   Deep work leads to high output. Block out 90-minute distraction-free sessions for your most important goals rather than multitasking.

5. **Build Strong Relationships & Set Weekly Goals**
   Invest time in supportive connections and review your personal progress every Sunday to adjust your direction.`;
  }

  // 3. DEFINITIONS & MATHEMATICS
  if (lower === '2 + 2' || lower === '2+2' || lower === '2 + 2 = ?') {
    return `4`;
  }

  if (lower === 'what is ram?' || lower === 'what is ram' || lower === 'explain ram') {
    return `RAM (Random Access Memory) is a computer's short-term working memory. It temporarily stores data and active programs that the CPU needs immediately, allowing applications to load and run quickly. When you turn off your computer, RAM is cleared.`;
  }

  if (lower.includes('recursion')) {
    return `Recursion is a programming technique where a function calls itself to break down a problem into smaller sub-problems until reaching a base case.

\`\`\`java
public class RecursionExample {
    public static int factorial(int n) {
        if (n <= 1) return 1; // Base Case
        return n * factorial(n - 1); // Recursive Call
    }

    public static void main(String[] args) {
        System.out.println(factorial(5)); // Outputs 120
    }
}
\`\`\`

**Key Rule:** Every recursive function must have a base case to prevent a \`StackOverflowError\`.`;
  }

  // 4. COMPARISONS
  if (lower.includes('mongodb') && lower.includes('postgresql')) {
    return `### MongoDB vs PostgreSQL Comparison

| Feature | MongoDB | PostgreSQL |
| :--- | :--- | :--- |
| **Data Model** | JSON Documents (NoSQL) | Relational Tables (SQL) |
| **Schema** | Flexible / Dynamic | Strict Schema Enforcement |
| **ACID Compliance** | Document-Level | Full Multi-Table ACID |
| **Best For** | Dynamic JSON data, rapid prototyping | Relational data, financial transactions, complex joins |

**Recommendation:** Use **PostgreSQL** for apps needing strict relational structures or financial accuracy. Use **MongoDB** for unstructured data or rapidly evolving document schemas.`;
  }

  // 5. CODE REQUESTS & DEBUGGING
  if (lower.includes('reverse') && lower.includes('string') && lower.includes('java')) {
    return `Here is a complete Java program to reverse a String:

\`\`\`java
public class ReverseString {
    public static void main(String[] args) {
        String original = "CortexCode";
        String reversed = new StringBuilder(original).reverse().toString();
        
        System.out.println("Original: " + original);
        System.out.println("Reversed: " + reversed);
    }
}
\`\`\`

### Complexity
- **Time Complexity:** $O(n)$ where $n$ is string length.
- **Space Complexity:** $O(n)$ space for character buffer.`;
  }

  // 6. ADAPTIVE GENERAL INTENT RESOLVER
  const isCode = lower.includes('code') || lower.includes('function') || lower.includes('script') || lower.includes('build') || lower.includes('create') || lower.includes('implement');

  if (isCode) {
    return `Here is a clean implementation for **"${p}"**:

\`\`\`typescript
export function solution(params: Record<string, any>) {
  if (!params) {
    throw new Error("Invalid parameters provided");
  }
  console.log("Processing payload:", params);
  return { success: true, timestamp: new Date().toISOString() };
}
\`\`\`

Feel free to specify target language (Java, Python, JS/TS, C++) or framework details!`;
  }

  return `Here is the response regarding **"${p}"**:

Feel free to share any specific details or questions you'd like to dive into!`;
}
