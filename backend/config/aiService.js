/**
 * config/aiService.js — AI Code Analysis Engine
 *
 * WHAT: The brain of the platform. Analyses code submissions and produces
 *       structured review results (score, issues, recommendations, grade).
 *
 * HOW:  Uses a two-tier approach:
 *       1. PRIMARY — Hugging Face Inference API (free tier, no credit card).
 *          Calls the microsoft/codebert-base or similar code-aware model for
 *          embedding-based quality scoring. Falls back gracefully on failure.
 *       2. SECONDARY — Deterministic rule-based analysis engine.
 *          Runs regex/AST-lite rules for known anti-patterns, security issues,
 *          and style violations. Always runs and enriches the final score.
 *
 *       The two scores are blended (60% rule-based / 40% HF) for reliability.
 *
 * WHY:  Rule-based analysis is 100% reliable and free; HF API adds nuance
 *       when available. Blending ensures users always get a useful review even
 *       during API outages or cold-start timeouts.
 *
 * RESULT SHAPE:
 *   {
 *     overallScore: Number (0-100),
 *     grade: 'A'|'B'|'C'|'D'|'F',
 *     categories: { codeQuality, security, performance, maintainability, bestPractices },
 *     summary: String,
 *     issues: [{ severity, line, message, suggestion, category }],
 *     recommendations: [String],
 *     positives: [String],
 *     aiModel: String,
 *     processingTimeMs: Number,
 *   }
 */

const axios = require('axios');

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: Rule-based patterns
// ─────────────────────────────────────────────────────────────────────────────

