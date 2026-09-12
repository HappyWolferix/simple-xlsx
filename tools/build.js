#!/usr/bin/env node
/* Builds the release copy of gridfile.html from the source copy.

   gridfile.html is the readable original: comments, indentation, documentation,
   no size limit. The release is byte-for-byte the same program with everything a
   browser does not need taken out. Only ever edit the source; the release is
   generated and any change made to it is lost on the next build.

   What comes out is still one self-contained file with no network access — the
   promise the README makes to users is unchanged. What changes is that the file
   users download is no longer the file developers edit.

   The stripping is deliberately conservative:
     - comments go, but the section-marker comments stay:
       they cost ~1 kB and they are what test/harness.js slices the engine on, so
       keeping them means the release can be tested, not just the source.
     - indentation and blank lines go.
     - line breaks STAY. Joining lines would risk automatic-semicolon-insertion
       changing behaviour, and the payoff is small next to that risk.
   Nothing is renamed and no expression is rewritten, so the release cannot
   behave differently from the source unless this file has a bug. */
const fs=require("fs"),path=require("path");

const ROOT=path.join(__dirname,"..");
const SRC=path.join(ROOT,"gridfile.html");
const OUT=path.join(ROOT,"dist","gridfile.html");

/* A JavaScript scanner. It exists for one reason: `'http://...'` appears dozens of
   times inside the XLSX writer's strings, and `/\s+/` divisions look like comments
   to anything less careful. Splits the source into chunks tagged code / literal /
   comment so the caller can rewrite the code and leave everything else untouched. */
function scanJS(s){
  const out=[];let i=0,start=0,prev="";
  const push=(kind,to)=>{if(to>start)out.push({kind,text:s.slice(start,to)});start=to;};
  // a "/" opens a regex only where a value cannot legally have just ended
  const regexOK=()=>{
    const t=prev.trim();if(!t)return true;
    const c=t[t.length-1];
    if("([{,;:=!&|?+-*%~^<>".includes(c))return true;
    return /\b(return|typeof|case|in|of|new|delete|do|else|void|instanceof|yield|await)$/.test(t);
  };
  while(i<s.length){
    const c=s[i],d=s[i+1];
    if(c==="/"&&d==="/"){push("code",i);while(i<s.length&&s[i]!=="\n")i++;push("comment",i);continue;}
    if(c==="/"&&d==="*"){push("code",i);i+=2;while(i<s.length&&!(s[i]==="*"&&s[i+1]==="/"))i++;i+=2;push("comment",i);continue;}
    if(c==="'"||c==='"'){push("code",i);const q=c;i++;
      while(i<s.length&&s[i]!==q){if(s[i]==="\\")i++;i++;}
      i++;push("literal",i);prev="x";continue;}
    if(c==="`"){push("code",i);i++;let depth=0;
      while(i<s.length){
        if(s[i]==="\\"){i+=2;continue;}
        if(depth===0&&s[i]==="`"){i++;break;}
        if(depth===0&&s[i]==="$"&&s[i+1]==="{"){depth++;i+=2;continue;}
        if(depth>0){ // an interpolation can hold anything, including more templates
          if(s[i]==="{")depth++;else if(s[i]==="}")depth--;
        }
        i++;
      }
      push("literal",i);prev="x";continue;}
    if(c==="/"&&regexOK()){push("code",i);i++;let cls=false;
      while(i<s.length){const ch=s[i];
        if(ch==="\\"){i+=2;continue;}
        if(ch==="[")cls=true;else if(ch==="]")cls=false;
        else if(ch==="/"&&!cls)break;
        else if(ch==="\n")break;
        i++;}
      i++;while(i<s.length&&/[a-z]/.test(s[i]))i++;
      push("literal",i);prev="x";continue;}
    if(!/\s/.test(c))prev+=c;
    if(c==="\n")prev="";
    i++;
  }
  push("code",s.length);
  return out;
}

const MARKER=/^\/\*\s*-{5,}\s*(.+?)\s*-{5,}/;

function minifyJS(js){
  let out="";
  for(const ch of scanJS(js)){
    if(ch.kind==="comment"){
      const m=MARKER.exec(ch.text);       // keep the navigation/harness markers, drop their prose
      if(m)out+="/* ---------- "+m[1]+" ---------- */";
      continue;
    }
    if(ch.kind==="literal"){out+=ch.text;continue;}
    // code: drop indentation and blank lines, keep the line breaks themselves
    out+=ch.text.replace(/[ \t]+/g," ").replace(/\n[ \t]*/g,"\n");
  }
  return out.split("\n").map(l=>l.replace(/\s+$/,"")).filter((l,idx,a)=>l!==""||idx===0).join("\n");
}

function minifyCSS(css){
  return css.replace(/\/\*[\s\S]*?\*\//g,"")   // no strings in this stylesheet, so this is safe
            .replace(/\s*\n\s*/g,"")
            .replace(/\s{2,}/g," ")
            .replace(/\s*([{};:,>])\s*/g,"$1")
            .replace(/;}/g,"}").trim();
}

function build(src){
  // the one real <script> block; the empty #gfdata one must survive untouched
  const open="\n<script>\n",close="\n</script>";
  const a=src.indexOf(open);
  if(a<0)throw new Error("cannot find the main <script> block");
  const b=src.indexOf(close,a);
  const js=src.slice(a+open.length,b);

  const sa=src.indexOf("<style>"),sb=src.indexOf("</style>");
  if(sa<0||sb<0)throw new Error("cannot find the <style> block");
  const css=src.slice(sa+7,sb);

  let head=src.slice(0,sa+7)+minifyCSS(css)+src.slice(sb,a);
  head=head.replace(/<!--[\s\S]*?-->/g,"")             // HTML comments
           .replace(/\n[ \t]+/g,"\n")                  // markup indentation
           .replace(/\n{2,}/g,"\n");
  return head+open+minifyJS(js)+src.slice(b);
}

if(require.main===module){
  const src=fs.readFileSync(SRC,"utf8"),out=build(src);
  fs.mkdirSync(path.dirname(OUT),{recursive:true});
  fs.writeFileSync(OUT,out);
  const k=n=>(Buffer.byteLength(n)/1024).toFixed(1)+" kB";
  console.log("source  "+k(src)+"\nrelease "+k(out)+"   ("+
    (100-Buffer.byteLength(out)/Buffer.byteLength(src)*100).toFixed(1)+"% smaller)  -> dist/gridfile.html");
}
module.exports={build,scanJS,minifyJS,minifyCSS};
