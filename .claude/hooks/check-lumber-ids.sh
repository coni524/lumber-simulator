#!/bin/bash
# PostToolUse hook: Check lumber ID uniqueness after editing js/lumber.js
# Reads stdin JSON to get file_path, only runs check if the edited file is js/lumber.js

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).tool_input.file_path||'')}catch(e){console.log('')}})")

# Only check if the edited file is lumber.js
case "$FILE_PATH" in
  *lumber.js)
    ;;
  *)
    exit 0
    ;;
esac

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || cd "$(dirname "$0")/../.." 2>/dev/null

node -e '
const fs = require("fs");
const c = fs.readFileSync("js/lumber.js", "utf8");
const ids = [];
const re = /id:\s*[\x27"]([^\x27"]+)[\x27"]/g;
let m;
while (m = re.exec(c)) ids.push(m[1]);
const dups = ids.filter((v, i, a) => a.indexOf(v) !== i);
if (dups.length) {
  console.error("ERROR: Duplicate lumber IDs found: " + dups.join(", "));
  process.exit(2);
}
console.error("OK: All " + ids.length + " lumber IDs are unique.");
'
