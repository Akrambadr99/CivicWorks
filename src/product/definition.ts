import { validateAuthorization as validate0 } from '../work-order/policy'
import { validateAuthorization as validate1 } from '../road-closure/policy'
import { validateAuthorization as validate2 } from '../utility-conflict/policy'
import { validateAuthorization as validate3 } from '../permit-inspection/policy'
import { validateAuthorization as validate4 } from '../resident-impact/policy'
import { validateAuthorization as validate5 } from '../materials-stock/policy'
import { validateAuthorization as validate6 } from '../contractor-milestone/policy'
import { validateAuthorization as validate7 } from '../asset-condition/policy'
import type { Entity, Field, Operation, Product } from '../workspace/types'
import { entity, number, requireThat, text } from '../workspace/values'
const roles=["Works Coordinator","Municipal Engineer","Field Inspector","Public Works Director"] as const
const textField=(key:string,label:string):Field=>({key,label,type:'text',required:true,initial:'Evidence pending'})
const numberField=(key:string,label:string,initial:number):Field=>({key,label,type:'number',required:true,integer:true,min:0,max:1000000000,initial})
const dateField=(key:string,label:string):Field=>({key,label,type:'date',required:true,initial:'2026-09-14'})
type Validator=(record:{measured:number;limit:number;evidence:string;revision:number})=>unknown
function workflowOperations(kind:string,label:string,validate:Validator):Operation[]{return[
  {key:kind+'-submit',label:'Submit '+label,kind,from:['draft'],roles:[roles[0]],run:({entity})=>{entity.status='review';return label+' submitted for independent review.'}},
  {key:kind+'-authorize',label:'Authorize '+label,kind,from:['review'],roles:[roles[1]],run:({entity})=>{validate({measured:number(entity.fields,'measured'),limit:number(entity.fields,'limit'),evidence:text(entity.fields,'evidence'),revision:entity.revision});entity.status='authorized';return label+' authorized against current evidence and limits.'}},
  {key:kind+'-execute',label:'Execute '+label,kind,from:['authorized'],roles:[roles[2]],run:({entity,now})=>{requireThat(text(entity.fields,'effectiveDate')<=now.slice(0,10),'The effective date has not arrived.');entity.status='active';return label+' executed with operational custody recorded.'}},
  {key:kind+'-block',label:'Block '+label,kind,from:['authorized','active'],roles:[roles[0],roles[2]],fields:[textField('reason','Blocking reason')],run:({entity,input})=>{requireThat(text(input,'reason').trim().length>=8,'A specific blocking reason is required.');entity.status='blocked';return label+' blocked without losing prior evidence.'}},
  {key:kind+'-recover',label:'Recover '+label,kind,from:['blocked'],roles:[roles[1]],fields:[textField('recovery','Recovery evidence')],run:({entity,input})=>{requireThat(text(input,'recovery').trim().length>=8,'Recovery evidence is required.');entity.status='review';return label+' returned to review with recovery evidence.'}},
  {key:kind+'-close',label:'Close '+label,kind,from:['active'],roles:[roles[3]],run:({entity})=>{entity.status='closed';return label+' closed by accountable authority.'}},
]}
const kinds=[{
    key:"work-order", label:"Public work order capacity", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Required crew hours",6), numberField('limit',"Available crew hours",8), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  },
{
    key:"road-closure", label:"Road closure windows", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Reopening day",4), numberField('limit',"Required reopening day",5), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  },
{
    key:"utility-conflict", label:"Underground utility conflicts", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Survey revision",6), numberField('limit',"Approved utility-map revision",8), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  },
{
    key:"permit-inspection", label:"Permit inspection", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Inspection score",4), numberField('limit',"Minimum passing score",5), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  },
{
    key:"resident-impact", label:"Resident impact limits", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Affected households",6), numberField('limit',"Maximum planned households",8), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  },
{
    key:"materials-stock", label:"Materials reserve", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Available material units",4), numberField('limit',"Minimum required units",5), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  },
{
    key:"contractor-milestone", label:"Contractor milestone sequence", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Completed milestone",6), numberField('limit',"Required milestone",8), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  },
{
    key:"asset-condition", label:"Asset condition freshness", states:['draft','review','authorized','active','blocked','closed'], initial:'draft', editors:[roles[0]],
    fields:[textField('owner','Accountable owner'), numberField('measured',"Inspection age (days)",4), numberField('limit',"Maximum inspection age",5), textField('evidence','Evidence reference'), dateField('effectiveDate','Effective date')]
  }]
const operations:Operation[]=[...workflowOperations("work-order", "Public work order capacity", validate0),
...workflowOperations("road-closure", "Road closure windows", validate1),
...workflowOperations("utility-conflict", "Underground utility conflicts", validate2),
...workflowOperations("permit-inspection", "Permit inspection", validate3),
...workflowOperations("resident-impact", "Resident impact limits", validate4),
...workflowOperations("materials-stock", "Materials reserve", validate5),
...workflowOperations("contractor-milestone", "Contractor milestone sequence", validate6),
...workflowOperations("asset-condition", "Asset condition freshness", validate7)]
const seed:Entity[]=[entity("work-order-001","work-order","Public work order capacity primary record",'review',{owner:"Works Coordinator",measured:4,limit:8,evidence:"EV-CIVICWORKS-001",effectiveDate:'2026-09-14'}),
entity("work-order-002","work-order","Public work order capacity recovery record",'blocked',{owner:"Field Inspector",measured:4,limit:8,evidence:"REC-CIVICWORKS-001",effectiveDate:'2026-09-15'}),
entity("road-closure-001","road-closure","Road closure windows primary record",'review',{owner:"Works Coordinator",measured:4,limit:8,evidence:"EV-CIVICWORKS-002",effectiveDate:'2026-09-14'}),
entity("road-closure-002","road-closure","Road closure windows recovery record",'blocked',{owner:"Field Inspector",measured:4,limit:8,evidence:"REC-CIVICWORKS-002",effectiveDate:'2026-09-15'}),
entity("utility-conflict-001","utility-conflict","Underground utility conflicts primary record",'review',{owner:"Works Coordinator",measured:5,limit:5,evidence:"EV-CIVICWORKS-003",effectiveDate:'2026-09-14'}),
entity("utility-conflict-002","utility-conflict","Underground utility conflicts recovery record",'blocked',{owner:"Field Inspector",measured:5,limit:5,evidence:"REC-CIVICWORKS-003",effectiveDate:'2026-09-15'}),
entity("permit-inspection-001","permit-inspection","Permit inspection primary record",'review',{owner:"Works Coordinator",measured:8,limit:5,evidence:"EV-CIVICWORKS-004",effectiveDate:'2026-09-14'}),
entity("permit-inspection-002","permit-inspection","Permit inspection recovery record",'blocked',{owner:"Field Inspector",measured:8,limit:5,evidence:"REC-CIVICWORKS-004",effectiveDate:'2026-09-15'}),
entity("resident-impact-001","resident-impact","Resident impact limits primary record",'review',{owner:"Works Coordinator",measured:4,limit:8,evidence:"EV-CIVICWORKS-005",effectiveDate:'2026-09-14'}),
entity("resident-impact-002","resident-impact","Resident impact limits recovery record",'blocked',{owner:"Field Inspector",measured:4,limit:8,evidence:"REC-CIVICWORKS-005",effectiveDate:'2026-09-15'}),
entity("materials-stock-001","materials-stock","Materials reserve primary record",'review',{owner:"Works Coordinator",measured:8,limit:5,evidence:"EV-CIVICWORKS-006",effectiveDate:'2026-09-14'}),
entity("materials-stock-002","materials-stock","Materials reserve recovery record",'blocked',{owner:"Field Inspector",measured:8,limit:5,evidence:"REC-CIVICWORKS-006",effectiveDate:'2026-09-15'}),
entity("contractor-milestone-001","contractor-milestone","Contractor milestone sequence primary record",'review',{owner:"Works Coordinator",measured:8,limit:5,evidence:"EV-CIVICWORKS-007",effectiveDate:'2026-09-14'}),
entity("contractor-milestone-002","contractor-milestone","Contractor milestone sequence recovery record",'blocked',{owner:"Field Inspector",measured:8,limit:5,evidence:"REC-CIVICWORKS-007",effectiveDate:'2026-09-15'}),
entity("asset-condition-001","asset-condition","Asset condition freshness primary record",'review',{owner:"Works Coordinator",measured:4,limit:8,evidence:"EV-CIVICWORKS-008",effectiveDate:'2026-09-14'}),
entity("asset-condition-002","asset-condition","Asset condition freshness recovery record",'blocked',{owner:"Field Inspector",measured:4,limit:8,evidence:"REC-CIVICWORKS-008",effectiveDate:'2026-09-15'})]
export const product:Product={name:"CivicWorks",description:"Municipal infrastructure and public-works management",accent:"#645124",actors:roles.map((role,index)=>({id:'actor-'+String(index),name:role,role})),kinds,operations,seed,
 validate:(entities)=>{for(const row of entities){requireThat(kinds.some(kind=>kind.key===row.kind),'Unknown domain record.');requireThat(typeof row.fields['owner']==='string','Every workflow requires accountable ownership.')}},
 metrics:(entities)=>[{label:'Domain records',value:String(entities.length)},{label:'Active controls',value:String(entities.filter(row=>['review','authorized','active','blocked'].includes(row.status)).length)},{label:'Blocked',value:String(entities.filter(row=>row.status==='blocked').length)},{label:'Closed',value:String(entities.filter(row=>row.status==='closed').length)}]}