const PATTERNS = {
  javascript: [
    {
      regex: /var\s+/g,
      severity: 'warning',
      message: 'Avoid using `var`. Prefer `let` or `const` for block scoping.',
      suggestion: 'Replace `var` with `const` (if not reassigned) or `let`.',
      category: 'style',
      scorePenalty: 3,
    },
    {
      regex: /console\.log\(/g,
      severity: 'info',
      message: '`console.log` found. Remove debug logs before production.',
      suggestion: 'Use a proper logging library (winston, pino) or remove.',
      category: 'maintainability',
      scorePenalty: 1,
    },
    {
      regex: /eval\s*\(/g,
      severity: 'critical',
      message: '`eval()` detected. This is a critical security risk.',
      suggestion: 'Never use eval(). Refactor to use JSON.parse() or dynamic imports.',
      category: 'security',
      scorePenalty: 15,
    },
    {
      regex: /innerHTML\s*=/g,
      severity: 'warning',
      message: 'Direct `innerHTML` assignment can cause XSS vulnerabilities.',
      suggestion: 'Use `textContent` for plain text or DOMPurify to sanitize HTML.',
      category: 'security',
      scorePenalty: 8,
    },
    {
      regex: /==(?!=)/g,
      severity: 'warning',
      message: 'Loose equality `==` found. Use strict equality `===` instead.',
      suggestion: 'Replace `==` with `===` to avoid type coercion bugs.',
      category: 'logic',
      scorePenalty: 2,
    },
    {
      regex: /catch\s*\(\w+\)\s*\{\s*\}/g,
      severity: 'warning',
      message: 'Empty catch block detected. Silent errors hide bugs.',
      suggestion: 'Log the error or handle it meaningfully inside the catch block.',
      category: 'maintainability',
      scorePenalty: 5,
    },
    {
      regex: /setTimeout\s*\(\s*['"`][^'"`]+['"`]/g,
      severity: 'warning',
      message: 'setTimeout with string argument is equivalent to eval().',
      suggestion: 'Pass a function reference instead of a string to setTimeout.',
      category: 'security',
      scorePenalty: 8,
    },
    {
      regex: /document\.write\s*\(/g,
      severity: 'warning',
      message: '`document.write()` is deprecated and can block rendering.',
      suggestion: 'Use `document.createElement()` and `appendChild()` instead.',
      category: 'performance',
      scorePenalty: 6,
    },
    {
      regex: /new Array\(\d+\)/g,
      severity: 'info',
      message: 'Prefer array literal syntax `[]` over `new Array()`.',
      suggestion: 'Use `const arr = []` or spread/fill patterns.',
      category: 'style',
      scorePenalty: 1,
    },
  ],

  python: [
    {
      regex: /exec\s*\(/g,
      severity: 'critical',
      message: '`exec()` found. This is a serious security risk.',
      suggestion: 'Avoid exec(). Refactor to use safe alternatives.',
      category: 'security',
      scorePenalty: 15,
    },
    {
      regex: /print\s*\(/g,
      severity: 'info',
      message: '`print()` statement found. Remove debug output before production.',
      suggestion: 'Use Python logging module: `import logging`.',
      category: 'maintainability',
      scorePenalty: 1,
    },
    {
      regex: /except\s*:/g,
      severity: 'warning',
      message: 'Bare `except:` clause catches all exceptions including SystemExit.',
      suggestion: 'Specify the exception: `except ValueError:` or `except Exception as e:`.',
      category: 'logic',
      scorePenalty: 6,
    },
    {
      regex: /global\s+\w+/g,
      severity: 'warning',
      message: '`global` keyword used. This creates tight coupling.',
      suggestion: 'Pass variables as function arguments or use class attributes.',
      category: 'maintainability',
      scorePenalty: 4,
    },
    {
      regex: /import\s+\*/g,
      severity: 'warning',
      message: 'Wildcard import pollutes namespace and hides dependencies.',
      suggestion: 'Import specific names: `from module import SpecificClass`.',
      category: 'style',
      scorePenalty: 3,
    },
    {
      regex: /password\s*=\s*['"][^'"]+['"]/gi,
      severity: 'critical',
      message: 'Hard-coded password/secret detected!',
      suggestion: 'Use environment variables or a secrets manager.',
      category: 'security',
      scorePenalty: 20,
    },
    {
      regex: /lambda\s+\w+.*:\s*lambda/g,
      severity: 'info',
      message: 'Nested lambda detected. This reduces readability.',
      suggestion: 'Extract inner lambda into a named function.',
      category: 'maintainability',
      scorePenalty: 2,
    },
  ],

  java: [
    {
      regex: /System\.out\.print/g,
      severity: 'info',
      message: '`System.out.print` used. Replace with proper logging in production.',
      suggestion: 'Use SLF4J or Log4j: `logger.info("message")`.',
      category: 'maintainability',
      scorePenalty: 2,
    },
    {
      regex: /catch\s*\(Exception\s+\w+\)\s*\{\s*\}/g,
      severity: 'warning',
      message: 'Empty catch block silently swallows exceptions.',
      suggestion: 'At minimum, log the exception: `e.printStackTrace()`.',
      category: 'maintainability',
      scorePenalty: 5,
    },
    {
      regex: /new\s+String\s*\(/g,
      severity: 'info',
      message: '`new String()` creates unnecessary object. Prefer string literals.',
      suggestion: 'Use string literal: `String s = "value"` instead of `new String("value")`.',
      category: 'performance',
      scorePenalty: 2,
    },
    {
      regex: /==\s*null/g,
      severity: 'info',
      message: 'Null check with `==`. Consider using Optional<T> for cleaner null handling.',
      suggestion: 'Use `Optional.ofNullable(value).ifPresent(...)` pattern.',
      category: 'style',
      scorePenalty: 1,
    },
    {
      regex: /password\s*=\s*"[^"]+"/gi,
      severity: 'critical',
      message: 'Hard-coded credential detected in source code.',
      suggestion: 'Load credentials from environment variables or a vault.',
      category: 'security',
      scorePenalty: 20,
    },
  ],

  // Generic patterns applied to all languages
  generic: [
    {
      regex: /TODO|FIXME|HACK|XXX/gi,
      severity: 'info',
      message: 'TODO/FIXME comment found. Track this in your issue tracker.',
      suggestion: 'Create a proper ticket and reference it in the comment.',
      category: 'maintainability',
      scorePenalty: 1,
    },
    {
      regex: /password\s*[:=]\s*['"][^'"]{4,}['"]/gi,
      severity: 'critical',
      message: 'Possible hard-coded credential in source code.',
      suggestion: 'Never hard-code secrets. Use environment variables.',
      category: 'security',
      scorePenalty: 20,
    },
    {
      regex: /api[_-]?key\s*[:=]\s*['"][^'"]{8,}['"]/gi,
      severity: 'critical',
      message: 'Hard-coded API key detected.',
      suggestion: 'Move API keys to environment variables (.env) and use a secrets manager.',
      category: 'security',
      scorePenalty: 20,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: Positive patterns (things done right)
// ─────────────────────────────────────────────────────────────────────────────

const POSITIVE_PATTERNS = {
  javascript: [
    { regex: /const\s+/g, message: 'Good use of `const` for immutable bindings.' },
    { regex: /async\/await|async\s+function|await\s+/g, message: 'Modern async/await pattern used.' },
    { regex: /try\s*\{[\s\S]*?\}\s*catch\s*\(/g, message: 'Error handling with try/catch present.' },
    { regex: /\/\*\*[\s\S]*?\*\//g, message: 'JSDoc comments found — great for documentation.' },
  ],
  python: [
    { regex: /def\s+\w+\(.*\)\s*->/g, message: 'Type hints used — excellent for maintainability.' },
    { regex: /"""[\s\S]*?"""/g, message: 'Docstrings present — great for documentation.' },
    { regex: /with\s+open\(/g, message: 'Context manager (`with` statement) used properly.' },
    { regex: /if\s+__name__\s*==\s*['"]__main__['"]/g, message: 'Module guard pattern correctly applied.' },
  ],
  java: [
    { regex: /@Override/g, message: '`@Override` annotation correctly used.' },
    { regex: /\/\*\*[\s\S]*?\*\//g, message: 'Javadoc comments present.' },
    { regex: /Optional</g, message: 'Optional<T> used for null safety.' },
    { regex: /final\s+/g, message: '`final` keyword used to prevent unintended mutation.' },
  ],
  generic: [
    { regex: /https:\/\//g, message: 'HTTPS used for external connections — good security practice.' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: Code metrics
// ─────────────────────────────────────────────────────────────────────────────

function computeMetrics(code) {
  const lines = code.split('\n');
  const totalLines = lines.length;
  const blankLines = lines.filter((l) => l.trim() === '').length;
  const commentLines = lines.filter((l) =>
    /^\s*(\/\/|#|\/\*|\*|<!--)/.test(l)
  ).length;
  const codeLines = totalLines - blankLines - commentLines;

  const avgLineLength = codeLines > 0
    ? code.split('\n').reduce((s, l) => s + l.length, 0) / totalLines
    : 0;

  const maxLineLength = Math.max(...lines.map((l) => l.length));

  // Complexity: count decision points
  const branchCount = (code.match(/\bif\b|\belse\b|\bfor\b|\bwhile\b|\bswitch\b|\bcatch\b|\?\s/g) || []).length;
  const functionCount = (code.match(/\bfunction\b|\bdef\b|\bpublic\s+\w+\s*\(/g) || []).length;

  return {
    totalLines,
    codeLines,
    commentLines,
    blankLines,
    commentRatio: totalLines > 0 ? (commentLines / totalLines) * 100 : 0,
    avgLineLength,
    maxLineLength,
    branchCount,
    functionCount,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: Category scoring
// ─────────────────────────────────────────────────────────────────────────────

function computeCategoryScores(issues, metrics) {
  // Start each category at 100 and deduct for relevant issues
  const deductions = {
    security: 0,
    performance: 0,
    maintainability: 0,
    logic: 0,
    style: 0,
  };

  for (const issue of issues) {
    const penalty = issue.penalty || 0;
    if (issue.category === 'security') deductions.security += penalty;
    else if (issue.category === 'performance') deductions.performance += penalty;
    else if (issue.category === 'maintainability') deductions.maintainability += penalty;
    else if (issue.category === 'logic') deductions.logic += penalty;
    else if (issue.category === 'style') deductions.style += penalty;
    else {
      // 'other' — split across categories
      deductions.maintainability += penalty * 0.5;
      deductions.style += penalty * 0.5;
    }
  }

  // Comment ratio bonus/penalty
  const commentPenalty = metrics.commentRatio < 5 ? 10 : metrics.commentRatio > 30 ? 5 : 0;
  deductions.maintainability += commentPenalty;

  // Line length penalty
  if (metrics.maxLineLength > 120) deductions.style += 5;
  if (metrics.avgLineLength > 100) deductions.style += 3;

  return {
    security: Math.max(0, 100 - deductions.security),
    performance: Math.max(0, 100 - deductions.performance),
    maintainability: Math.max(0, 100 - deductions.maintainability),
    codeQuality: Math.max(0, 100 - (deductions.logic + deductions.style) / 2),
    bestPractices: Math.max(0, 100 - (deductions.security * 0.3 + deductions.maintainability * 0.3 + deductions.style * 0.4)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: Recommendations generator
// ─────────────────────────────────────────────────────────────────────────────

function generateRecommendations(issues, metrics, language, categories) {
  const recs = [];

  // Security recommendations
  const secIssues = issues.filter((i) => i.category === 'security');
  if (secIssues.length > 0) {
    recs.push('🔐 Address all security issues immediately — especially hard-coded credentials.');
  }

  // Comment ratio
  if (metrics.commentRatio < 5) {
    recs.push('📝 Add documentation comments. Aim for 10–20% comment ratio for maintainability.');
  }

  // Line length
  if (metrics.maxLineLength > 120) {
    recs.push('📏 Break long lines. Keep line length under 100–120 characters for readability.');
  }

  // Empty catch blocks
  const emptyCatches = issues.filter((i) => i.message.includes('catch') || i.message.includes('catch block'));
  if (emptyCatches.length > 0) {
    recs.push('⚠️ Never leave catch blocks empty. Always log or handle exceptions meaningfully.');
  }

  // Language-specific recommendations
  if (language === 'javascript' || language === 'typescript') {
    const hasVar = issues.some((i) => i.message.includes('var'));
    if (hasVar) recs.push('🔄 Migrate all `var` declarations to `const`/`let` for safer scoping.');
    if (categories.security < 80) recs.push('🛡️ Review DOM manipulation code for XSS vulnerabilities. Use DOMPurify.');
  }

  if (language === 'python') {
    const hasBareExcept = issues.some((i) => i.message.includes('Bare'));
    if (hasBareExcept) recs.push('🐍 Always specify exception types in Python except clauses.');
    if (categories.maintainability < 70) recs.push('📖 Add type hints and docstrings to improve Python code maintainability.');
  }

  if (language === 'java') {
    if (categories.performance < 80) recs.push('⚡ Consider using StringBuilder for string concatenation in loops.');
    recs.push('☕ Ensure proper resource management — use try-with-resources for I/O operations.');
  }

  // Generic high-value recommendations
  if (metrics.functionCount > 10 && metrics.codeLines / metrics.functionCount > 50) {
    recs.push('🔨 Functions appear long. Consider breaking them into smaller, single-responsibility functions.');
  }

  if (metrics.branchCount > 20) {
    recs.push('🌳 High cyclomatic complexity detected. Simplify branching logic to improve testability.');
  }

  recs.push('✅ Write unit tests for all critical functions to prevent regressions.');
  recs.push('🔍 Run a static analysis tool (ESLint/Pylint/Checkstyle) as part of your CI pipeline.');

  return [...new Set(recs)].slice(0, 8); // deduplicate and cap at 8
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: Hugging Face API call (optional enrichment)
// ─────────────────────────────────────────────────────────────────────────────

async function callHuggingFaceAPI(code, language) {
  if (!process.env.HF_API_TOKEN) return null;

  // We use the text-generation pipeline with a free model for a qualitative summary
  const HF_MODEL = 'microsoft/codebert-base'; // embedding model
  // Actually for text generation we use a code summarisation model
  const TEXT_MODEL = 'Salesforce/codet5-base-codexglue-sum-python';

  try {
    // Use text classification approach — send code to a sentiment/quality model
    // and interpret the output as a quality signal
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/huggingface/CodeBERTa-small-v1`,
      {
        inputs: code.slice(0, 512), // token limit
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      }
    );

    // The model returns fill-mask predictions — we interpret confidence as quality signal
    if (response.data && Array.isArray(response.data)) {
      const avgScore = response.data.reduce((s, item) => s + (item.score || 0), 0) / response.data.length;
      return Math.min(100, Math.round(avgScore * 100 * 1.2));
    }
    return null;
  } catch (err) {
    // HF API is optional; fail gracefully
    console.warn('[AI Service] Hugging Face API unavailable, using rule-based analysis only:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7: Main exported analysis function
// ─────────────────────────────────────────────────────────────────────────────

async function analyzeCode(code, language) {
  const startTime = Date.now();

  // Normalise language key
  const lang = (language || 'generic').toLowerCase();
  const langPatterns = [
    ...(PATTERNS[lang] || []),
    ...PATTERNS.generic,
  ];
  const langPositives = [
    ...(POSITIVE_PATTERNS[lang] || []),
    ...POSITIVE_PATTERNS.generic,
  ];

  // ── Run rule-based analysis ────────────────────────────────────────────────
  const foundIssues = [];
  let totalPenalty = 0;

  const lines = code.split('\n');

  for (const pattern of langPatterns) {
    // Find all matches and capture approximate line numbers
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags.replace('g', '') + 'g');
    regex.lastIndex = 0;

    const matchLines = new Set();
    while ((match = regex.exec(code)) !== null) {
      // Calculate line number from character offset
      const lineNum = code.slice(0, match.index).split('\n').length;
      matchLines.add(lineNum);
    }

    if (matchLines.size > 0) {
      const lineArr = [...matchLines];
      foundIssues.push({
        severity: pattern.severity,
        line: lineArr[0],
        message: pattern.message,
        suggestion: pattern.suggestion,
        category: pattern.category,
        penalty: pattern.scorePenalty * Math.min(lineArr.length, 3), // cap multiplier at 3
      });
      totalPenalty += pattern.scorePenalty * Math.min(lineArr.length, 3);
    }
  }

  // ── Collect positives ──────────────────────────────────────────────────────
  const positives = [];
  for (const pos of langPositives) {
    if (pos.regex.test(code)) {
      positives.push(pos.message);
    }
  }

  // ── Compute metrics ────────────────────────────────────────────────────────
  const metrics = computeMetrics(code);

  // ── Base score from rule-based engine (capped 0-100) ──────────────────────
  const ruleBasedScore = Math.max(0, Math.min(100, 100 - totalPenalty));

  // ── Call HF API for additional signal ─────────────────────────────────────
  const hfScore = await callHuggingFaceAPI(code, lang);

  // ── Blend scores ───────────────────────────────────────────────────────────
  let finalScore;
  let aiModel;
  if (hfScore !== null) {
    finalScore = Math.round(ruleBasedScore * 0.6 + hfScore * 0.4);
    aiModel = 'rule-based + huggingface/CodeBERTa';
  } else {
    finalScore = Math.round(ruleBasedScore);
    aiModel = 'rule-based-v1';
  }

  // Apply positives bonus (up to +5)
  const positiveBonus = Math.min(5, positives.length);
  finalScore = Math.min(100, finalScore + positiveBonus);

  // ── Category scores ────────────────────────────────────────────────────────
  const categories = computeCategoryScores(foundIssues, metrics);

  // ── Grade ──────────────────────────────────────────────────────────────────
  const grade =
    finalScore >= 90 ? 'A' :
    finalScore >= 75 ? 'B' :
    finalScore >= 60 ? 'C' :
    finalScore >= 45 ? 'D' : 'F';

  // ── Summary ────────────────────────────────────────────────────────────────
  const criticalCount = foundIssues.filter((i) => i.severity === 'critical').length;
  const warningCount = foundIssues.filter((i) => i.severity === 'warning').length;

  let summary = '';
  if (finalScore >= 90) {
    summary = `Excellent code quality! Your ${lang} code scores ${finalScore}/100. ${positives.length > 0 ? 'Many best practices are correctly applied. ' : ''}${criticalCount === 0 ? 'No critical issues found.' : ''}`;
  } else if (finalScore >= 75) {
    summary = `Good code quality with a score of ${finalScore}/100. Found ${foundIssues.length} issue(s) to review. ${warningCount > 0 ? `${warningCount} warning(s) should be addressed before shipping.` : ''}`;
  } else if (finalScore >= 60) {
    summary = `Moderate code quality — score ${finalScore}/100. There are ${foundIssues.length} issues including ${criticalCount} critical finding(s) that require immediate attention.`;
  } else {
    summary = `Code quality needs significant improvement — score ${finalScore}/100. ${criticalCount} critical issue(s) and ${warningCount} warning(s) were detected. Address security and logic issues before this code is production-ready.`;
  }

  // ── Recommendations ────────────────────────────────────────────────────────
  const recommendations = generateRecommendations(foundIssues, metrics, lang, categories);

  // Strip internal penalty field from issues before returning
  const cleanIssues = foundIssues.map(({ penalty, ...rest }) => rest);

  return {
    overallScore: finalScore,
    grade,
    categories,
    summary,
    issues: cleanIssues,
    recommendations,
    positives: positives.slice(0, 6),
    aiModel,
    processingTimeMs: Date.now() - startTime,
    metrics, // extra data stored for debugging; not returned to frontend by default
  };
}

module.exports = { analyzeCode };
