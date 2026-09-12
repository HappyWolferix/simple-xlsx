/* Properties of gridfile.html itself, rather than of the formula engine. */
const fs=require("fs"),path=require("path"),vm=require("vm");
const {load}=require("./harness.js");
const {is,report}=require("./tap.js");

const PAGE=path.join(__dirname,"..","gridfile.html");
const html=fs.readFileSync(PAGE,"utf8");

// the page's whole script must parse — a stray typo would otherwise only show in a browser
const body=/\n<script>\n([\s\S]*?)\n<\/script>/.exec(html);
is(!!body,true,"the main <script> block is where we expect it");
let parses=true;
try{new vm.Script(body[1],{filename:"gridfile.html"});}catch(e){parses="SyntaxError: "+e.message;}
is(parses,true,"the page script parses");

// the version travels with every downloaded copy, so it must be present and sane
const ver=/<meta name="app-version" content="([^"]+)">/.exec(html);
is(!!ver,true,"gridfile.html carries an app-version meta tag");
is(/^\d+\.\d+\.\d+$/.test(ver[1]),true,"the version is x.y.z (found "+ver[1]+")");

/* Size is a property of the release, not of this file — see release.test.js.
   The source is free to spend bytes on comments and documentation. */
console.log("note  gridfile.html (source) is "+(Buffer.byteLength(html)/1024).toFixed(1)+" kB");

/* A function whose name ends in a digit would be rewritten by shiftFormula when a
   formula is filled down (LOG10 -> LOG11), so the name set has to stay digit-free. */
const {API}=load();
const digity=Object.keys(API.FNS).filter(n=>/\d$/.test(n));
is(digity.join(",")||"none","none","no builtin name ends in a digit (fill would rewrite it)");

/* Every builtin needs an autocomplete signature, and no signature may name a function
   that no longer exists — the popup is only as trustworthy as this pairing. */
const fns=Object.keys(API.FNS).sort(),sigs=[...API.SIG.keys()].sort();
is(fns.filter(n=>!API.SIG.has(n)).join(",")||"none","none","every builtin has a signature");
is(sigs.filter(n=>!(n in API.FNS)).join(",")||"none","none","every signature names a real builtin");
const badsig=sigs.filter(n=>API.SIG.get(n).d===undefined||API.SIG.get(n).d==="");
is(badsig.join(",")||"none","none","every signature carries a description");

/* The grow buttons under the grid must stay clamped to the import guard rails, or an
   over-extended grid would render cells the importer can never fill. */
is(/ROWS=Math\.min\(XL_MAXROW,ROWS\+100\)/.test(html),true,
  "the +100 rows button clamps to XL_MAXROW");
is(/COLS=Math\.min\(XL_MAXCOL,COLS\+10\)/.test(html),true,
  "the +10 columns button clamps to XL_MAXCOL");

// what the XLSX importer accepts is derived from the table, so the two cannot drift
is(/const XL_FNS=new Set\(Object\.keys\(FNS\)\);/.test(html),true,
   "the XLSX import whitelist is derived from the function table");

/* A dropdown source may be laid out across a row or as a block, not only down a
   column, so the option list has to walk both axes of the range. */
