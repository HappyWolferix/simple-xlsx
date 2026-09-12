/* A test runner in 30 lines, so the suite needs nothing installed. */
let pass=0,failures=[];
function check(ok,label,got,want){
  if(ok)pass++;else failures.push({label,got,want});
}
function is(got,want,label){
  check(String(got)===String(want),label||String(got),got,want);
}
// the common case: a formula in a scratch cell should display `want`
function formula(sheet,src,want){
  let got;
  try{sheet.set("Z99",src);got=sheet.get("Z99");}
  catch(e){got="threw: "+(e&&e.message||JSON.stringify(e));}
  check(String(got)===String(want),src,got,want);
}
function report(){
  for(const f of failures)console.log("FAIL  "+f.label+"\n        got "+JSON.stringify(f.got)+", want "+JSON.stringify(f.want));
  console.log((failures.length?"\n":"")+pass+" passed, "+failures.length+" failed");
  process.exit(failures.length?1:0);
}
module.exports={is,formula,report};
