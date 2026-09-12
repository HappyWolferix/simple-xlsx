#!/usr/bin/env node
/* Runs every *.test.js in this folder, each in its own process so one crash
   cannot take the rest down. Exits non-zero if any file fails. */
const fs=require("fs"),path=require("path"),{spawnSync}=require("child_process");
const files=fs.readdirSync(__dirname).filter(f=>f.endsWith(".test.js")).sort();
let bad=0;
for(const f of files){
  console.log("\n— "+f);
  const r=spawnSync(process.execPath,[path.join(__dirname,f)],{stdio:"inherit"});
  if(r.status!==0)bad++;
}
console.log("\n"+(bad?bad+" of "+files.length+" test files FAILED":"all "+files.length+" test files passed"));
process.exit(bad?1:0);
