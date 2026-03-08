#!/bin/bash
# PreToolUse hook: Check core files exist before git commit
# Only runs when the Bash command contains "git commit"

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).tool_input.command||'')}catch(e){console.log('')}})")

# Only check if the command is a git commit
case "$COMMAND" in
  *"git commit"*)
    ;;
  *)
    exit 0
    ;;
esac

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || cd "$(dirname "$0")/../.." 2>/dev/null

node -e '
const fs = require("fs");
const files = [
  "index.html", "css/style.css",
  "js/app.js", "js/state.js", "js/lumber.js", "js/scene.js",
  "js/parts.js", "js/interaction.js", "js/ui.js", "js/io.js",
  "js/dimensions.js", "js/textures.js"
];
let missing = 0;
files.forEach(f => {
  if (!fs.existsSync(f)) {
    console.error("MISSING: " + f);
    missing++;
  }
});
if (missing) {
  console.error("ERROR: " + missing + " core file(s) missing");
  process.exit(2);
}
console.error("OK: All " + files.length + " core files present.");
'
