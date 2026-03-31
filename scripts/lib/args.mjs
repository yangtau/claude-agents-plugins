/**
 * Split a raw argument string into tokens, respecting quotes.
 */
export function splitRawArgumentString(raw) {
  const tokens = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let escape = false;

  for (const ch of raw) {
    if (escape) {
      current += ch;
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }
    if ((ch === " " || ch === "\t") && !inSingle && !inDouble) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += ch;
  }
  if (current) tokens.push(current);
  return tokens;
}

/**
 * Minimal argument parser.
 */
export function parseArgs(argv, config = {}) {
  const valueOptions = new Set(config.valueOptions ?? []);
  const booleanOptions = new Set(config.booleanOptions ?? []);
  const aliasMap = config.aliasMap ?? {};
  const options = {};
  const positionals = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      if (booleanOptions.has(key)) {
        options[key] = true;
      } else if (valueOptions.has(key) && i + 1 < argv.length) {
        options[key] = argv[++i];
      } else {
        options[key] = true;
      }
    } else if (arg.startsWith("-") && arg.length === 2) {
      const short = arg[1];
      const long = aliasMap[short] ?? short;
      if (booleanOptions.has(long)) {
        options[long] = true;
      } else if (valueOptions.has(long) && i + 1 < argv.length) {
        options[long] = argv[++i];
      } else {
        options[long] = true;
      }
    } else {
      positionals.push(arg);
    }
  }

  return { options, positionals };
}
