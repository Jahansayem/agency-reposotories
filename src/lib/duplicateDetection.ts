import { Todo } from '@/types/todo';

// Extract phone numbers from text
// BUGFIX UTIL-003: Use more restrictive regex to prevent catastrophic backtracking
export function extractPhoneNumbers(text: string): string[] {
  // Limit input length to prevent ReDoS attacks
  const safeText = text.length > 10000 ? text.slice(0, 10000) : text;

  // Use a more restrictive, non-backtracking regex pattern
  // This pattern matches phone numbers without nested optional groups
  const phoneRegex = /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)[-.\s]?\d{3}[-.\s]?\d{4}|\+?1[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const matches = safeText.match(phoneRegex) || [];
  // Normalize: remove all non-digits
  return matches.map(m => m.replace(/\D/g, '')).filter(m => m.length >= 10 && m.length <= 15);
}

// Extract email addresses from text
export function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex) || [];
  return matches.map(m => m.toLowerCase());
}

// Extract potential names (capitalized words that might be names)
export function extractPotentialNames(text: string): string[] {
  // Match capitalized words that could be names (2+ chars, not at start of sentence after period)
  const nameRegex = /\b[A-Z][a-z]{1,15}(?:\s[A-Z][a-z]{1,15})?\b/g;
  const matches = text.match(nameRegex) || [];

  // Common words that aren't names
  const commonWords = new Set([
    'The', 'This', 'That', 'These', 'Those', 'Monday', 'Tuesday', 'Wednesday',
    'Thursday', 'Friday', 'Saturday', 'Sunday', 'January', 'February', 'March',
    'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November',
    'December', 'Today', 'Tomorrow', 'Next', 'Last', 'Please', 'Thanks', 'Hello',
    'Dear', 'Regards', 'Sincerely', 'Best', 'Email', 'Call', 'Meeting', 'Task',
    'Todo', 'Note', 'Important', 'Urgent', 'High', 'Low', 'Medium', 'New',
    'Review', 'Update', 'Follow', 'Check', 'Send', 'Create', 'Delete', 'Edit',
  ]);

  return matches.filter(m => !commonWords.has(m) && !commonWords.has(m.split(' ')[0]));
}

// Calculate similarity score between two strings (0-1)
// BUGFIX UTIL-005: Prevent NaN propagation when both strings have no significant words
export function stringSimilarity(str1: string, str2: string): number {
  // Guard against null/undefined/empty strings
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  // Simple word overlap
  const words1 = new Set(s1.split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(s2.split(/\s+/).filter(w => w.length > 2));

  // Return 0 if either set is empty (prevents division by zero / NaN)
  if (words1.size === 0 || words2.size === 0) return 0;

  let matches = 0;
  words1.forEach(w => {
    if (words2.has(w)) matches++;
  });

  const denominator = Math.max(words1.size, words2.size);
  // Extra safety check - should never hit this due to earlier check, but prevents NaN
  if (denominator === 0) return 0;

  return matches / denominator;
}

export interface DuplicateMatch {
  todo: Todo;
  score: number;
  matchReasons: string[];
}

// Find potential duplicates for a new task
export function findPotentialDuplicates(
  newText: string,
  existingTodos: Todo[],
  threshold: number = 0.3
): DuplicateMatch[] {
  const newPhones = extractPhoneNumbers(newText);
  const newEmails = extractEmails(newText);
  const newNames = extractPotentialNames(newText);

  const matches: DuplicateMatch[] = [];

  for (const todo of existingTodos) {
    // Skip completed tasks
    if (todo.completed) continue;

    const combinedText = `${todo.text} ${todo.notes || ''} ${todo.transcription || ''}`;
    const todoPhones = extractPhoneNumbers(combinedText);
    const todoEmails = extractEmails(combinedText);
    const todoNames = extractPotentialNames(combinedText);

    let score = 0;
    const reasons: string[] = [];

    // Check phone number match (strongest signal)
    const phoneMatch = newPhones.some(np => todoPhones.some(tp => tp === np || tp.endsWith(np) || np.endsWith(tp)));
    if (phoneMatch) {
      score += 0.5;
      reasons.push('Same phone number');
    }

    // Check email match (strong signal)
    const emailMatch = newEmails.some(ne => todoEmails.includes(ne));
    if (emailMatch) {
      score += 0.4;
      reasons.push('Same email address');
    }

    // Check name match (medium signal)
    const nameMatch = newNames.some(nn => todoNames.some(tn =>
      nn.toLowerCase() === tn.toLowerCase() ||
      nn.toLowerCase().includes(tn.toLowerCase()) ||
      tn.toLowerCase().includes(nn.toLowerCase())
    ));
    if (nameMatch && (newNames.length > 0 || todoNames.length > 0)) {
      score += 0.3;
      const matchedName = newNames.find(nn => todoNames.some(tn =>
        nn.toLowerCase() === tn.toLowerCase() ||
        nn.toLowerCase().includes(tn.toLowerCase()) ||
        tn.toLowerCase().includes(nn.toLowerCase())
      ));
      if (matchedName) {
        reasons.push(`Same customer: ${matchedName}`);
      }
    }

    // Check text similarity (weak signal)
    const textSim = stringSimilarity(newText, todo.text);
    if (textSim > 0.3) {
      score += textSim * 0.2;
      reasons.push('Similar task description');
    }

    if (score >= threshold && reasons.length > 0) {
      matches.push({ todo, score, matchReasons: reasons });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  // Return top 5 matches
  return matches.slice(0, 5);
}

// Quick check if duplicate detection is worth running
export function shouldCheckForDuplicates(text: string): boolean {
  const phones = extractPhoneNumbers(text);
  const emails = extractEmails(text);
  const names = extractPotentialNames(text);

  // Only check if there's some identifying information
  return phones.length > 0 || emails.length > 0 || names.length >= 1;
}
