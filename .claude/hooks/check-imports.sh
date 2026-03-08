#!/bin/bash
# PostToolUse hook: Check JS import conventions after editing js/*.js files
# Validates: .js extension on relative imports, no three/examples usage

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).tool_input.file_path||'')}catch(e){console.log('')}})")

# Only check JS files in the js/ directory
case "$FILE_PATH" in
  */js/*.js)
    ;;
  *)
    exit 0
    ;;
esac

node -e '
const fs = require("fs");
const f = process.argv[1];
if (!fs.existsSync(f)) process.exit(0);
const c = fs.readFileSync(f, "utf8");
let err = 0;
const lines = c.split("\n");
lines.forEach((l, i) => {
  if (/from\s+[\x27"]\.\/[^\x27"]+[\x27"]/.test(l) && !/from\s+[\x27"]\.\/[^\x27"]+\.js[\x27"]/.test(l)) {
    console.error("ERROR: " + f + ":" + (i+1) + " - Missing .js extension: " + l.trim());
    err++;
  }
  if (/from\s+[\x27"]three\/examples/.test(l)) {
    console.error("ERROR: " + f + ":" + (i+1) + " - three/examples is not available: " + l.trim());
    err++;
  }
});
if (err) process.exit(2);
console.error("OK: " + f + " imports are valid.");
' -- "$FILE_PATH"
