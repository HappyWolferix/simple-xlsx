/* Builds the demo copy of the page used for the README screenshot: gridfile.html
   with a sample workbook baked into #gfdata, exactly the way "Download as HTML"
   does it. Not part of the build or the tests — run it by hand when the screenshot
   needs refreshing.

       node tools/screenshot-fixture.js /tmp/shot.html
       chromium --headless --window-size=1280,620 --force-device-scale-factor=2 \
                --virtual-time-budget=3000 --screenshot=/tmp/shot.png file:///tmp/shot.html
       magick /tmp/shot.png -resize 1600x -strip -colors 256 docs/img/screenshot.png

   Run from the repository root; it reads ./gridfile.html. */
const fs=require("fs");
const src=fs.readFileSync("gridfile.html","utf8");
const cells={};
["A1","B1","C1","D1","E1"].forEach((a,i)=>{cells[a]={v:["Category","Planned","Actual","Difference","% used"][i],f:{bg:"#1f5c8b",color:"#ffffff"}};});
const rows=[["Rent",1250,1250],["Groceries",520,587.4],["Electricity",95,88.2],["Internet & phone",55,55],["Transport",180,164.35],["Insurance",210,210],["Childcare",340,340],["Leisure",150,212.9],["Savings",400,400]];
rows.forEach((r,i)=>{const n=2+i;
  cells["A"+n]={v:r[0]};
  cells["B"+n]={v:r[1],f:{dec:2}};
  cells["C"+n]={v:r[2],f:{dec:2}};
  cells["D"+n]={v:"=B"+n+"-C"+n,f:{dec:2}};
  cells["E"+n]={v:"=ROUND(C"+n+"/B"+n+"*100,0)"};
});
const t=2+rows.length;
cells["A"+t]={v:"Total",f:{bg:"#e8eef4"}};
"BCD".split("").forEach(c=>{cells[c+t]={v:"=SUM("+c+"2:"+c+(t-1)+")",f:{dec:2,bg:"#e8eef4"}};});
cells["E"+t]={v:"=ROUND(C"+t+"/B"+t+"*100,0)",f:{bg:"#e8eef4"}};
cells["A"+(t+2)]={v:"Biggest overspend"};
cells["B"+(t+2)]={v:"=INDEX(A2:A"+(t-1)+",MATCH(MIN(D2:D"+(t-1)+"),D2:D"+(t-1)+",0))"};
cells["A"+(t+3)]={v:"Months to 5000 saved"};
cells["B"+(t+3)]={v:"=ROUNDUP(5000/C10,0)"};
const wb={name:"Household budget 2026",sheets:[
  {name:"Budget",cells,colW:{0:170,1:95,2:95,3:105,4:80},rowH:{},
   rules:[{range:"D2:D"+(t-1),test:"",op:"<",v1:"0",fmt:"Notes!A1"},
          {range:"E2:E"+(t-1),test:"",op:">",v1:"100",fmt:"Notes!A1"}]},
  {name:"Notes",cells:{A1:{v:"over",f:{bg:"#fdecea",color:"#c0392b"}}},colW:{},rowH:{},rules:[]}],active:0};
const json=JSON.stringify(wb).replace(/</g,"\\u003c");
let html=src.replace(/(<script id="gfdata"[^>]*>)[\s\S]*?(<\/script>)/,(m,a,b)=>a+json+b)
            .replace(/<title>[\s\S]*?<\/title>/,"<title>Household budget 2026</title>");
fs.writeFileSync(process.argv[2],html);
