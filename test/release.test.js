/* The release build: dist/gridfile.html must be the same program as the source,
   only smaller. Building here (rather than trusting a stale dist/) means a commit
   can never leave the release broken or unbuilt. */
const fs=require("fs"),path=require("path"),vm=require("vm"),{spawnSync}=require("child_process");
const {build,scanJS}=require("../tools/build.js");
const {is,report}=require("./tap.js");

const ROOT=path.join(__dirname,"..");
const src=fs.readFileSync(path.join(ROOT,"gridfile.html"),"utf8");
const out=build(src);
fs.mkdirSync(path.join(ROOT,"dist"),{recursive:true});
fs.writeFileSync(path.join(ROOT,"dist","gridfile.html"),out);

const script=t=>{const a=t.indexOf("\n<script>\n");return t.slice(a+10,t.indexOf("\n</script>",a));};

let parses=true;
try{new vm.Script(script(out),{filename:"dist/gridfile.html"});}catch(e){parses="SyntaxError: "+e.message;}
is(parses,true,"the release script parses");

/* The one way a comment stripper can quietly ruin a program is by mistaking a string
   or a regex for a comment — 'http://schemas...' appears throughout the XLSX writer.
   Every literal must survive the build byte for byte. */
const lits=t=>scanJS(script(t)).filter(c=>c.kind==="literal").map(c=>c.text);
const A=lits(src),B=lits(out);
is(B.length,A.length,"the release has the same number of string/regex literals");
is(A.findIndex((x,i)=>x!==B[i]),-1,"every literal is byte-identical to the source");

// the section markers double as test/harness.js's slice points, so they must survive
const marks=t=>[...t.matchAll(/\/\* -{10} (.+?) -{10}/g)].map(m=>m[1]);
is(marks(out).join("|"),marks(src).join("|"),"every section marker survives the build");

// FNSIG is a newline-delimited table: losing a line break would silently lose functions
const sig=t=>{const i=t.indexOf("const FNSIG=`");return t.slice(i,t.indexOf("`;",i)).split("\n").length;};
is(sig(out),sig(src),"the FNSIG table keeps every line");

is(/<meta name="app-version" content="\d+\.\d+\.\d+">/.test(out),true,"the release carries the version");
is(out.includes("<script id=\"gfdata\""),true,"the #gfdata slot survives (Download as HTML needs it)");
is(/https?:\/\/[^"']*schemas/.test(out),true,"the XLSX namespace URLs survive");

/* Size. The release is what people download, so this is where the budget bites:
   120 kB is the goal, 125 kB the point at which we cut features instead of growing. */
const kb=Buffer.byteLength(out)/1024;
is(kb<125,true,"dist/gridfile.html is under 125 kB (it is "+kb.toFixed(1)+" kB)");
if(kb>120)console.log("note  dist/gridfile.html is "+kb.toFixed(1)+" kB, over the 120 kB goal");
console.log("note  release is "+kb.toFixed(1)+" kB, "+
  (100-Buffer.byteLength(out)/Buffer.byteLength(src)*100).toFixed(1)+"% smaller than the "+
  (Buffer.byteLength(src)/1024).toFixed(1)+" kB source");

// and finally: run the whole engine suite against the built file, not just the source
const r=spawnSync(process.execPath,[path.join(__dirname,"formulas.test.js")],
  {env:{...process.env,GRIDFILE:path.join(ROOT,"dist","gridfile.html")},encoding:"utf8"});
const tail=(r.stdout||"").trim().split("\n").pop();
is(r.status,0,"the formula suite passes against the release build ("+tail+")");

report();
