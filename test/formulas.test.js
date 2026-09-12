/* The formula engine, one group per area of the language. */
const {load}=require("./harness.js");
const {formula,is,report}=require("./tap.js");

const s=load();
const f=(src,want)=>formula(s,src,want);

// --- fixture ------------------------------------------------------------
[["A1",10],["A2",20],["A3",30],["A4",""],["A5","x"],
 ["B1","apple"],["B2","banana"],["B3","apple"],
 ["C1",1],["C2",2],["C3",3],
 ["Data!A1","k1"],["Data!B1",5],["Data!A2","k2"],["Data!B2",7]].forEach(([a,v])=>s.set(a,v));

// --- operators ----------------------------------------------------------
f("=1+2*3","7");
f("=(1+2)*3","9");
f("=2^3^2","512");                 // right-associative, as in Excel
f("=-2^2","4");                    // unary minus binds tighter than ^
f("=10%","0.1");
f("=50%*80","40");
f('="a"&"b"&1',"ab1");
f(String.raw`=A1&"-"&A2`,"10-20");
f("=A1>A2","FALSE");
f('="a"="A"',"TRUE");              // text comparison is case-insensitive

// --- math ---------------------------------------------------------------
f("=SUM(A1:A3)","60");
f('=SUM(A1:A3,"5")',"65");
f("=PRODUCT(C1:C3)","6");
f("=SUMPRODUCT(A1:A3,C1:C3)","140");
f("=ROUND(2.345,2)","2.35");
f("=ROUND(-2.345,2)","-2.35");
f("=ROUNDUP(2.001,2)","2.01");
f("=ROUNDDOWN(2.999,2)","2.99");
f("=INT(-1.5)","-2");
f("=TRUNC(-1.5)","-1");
f("=MOD(-3,2)","1");
f("=ABS(-5)","5");
f("=SQRT(16)","4");
f("=POWER(2,10)","1024");
f("=CEILING(7,5)","10");
f("=FLOOR(7,5)","5");

// --- statistics ---------------------------------------------------------
f("=AVERAGE(A1:A3)","20");
f("=MEDIAN(A1:A3)","20");
f("=MIN(A1:A3)","10");
f("=MAX(A1:A3)","30");
f("=COUNT(A1:A5)","3");            // text and blanks are not numbers
f("=COUNTA(A1:A5)","4");
f("=COUNTBLANK(A1:A5)","1");
f("=LARGE(A1:A3,1)","30");
f("=SMALL(A1:A3,1)","10");
f("=ROUND(STDEV(A1:A3),4)","10");

// --- errors -------------------------------------------------------------
f("=1/0","#DIV/0!");
f("=SQRT(-1)","#NUM!");
f('=1+"x"',"#VALUE!");
f("=NOPE(1)","#NAME?");
f("=NA()","#N/A");
f("=INDEX(A1:A3,9)","#REF!");
f('=IFERROR(1/0,"n/a")',"n/a");
f('=IFNA(NA(),"gone")',"gone");
f("=ISERROR(1/0)","TRUE");
f("=ISNA(NA())","TRUE");
s.set("E1","=1/0");
f("=ISERROR(E1)","TRUE");          // an error travels through a reference
f("=E1+1","#DIV/0!");

// --- logic --------------------------------------------------------------
f('=IF(A1>5,"big","small")',"big");
f('=IFS(A1>100,"a",A1>5,"b")',"b");
f("=AND(A1>5,A2>5)","TRUE");
f("=OR(A1>50,A2>50)","FALSE");
f("=NOT(TRUE())","FALSE");
f('=SWITCH(A1,10,"ten",20,"twenty","other")',"ten");

// --- conditional aggregation -------------------------------------------
f('=SUMIF(A1:A3,">15")',"50");
f('=SUMIF(B1:B3,"apple",A1:A3)',"40");
f('=COUNTIF(B1:B3,"apple")',"2");
f('=COUNTIF(B1:B3,"ap*")',"2");    // wildcards
f('=COUNTIF(A1:A3,"<>10")',"2");
f('=SUMIFS(A1:A3,B1:B3,"apple",A1:A3,">10")',"30");
f('=AVERAGEIF(A1:A3,">15")',"25");
f('=MAXIFS(A1:A3,B1:B3,"apple")',"30");
f('=MINIFS(A1:A3,B1:B3,"apple")',"10");
f('=COUNTIFS(B1:B3,"apple",A1:A3,">15")',"1");

