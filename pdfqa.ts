import { exportRosterPdf, exportSectionsPdf } from "/dev-server/src/lib/pdf";
// stub save
const fs = require("fs");
const jsPDF = (await import("jspdf")).default;
const orig = jsPDF.prototype.save;
jsPDF.prototype.save = function (name: string) { fs.writeFileSync("/tmp/pdfqa/" + name.replace(/[^\w.-]/g,"_"), Buffer.from(this.output("arraybuffer"))); return this; };
const rows = Array.from({length: 14}, (_,i)=>({photo_url:null,cells:[`MU${100+i}`,`Member Name ${i}`,"Member","Photography","10","2025-01-0"+(i%9+1)]}));
await exportRosterPdf({filename:"roster.pdf",title:"Full Member Directory",subtitle:"All roles · all sections",kicker:"Member report",columns:["MU #","Name","Role","Section","Grade","Joined"],groups:[{heading:"Section Head",rows:rows.slice(0,3)},{heading:"Member",rows}],withPhotos:true,confidential:true,notes:"Prepared for the annual school report.",chips:[{label:"Members in report",value:17},{label:"Leadership",value:3},{label:"Sections covered",value:5},{label:"Generated",value:"07/08/2026"}]});
await exportSectionsPdf("member.pdf","Kavindu Perera","Photography lead, joined 2024",[{heading:"Profile",kv:[["Name","Kavindu Perera"],["MU number","MU104"],["Gmail","x@y.com"]]},{heading:"Events covered",table:{columns:["Event","Date","Location","Role","Status"],rows:[["Sports Meet","2026-03-02","Main ground","Photographer","approved"]]}},{heading:"Attendance",table:{columns:["Date","Meeting"],rows:[]}}],{kicker:"Member",confidential:true,chips:[{label:"Total points",value:420},{label:"Attendance",value:18},{label:"Events",value:9},{label:"Requests",value:12}]});
