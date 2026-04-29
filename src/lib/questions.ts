export type Question = {
  id: string;
  question: string;
  options: string[];
  correct: number; // index
};

export type Category = "aptitude" | "reasoning" | "programming";

export const CATEGORIES: { id: Category; title: string; description: string; emoji: string }[] = [
  { id: "aptitude", title: "Aptitude", description: "Numbers, percentages, ratios", emoji: "🧮" },
  { id: "reasoning", title: "Reasoning", description: "Logic, patterns, sequences", emoji: "🧩" },
  { id: "programming", title: "Programming", description: "Core CS & coding fundamentals", emoji: "💻" },
];

export const QUESTIONS: Record<Category, Question[]> = {
  aptitude: [
    { id: "a1", question: "What is 15% of 240?", options: ["24", "30", "36", "40"], correct: 2 },
    { id: "a2", question: "If a train covers 360 km in 4 hours, what is its average speed?", options: ["80 km/h", "85 km/h", "90 km/h", "100 km/h"], correct: 2 },
    { id: "a3", question: "Ratio 3:5 — if the sum is 64, the larger number is:", options: ["24", "32", "40", "48"], correct: 2 },
    { id: "a4", question: "A shop offers 20% then 10% discount. Net discount?", options: ["28%", "30%", "25%", "32%"], correct: 0 },
    { id: "a5", question: "Compound interest on ₹1000 at 10% for 2 years is:", options: ["₹200", "₹210", "₹220", "₹250"], correct: 1 },
    { id: "a6", question: "The average of first 10 natural numbers is:", options: ["4.5", "5", "5.5", "6"], correct: 2 },
    { id: "a7", question: "If x + 1/x = 4, then x² + 1/x² = ?", options: ["12", "14", "16", "18"], correct: 1 },
    { id: "a8", question: "A man buys at ₹80 and sells at ₹100. Profit %?", options: ["20%", "22%", "25%", "30%"], correct: 2 },
  ],
  reasoning: [
    { id: "r1", question: "Find the next: 2, 6, 12, 20, 30, ?", options: ["40", "42", "44", "46"], correct: 1 },
    { id: "r2", question: "If MONDAY is coded as 123456, then DYNAMO is:", options: ["465123", "461523", "463125", "461325"], correct: 1 },
    { id: "r3", question: "All roses are flowers. Some flowers fade. Therefore:", options: ["All roses fade", "Some roses fade", "No roses fade", "Cannot be determined"], correct: 3 },
    { id: "r4", question: "Odd one out: Apple, Mango, Carrot, Banana", options: ["Apple", "Mango", "Carrot", "Banana"], correct: 2 },
    { id: "r5", question: "Pointing to a man, Sara said, 'He is my mother's only son'. The man is Sara's:", options: ["Father", "Brother", "Uncle", "Cousin"], correct: 1 },
    { id: "r6", question: "Next in series: A, C, F, J, ?", options: ["M", "N", "O", "P"], correct: 2 },
    { id: "r7", question: "If today is Wednesday, what day will it be after 61 days?", options: ["Sunday", "Monday", "Tuesday", "Saturday"], correct: 0 },
    { id: "r8", question: "Statement: All cats are dogs. Some dogs bark. Conclusion?", options: ["All cats bark", "Some cats bark", "No cats bark", "None can be concluded"], correct: 3 },
  ],
  programming: [
    { id: "p1", question: "Time complexity of binary search?", options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], correct: 1 },
    { id: "p2", question: "Which data structure uses LIFO?", options: ["Queue", "Stack", "Tree", "Graph"], correct: 1 },
    { id: "p3", question: "What does SQL stand for?", options: ["Strong Query Language", "Structured Query Language", "Simple Query Logic", "System Quick Language"], correct: 1 },
    { id: "p4", question: "Which is NOT an OOP principle?", options: ["Encapsulation", "Inheritance", "Compilation", "Polymorphism"], correct: 2 },
    { id: "p5", question: "In JavaScript, typeof null returns:", options: ["'null'", "'undefined'", "'object'", "'number'"], correct: 2 },
    { id: "p6", question: "Worst-case complexity of quicksort?", options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"], correct: 2 },
    { id: "p7", question: "HTTP status 401 means:", options: ["Not Found", "Unauthorized", "Forbidden", "Server Error"], correct: 1 },
    { id: "p8", question: "Which keyword creates a constant in TypeScript?", options: ["let", "var", "const", "static"], correct: 2 },
  ],
};

export const PASS_THRESHOLD = 60; // %
