import { capacityReductionCheck } from '../modules/official-workshops/attention.js'
import { composeAttention } from '../attention/engine.js'
import type { OccasionProfile } from '../config/define.js'
import { derive, type World } from '../events/fold.js'
import { prepareEventBatch } from '../events/prepare.js'
import type { Event, EventDraft } from '../events/types.js'
import { buildSolverInput, composeSolverContributions, solve } from '../solver/index.js'
import type { Plan } from '../solver/types.js'
import { fixedWorkshopIdFromToken } from '../modules/official-workshops/fixed-attendance-token.js'
import { canonical } from '../attention/engine.js'
export class CapacityReductionError extends Error {
 readonly code = 'official-workshops.capacity-reduction-invalid'
 constructor(public readonly workshop_id: string, public readonly capacity: number, public readonly attendance: number, public readonly attendance_changed: boolean) { super('capacity reduction would change current attendance') }
}
/** Proposal admission is not replay validation. Only actual reductions solve prefixes. */
export function admitProfileProposal(committed: readonly Event[], drafts: readonly EventDraft[], profile: OccasionProfile, revisions: {build_revision:string;compatibility_revision:number}) {
 const prepared=prepareEventBatch(committed,drafts,profile.validation_view)
 if(!profile.modules.some(m=>m.id==='workshop-assignment'))return prepared
 const lowering=prepared.events.filter(e=>e.type==='WorkshopUpdated'||((e.type==='LabelSet'||e.type==='LabelCleared')&&e.payload!==null&&typeof e.payload==='object'&&!Array.isArray(e.payload)&&e.payload.key==='capacity'))
 if(!lowering.length)return prepared
 const contributions=composeSolverContributions(profile)
 const calculate=(world:World)=>solve(buildSolverInput(world,contributions),contributions,{...revisions,event_date:profile.meta.starts_on,profile,seed:null})
 const prefix=[...committed]
 let beforeWorld:World|null=null,beforePlan:Plan|null=null
 const candidates=new Set(lowering.map(e=>e.seq))
 for(const event of prepared.events){
  if(!candidates.has(event.seq)){prefix.push(event);beforeWorld=null;beforePlan=null;continue}
  const payload=event.payload as {workshop_id?:string;entity_id?:string;capacity?:number;value?:unknown}
  const id=payload.workshop_id??payload.entity_id!
  const oldWorld=beforeWorld??derive(prefix,profile.validation_view)
  const oldCapacity=oldWorld.labels_by_entity[id]?.find(l=>l.key==='capacity')?.value
  const newCapacity=event.type==='WorkshopUpdated'?payload.capacity:event.type==='LabelSet'?payload.value:0
  if(typeof newCapacity!=='number'||typeof oldCapacity!=='number'||newCapacity>=oldCapacity){prefix.push(event);beforeWorld=null;beforePlan=null;continue}
  const oldPlan=beforePlan??calculate(oldWorld),newWorld=derive([...prefix,event],profile.validation_view),newPlan=calculate(newWorld)
  const attendance=currentAttendance(oldWorld,oldPlan,id)
  const changed=canonical(attendancePairs(oldPlan))!==canonical(attendancePairs(newPlan))
  if(newCapacity<attendance||changed)throw new CapacityReductionError(id,newCapacity,attendance,changed)
  prefix.push(event);beforeWorld=newWorld;beforePlan=newPlan
 }
 return prepared
}
function attendancePairs(plan:Plan){const s=plan.sections['workshop-assignment'] as {assignments:readonly {person_id:string;workshop_id:string}[]}|undefined;return [...new Set((s?.assignments??[]).map(a=>canonical([a.person_id,a.workshop_id])))].sort()}
function currentAttendance(world:World,plan:Plan,id:string){
 const s=plan.sections['workshop-assignment'] as {assignments:readonly {person_id:string;workshop_id:string}[]}|undefined
 const people=new Set((s?.assignments??[]).filter(a=>a.workshop_id===id).map(a=>a.person_id))
 for(const l of world.labels_by_key['signed-up-for']??[])if(l.value===id&&world.entity_kind_by_id[l.entity_id]==='person')people.add(l.entity_id)
 const provided=new Set((world.labels_by_entity[id]??[]).filter(l=>l.key==='provides').map(l=>l.value))
 for(const l of world.labels_by_key.needs??[])if(world.entity_kind_by_id[l.entity_id]==='person'&&typeof l.value==='string'&&fixedWorkshopIdFromToken(l.entity_id,l.value)===id&&provided.has(l.value))people.add(l.entity_id)
 return people.size
}

export function capacityReductionFinding(error:CapacityReductionError,profile:OccasionProfile,build:string,now:string) {
 return composeAttention([capacityReductionCheck])({domain:'invalid-proposal',world:null,plan:null,profile,build_revision:build,locale:profile.meta.locale,now,audience:'organiser',capacity_rejections:[{workshop_id:error.workshop_id,capacity:error.capacity,attendance:error.attendance,attendance_changed:error.attendance_changed}]}).items[0]!
}
