/**
 * utils/codeValidation.js — lightweight code-content validation
 *
 * Rejects plain natural language uploads/snippets by checking for code-like
 * structures (keywords, syntax tokens, operators, indentation patterns).
 */

const LANG_PATTERNS = {
  javascript: [
    /\b(function|const|let|var|class|import|export|return|async|await|=>|console\.|require\()\b/,
    /[{}();]|===?|!==?|&&|\|\|/,
  ],
  typescript: [
    /\b(interface|type|enum|implements|readonly|public|private)\b/,
    /\b(function|const|let|class|import|export|=>|as\s+const)\b/,
  ],
  python: [
    /\b(def|class|import|from|return|if|elif|else|for|while|try|except|print\s*\(|lambda)\b/,
    /:\s*(#.*)?$/m,
  ],
  java: [
    /\b(public|private|protected|class|interface|static|void|new|return)\b/,
    /[{}();]/,
  ],
  cpp: [
    /\b(#include|std::|int\s+main|class|template|namespace|return)\b/,
    /[{}();<>]/,
  ],
  go: [
    /\b(package|func|import|defer|go\s+|struct|interface|return)\b/,
    /[{}();]/,
  ],
  rust: [/\b(fn|let\s+mut|impl|trait|pub|use|match|enum|struct)\b/, /[{}();]/],
  other: [
    /[{}();<>=[\]]/,
    /\b(function|class|def|return|import|SELECT|INSERT|UPDATE|CREATE|FROM)\b/i,
  ],
};

const GENERIC_CODE_PATTERNS = [
  /[{}()[\];]/,
  /\w+\s*=\s*[^\n]+/,
  /\/\/|#|\/\*|\*\//,
  /\b(if|else|for|while|switch|case|try|catch|return|import|class|def|fn)\b/i,
];

const NON_CODE_TEXT_MARKERS = [
  /\b(lorem ipsum|dear sir|thanks regards|meeting agenda|chapter\s+\d+)\b/i,
  /\b(this is|i am|we are|please|kindly|hello|good morning|yesterday)\b/i,
  /\b(paragraph|essay|story|article|introduction|conclusion|summary)\b/i,
];

const STRONG_CODE_PATTERNS = [
  /\b(function|class|def|interface|enum|struct|trait|impl|package|import|from|return)\b/i,
  /\b(if|else|for|while|switch|case|try|catch|except)\b/i,
  /=>|::|#include|public\s+class|if\s+__name__\s*==\s*['"]__main__['"]/,
  /\w+\s*\([^\)]*\)\s*\{/, // function-like block
];

const WEAK_CODE_PATTERNS = [
  /[{}()[\];]/,
  /\w+\s*=\s*[^\n]+/,
  /\/\/|#|\/\*|\*\//,
  /\.[A-Za-z_][A-Za-z0-9_]*\s*\(/,
];

function countMatches(patterns, text) {
  return patterns.reduce(
    (count, regex) => (regex.test(text) ? count + 1 : count),
    0,
  );
}

function safeNumber(n) {
  return Number.isFinite(n) ? n : 0;
}

function isLikelyCode(content, language = "other") {
  const text = (content || "").trim();
  const lang = (language || "other").toLowerCase();

  if (!text || text.length < 5) {
    return { isCode: false, reason: "Code content is too short." };
  }

  const lines = text.split(/\r?\n/);
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

  if (nonEmptyLines.length === 0) {
    return { isCode: false, reason: "Code content is empty." };
  }

  const symbolCount = (text.match(/[{}()[\];=<>:+\-*/%&|!.#,]/g) || []).length;
  const alphaCount = (text.match(/[A-Za-z]/g) || []).length;
  const digitCount = (text.match(/[0-9]/g) || []).length;

  const symbolRatio = safeNumber(symbolCount / Math.max(text.length, 1));
  const tokenDensity = safeNumber(
    (symbolCount + digitCount) / Math.max(alphaCount + 1, 1),
  );

  const languagePatterns = LANG_PATTERNS[lang] || LANG_PATTERNS.other;
  const languageHits = countMatches(languagePatterns, text);
  const genericHits = countMatches(GENERIC_CODE_PATTERNS, text);
  const strongHits = countMatches(STRONG_CODE_PATTERNS, text);
  const weakHits = countMatches(WEAK_CODE_PATTERNS, text);
  const textMarkers = countMatches(NON_CODE_TEXT_MARKERS, text);

  const wordTokens = text.match(/[A-Za-z]{2,}/g) || [];
  const sentenceLikeTokens =
    text.match(
      /\b(the|and|that|with|have|from|this|there|which|would|could|should)\b/gi,
    ) || [];
  const sentenceRatio = safeNumber(
    sentenceLikeTokens.length / Math.max(wordTokens.length, 1),
  );

  const hasIndentedBlock = /^\s{2,}\S/m.test(text);
  const hasMultiLineStructure = nonEmptyLines.length >= 2;
  const hasCodeDelimiters = /[{}();\[\]]/.test(text);

  const passesByPatterns =
    languageHits >= 1 && (strongHits >= 1 || weakHits >= 2);
  const passesBySyntaxShape =
    symbolRatio >= 0.045 && tokenDensity >= 0.14 && weakHits >= 1;
  const passesByStructure =
    hasMultiLineStructure &&
    (hasIndentedBlock || hasCodeDelimiters) &&
    (strongHits >= 1 || weakHits >= 2);

  const tooSentenceLike = sentenceRatio > 0.16 && strongHits === 0;

  const looksLikeCode =
    (passesByPatterns || passesBySyntaxShape || passesByStructure) &&
    textMarkers === 0 &&
    !tooSentenceLike;

  if (!looksLikeCode) {
    return {
      isCode: false,
      reason:
        "Submitted content does not look like source code. Please provide code only.",
    };
  }

  return { isCode: true };
}

module.exports = { isLikelyCode };