// --- lookup -------------------------------------------------------------
f('=VLOOKUP("k2",Data!A1:B2,2)',"7");
f('=VLOOKUP("zz",Data!A1:B2,2)',"#N/A");     // our default is an exact match
f('=VLOOKUP("zz",Data!A1:B2,2,TRUE)',"7");   // ...approximate only when asked
f("=HLOOKUP(10,A1:C1,1)","10");
f("=MATCH(20,A1:A3,0)","2");
f("=MATCH(25,A1:A3)","2");                   // default type 1, like Excel
f("=INDEX(A1:A3,2)","20");
f("=INDEX(Data!A1:B2,2,2)","7");
f('=XLOOKUP("k1",Data!A1:A2,Data!B1:B2)',"5");
f('=XLOOKUP("zz",Data!A1:A2,Data!B1:B2,"none")',"none");
f('=CHOOSE(2,"a","b")',"b");
f("=ROWS(A1:A3)","3");
f("=COLUMNS(A1:C1)","3");
f("=ROW(A5)","5");
f("=COLUMN(C1)","3");

// --- text ---------------------------------------------------------------
f('=CONCAT(B1,"-",B2)',"apple-banana");
f('=TEXTJOIN(",",TRUE,A1:A5)',"10,20,30,x");
f("=LEFT(B2,3)","ban");
f("=RIGHT(B2,2)","na");
f("=MID(B2,2,3)","ana");
f("=LEN(B2)","6");
f("=UPPER(B1)","APPLE");
f("=LOWER(\"AB\")","ab");
f('=PROPER("john doe")',"John Doe");
f('=TRIM("  a  b ")',"a b");
f('=SUBSTITUTE("a-b-c","-","+")',"a+b+c");
f('=SUBSTITUTE("a-b-c","-","+",2)',"a-b+c");
f('=REPLACE("abcdef",2,3,"X")',"aXef");
f('=FIND("c","abc")',"3");
f('=FIND("z","abc")',"#VALUE!");
f('=SEARCH("C","abc")',"3");       // SEARCH ignores case, FIND does not
f('=REPT("ab",3)',"ababab");
f('=EXACT("a","A")',"FALSE");
f('=VALUE("1,234.5")',"1234.5");
f('=TEXT(1234.5,"#,##0.00")',"1,234.50");
f('=TEXT(0.256,"0.0%")',"25.6%");
f('=TEXT("2024-03-05","dd.mm.yyyy")',"05.03.2024");
f('=TEXT("2024-03-05","d mmm yyyy")',"5 Mar 2024");

// --- information --------------------------------------------------------
f("=ISBLANK(A4)","TRUE");
f("=ISNUMBER(A1)","TRUE");
f("=ISTEXT(A5)","TRUE");
f("=ISNUMBER(A5)","FALSE");

// --- dates (stored and returned as ISO text) ----------------------------
f("=DATE(2024,3,5)","2024-03-05");
f('=YEAR("2024-03-05")',"2024");
f('=MONTH("5.3.2024")',"3");       // D.M.YYYY is accepted on input
f('=DAY("2024-03-05")',"5");
f('=DAYS("2024-03-10","2024-03-05")',"5");
f('=EDATE("2024-01-31",1)',"2024-02-29");   // clamps to a short month
f('=EOMONTH("2024-02-05",0)',"2024-02-29");
f('=DATEDIF("2024-01-31","2024-03-01","M")',"1");
f('=WEEKDAY("2024-03-05")',"3");
f('=NETWORKDAYS("2024-03-04","2024-03-08")',"5");
f('=NETWORKDAYS("2024-03-04","2024-03-10")',"5");   // the weekend does not count

// --- finance ------------------------------------------------------------
f("=ROUND(PMT(0.05/12,360,200000),2)","-1073.64");
f("=ROUND(FV(0.05,10,-100,0),2)","1257.79");
f("=ROUND(PV(0.05,10,-100,0),2)","772.17");
f("=ROUND(NPV(0.1,100,100),2)","173.55");

// --- references and recursion ------------------------------------------
s.set("D1","=A1*2");
s.set("D2","=D1+A2");
is(s.get("D2"),"40","a formula may build on another formula");
s.set("F1","=F2");s.set("F2","=F1");
is(s.get("F1"),"#ERR","a circular reference is caught, not hung on");
f("=Data!B2*2","14");
f("=SUM(Data!B1:B2)","12");

report();
