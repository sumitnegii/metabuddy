/**
 * Robust JSON extraction from AI responses.
 * Handles: raw JSON, code blocks, mixed text + JSON, unicode issues.
 */
function extractJSON(text) {
  if (!text || typeof text !== 'string') throw new Error('Empty AI response');

  // Clean up common issues
  const cleaned = text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // remove control chars
    .replace(/\r\n/g, '\n');

  const tryParse = (str) => {
    try {
      const parsed = JSON.parse(str);
      // Unwrap if Claude wrapped everything in {"campaign": {...}}
      if (parsed && typeof parsed === 'object' && parsed.campaign && Object.keys(parsed).length === 1) {
        return parsed.campaign;
      }
      return parsed;
    } catch {
      return null;
    }
  };

  // Try 1: Direct parse
  const direct = tryParse(cleaned);
  if (direct) return direct;

  // Try 2: Extract from code block
  const codeBlock = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    const cbParsed = tryParse(codeBlock[1].trim());
    if (cbParsed) return cbParsed;
  }

  // Try 3: Find first { ... } or [ ... ] (greedy)
  const jsonMatch = cleaned.match(/(\{[\s\S]*\})/);
  if (jsonMatch) {
    const jmParsed = tryParse(jsonMatch[1]);
    if (jmParsed) return jmParsed;
    
    // Try removing trailing text after last }
    const lastBrace = cleaned.lastIndexOf('}');
    const firstBrace = cleaned.indexOf('{');
    if (firstBrace !== -1 && lastBrace !== -1) {
      const sliceParsed = tryParse(cleaned.substring(firstBrace, lastBrace + 1));
      if (sliceParsed) return sliceParsed;
    }
  }

  // Try 4: Array response
  const arrMatch = cleaned.match(/(\[[\s\S]*\])/);
  if (arrMatch) {
    const arrParsed = tryParse(arrMatch[1]);
    if (arrParsed) return arrParsed;
  }

  console.error('=== RAW AI RESPONSE (first 1000 chars) ===');
  console.error(cleaned.substring(0, 1000));
  console.error('=== END RAW ===');
  throw new Error('Failed to parse AI response');
}

module.exports = { extractJSON };