const dvLoop=/const srcA=addr\(([^,]+),([^)]+)\),v=String\(getValue/.exec(html);
is(!!dvLoop,true,"the dropdown option list is where we expect it");
is(dvLoop[1],"c","the dropdown list varies the column across the source range");
is(dvLoop[2],"r","the dropdown list varies the row across the source range");

/* The fill handle lives outside the engine slice the harness loads, but its geometry
   and its formula shifting are worth pinning down, so slice those two functions out
   and run them against stubbed grid accessors. */
{
  const a=html.indexOf("function fillRect("),b=html.indexOf("function paintFill(");
  const c=html.indexOf("function doFill("),d=html.indexOf("function fillHandleDown(");
  is(a>=0&&b>a&&c>b&&d>c,true,"the fill-handle functions are where we expect them");
  const writes=[];
  const SH={cells:{A1:{v:"=B1*2"},A2:{v:"=B2*2"}}};
  const ctx={sheet:()=>SH,cell:(sh,ad)=>sh.cells[ad],paintAll(){},save(){},
    addr:(cc,rr)=>String.fromCharCode(65+cc)+(rr+1),
    writeCell:(sh,cc,rr,src,dc,dr)=>writes.push(String.fromCharCode(65+cc)+(rr+1)+"="+(src&&src.v)+"/"+dc+","+dr)};
  vm.runInNewContext(html.slice(a,b)+html.slice(c,d)+";globalThis.X={fillRect,doFill};",ctx);
  const X=ctx.X,R={c1:0,c2:0,r1:0,r2:1};
  is(JSON.stringify(X.fillRect(R,0,4)),'{"c1":0,"c2":0,"r1":0,"r2":4}',"dragging down extends the rows");
  is(JSON.stringify(X.fillRect(R,3,1)),'{"c1":0,"c2":3,"r1":0,"r2":1}',"dragging sideways extends the columns");
  is(JSON.stringify(X.fillRect({c1:0,c2:0,r1:2,r2:3},0,0)),'{"c1":0,"c2":0,"r1":0,"r2":3}',"dragging up extends upward");
  is(X.fillRect(R,0,1),null,"a drag that stays inside the block fills nothing");
  X.doFill(X.fillRect(R,0,5),R);
  is(writes.join(" "),"A3==B1*2/0,2 A4==B2*2/0,2 A5==B1*2/0,4 A6==B2*2/0,4",
     "the block tiles downward and each copy carries its own row offset");
}

/* Bold is a cell format like any other, so it has to survive the trip out to xlsx.
   xlStyles is self-contained apart from the border bits, so slice and run it. */
{
  is(/<button id="boldBtn"[^>]*aria-pressed/.test(html),true,"the bold button is in the toolbar");
  is(/td\.style\.fontWeight=f&&f\.bold/.test(html),true,"paintCell renders bold");
  const a=html.indexOf("function xlStyles(){"),b=html.indexOf("\nfunction ",a+10);
  is(a>=0&&b>a,true,"xlStyles is where we expect it");
  const ctx={};
  vm.runInNewContext("const BD_TOP=1,BD_RIGHT=2,BD_BOTTOM=4,BD_LEFT=8;"+html.slice(a,b)+
    ";globalThis.S=xlStyles();",ctx);
  const S=ctx.S;
  is(S.xf({}),0,"an unformatted cell still points at the default style");
  const bold=S.xf({bold:true});
  is(bold>0,true,"a bold cell gets a style of its own");
  is(S.xf({bold:true}),bold,"the same bold font is reused, not duplicated");
  is(S.xf({color:"#ff0000",bold:true})!==S.xf({color:"#ff0000"}),true,
     "bold red and plain red are different fonts");
  is(/<font><b\/><sz val="11"\/><name val="Calibri"\/><\/font>/.test(S.xml()),true,
     "the bold font is written with a <b/> element");
}

/* Ctrl+S overwrites the file itself, but only for a copy opened from disk. The guard
   is the whole feature: served over http it must still fall back to a download. */
{
  is(/location\.protocol==="file:"/.test(html),true,"save-in-place is gated on the file: protocol");
  is(/typeof window\.showSaveFilePicker==="function"/.test(html),true,
     "save-in-place also checks the picker exists (it is Chromium-only)");
  is(/if\(!canSaveInPlace\(\)\)\{downloadHtml\(\);return;\}/.test(html),true,
     "Ctrl+S falls back to the download when saving in place is not possible");
  // the picker must never wait on IndexedDB, which can hang forever on a file: origin
  is(/Promise\.race\(\[/.test(html),true,"the stored-handle lookup is raced against a timeout");
  is(/idbHandle\(st=>st\.put\(h,"file"\)\)\.catch/.test(html),true,
     "remembering the handle is fire-and-forget, not awaited");
  // both save routes must bake the workbook the same way, so the builder is shared
  is((html.match(/pageHtml\(\)/g)||[]).length>=3,true,"the page builder is shared, not duplicated");
  is(/function pageHtml\(\)\{/.test(html),true,"pageHtml is a function of its own");
}

/* A single copied cell survives its paste so it can be stamped again and again;
   a copied range, and any cut, is consumed by the first paste. */
{
  is(/if\(clip\.cut\|\|clip\.w!==1\|\|clip\.h!==1\)clip=null;/.test(html),true,
     "only a single-cell copy is kept on the clipboard after pasting");
  is(/e\.key==="Escape"\)\{if\(clip\)\{clip=null;paintClip\(\);\}\}/.test(html),true,
     "Escape is what clears the kept clipboard");
}

/* The save-in-place path must survive a broken IndexedDB. On a file: origin
   indexedDB.open can hang without ever firing an event, and an earlier version
   awaited it, so Ctrl+S silently did nothing on exactly the copies it was built for.
   This one is async, so it owns the final report(). */
(async()=>{
  const a=html.indexOf("function idbHandle("),b=html.indexOf("function savetip(");
  const c=html.indexOf("async function saveInPlace(");
  const d=html.indexOf("\n",html.indexOf("  return h.name;"));
  is(a>=0&&b>a&&c>b&&d>c,true,"the save-in-place functions are where we expect them");
  let picked=0,wrote=null;
  const handle={name:"gridfile.html",
    async queryPermission(){return"granted";},async requestPermission(){return"granted";},
    async createWritable(){return{async write(x){wrote=x;},async close(){}};}};
  const ctx={self:{},setTimeout,clearTimeout,
    safeName:()=>"Book",pageHtml:()=>"<html>x</html>",
    indexedDB:{open(){return{};}},          // never fires success, error or blocked
    window:{showSaveFilePicker:async()=>{picked++;return handle;}}};
  ctx.self.indexedDB=ctx.indexedDB;
  vm.runInNewContext("let fileHandle=null;"+html.slice(a,b)+html.slice(c,d)+"}"+
    ";globalThis.go=saveInPlace;",ctx);
  try{
    const name=await ctx.go();
    is(name+"|"+picked+"|"+wrote,"gridfile.html|1|<html>x</html>",
       "a hung IndexedDB does not stop the picker or the write");
    await ctx.go();
    is(picked,1,"the second save reuses the handle instead of asking again");
  }catch(e){
    is("threw: "+e.message,"no throw","saving in place completes with a hung IndexedDB");
  }
  report();
})();
