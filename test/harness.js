/* Loads the formula engine straight out of gridfile.html and runs it headless.

   The page is one file with no module boundary, so instead of duplicating the
   engine here we slice it out between two markers and evaluate that slice in a
   throwaway VM context. Nothing in the slice touches the DOM at load time, so no
   browser and no dependencies are needed. If the markers ever move, this throws
   with a clear message rather than testing something stale. */
const fs=require("fs"),vm=require("vm"),path=require("path");

// GRIDFILE lets the same suite run against dist/gridfile.html, so the release
// is tested as a program and not merely diffed against the source.
const PAGE=process.env.GRIDFILE?path.resolve(process.env.GRIDFILE)
                               :path.join(__dirname,"..","gridfile.html");
const START="const colName=";                        // first thing the engine needs
const END="/* ---------- reference shifting";        // first thing it does not

function engineSource(){
  const html=fs.readFileSync(PAGE,"utf8");
  const a=html.indexOf(START),b=html.indexOf(END);
  if(a<0||b<0||b<a)throw new Error("cannot locate the engine in gridfile.html — did the "+
    JSON.stringify(a<0?START:END)+" marker move? Update test/harness.js.");
  // Everything the slice declares is lexical, so hand the pieces out explicitly.
  // The workbook comes from the page's own `let wb` — an object created out here and
  // passed in would not be the object the code inside the context actually sees.
  return html.slice(a,b)+
    "\n;globalThis.API={wb,evalCache,displayValue,getValue,tokenize,parse,evalNode,resolveRef,FNS,SIG};";
}

// a loaded engine plus the page's own empty workbook: sheets "Sheet1" and "Data"
function load(){
  const ctx={console};
  vm.runInNewContext(engineSource(),ctx,{filename:"gridfile.html:engine"});
  const API=ctx.API,wb=API.wb;
  const find=name=>{const sh=wb.sheets.find(s=>s.name===name);
    if(!sh)throw new Error("no sheet named "+name);return sh;};
  const split=ref=>{const i=ref.indexOf("!");
    return i<0?["Sheet1",ref]:[ref.slice(0,i),ref.slice(i+1)];};
  return{
    API,wb,
    // set("A1",5) or set("Data!B2","x"), with an optional {type,dec} format
    set(ref,v,f){
      const [name,a]=split(ref),sh=find(name);
      sh.cells[a]={v:String(v)};
      if(f)sh.cells[a].f=f;
    },
    // what the cell would show on screen — the formatted value, or "#N/A" and friends
    get(ref){
      const [name,a]=split(ref);
      API.evalCache.clear();
      return API.displayValue(find(name),a).text;
    },
  };
}
module.exports={load,engineSource};
