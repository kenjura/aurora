#!/usr/bin/env node
// demote-headings.mjs
import fs from "node:fs/promises";
import path from "node:path";

const USAGE = `
Usage: node demote-headings.mjs <folder> [--dry-run] [--strip-h1] [--extensions=md,mdx,markdown]

Options:
  --dry-run      Show what would change but don't write files
  --strip-h1     Also demote H1 (# ) to plain text (remove the #)
  --extensions   Comma-separated list of file extensions to process (default: md,markdown,mdx)
`;

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(USAGE.trim());
  process.exit(0);
}

const root = path.resolve(args[0]);
const dryRun = args.includes("--dry-run");
const stripH1 = args.includes("--strip-h1");

const extArg = args.find(a => a.startsWith("--extensions="));
const exts = (extArg ? extArg.split("=")[1] : "md,markdown,mdx")
  .split(",")
  .map(s => s.trim().toLowerCase())
  .filter(Boolean)
  .map(e => (e.startsWith(".") ? e : "." + e));

const SKIP_DIRS = new Set(["node_modules", ".git", ".svn", ".hg", ".next", "dist", "build", "out"]);

async function* walk(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    console.warn(`! Cannot read ${dir}: ${e.message}`);
    return;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP_DIRS.has(ent.name)) yield* walk(full);
    } else if (ent.isFile()) {
      if (exts.includes(path.extname(ent.name).toLowerCase())) {
        yield full;
      }
    }
  }
}

// Matches ATX heading lines outside code blocks:
// up to 3 optional leading spaces, 1-6 '#' characters, at least one space, then content.
// We leave any trailing hashes intact.
const headingRe = /^(\s{0,3})(#{1,6})([ \t]+)(.*)$/;

function transformContents(text, { stripH1 = false } = {}) {
  const lines = text.split(/\r?\n/);
  let inFence = false;
  let fenceChar = null; // ``` or ~~~
  let changes = 0;

  const fenceRe = /^\s*(```|~~~)/;

  const out = lines.map(line => {
    // Track fenced code blocks (``` or ~~~). Toggle on each fence line.
    const fenceMatch = line.match(fenceRe);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceChar = fenceMatch[1];
      } else {
        // Only close if the same fence char opens/closes (common behavior)
        if (line.trim().startsWith(fenceChar)) {
          inFence = false;
          fenceChar = null;
        }
      }
      return line; // don't transform fence marker lines
    }

    if (inFence) return line; // skip inside code fences

    const m = line.match(headingRe);
    if (!m) return line;

    const [, indent, hashes, space, rest] = m;
    const level = hashes.length;

    // Compute new level: reduce hash count by one (demote toward H1).
    if (level === 1 && !stripH1) {
      // Leave H1 unchanged by default.
      return line;
    }

    const newLevel = Math.max(0, level - 1);
    let newLine;
    if (newLevel === 0) {
      // Strip to plain text (remove heading mark)
      newLine = `${indent}${rest}`;
    } else {
      newLine = `${indent}${"#".repeat(newLevel)}${space}${rest}`;
    }

    if (newLine !== line) changes++;
    return newLine;
  });

  return { text: out.join("\n"), changes };
}

async function processFile(file) {
  const original = await fs.readFile(file, "utf8");
  const { text, changes } = transformContents(original, { stripH1 });
  if (changes === 0) return { file, changes: 0, written: false };

  if (dryRun) {
    console.log(`~ ${file}: ${changes} heading(s) would change`);
    return { file, changes, written: false };
  } else {
    await fs.writeFile(file, text, "utf8");
    console.log(`✔ ${file}: ${changes} heading(s) changed`);
    return { file, changes, written: true };
  }
}

(async function main() {
  try {
    let total = 0, filesChanged = 0;
    for await (const f of walk(root)) {
      const res = await processFile(f);
      total += res.changes;
      if (res.changes > 0) filesChanged++;
    }
    const summary = `${dryRun ? "(dry run) " : ""}Done. ${filesChanged} file(s) updated, ${total} heading(s) ${dryRun ? "to change" : "changed"}.`;
    console.log(summary);
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
})();
