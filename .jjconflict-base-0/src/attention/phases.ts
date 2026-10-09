import { check, fact } from './helpers.js'
import { derivePhaseStatus } from '../derive/phases.js'
export const phaseAttentionChecks = [
 check('phase.target-passed','core',['Zieltermin überschritten; Änderungen bleiben möglich','Target date passed; changes remain possible'],c=>derivePhaseStatus({modules:c.profile.modules,meta:c.profile.meta,world:c.world!,now:c.now}).filter(p=>p.status==='late').map(p=>fact(c,[p.phase],[],{phase:p.phase,target_at:p.target_at})),{areas:['core'],kind:'information',severity:'info',scopes:['family','closing']}),
 check('phase.closed','core',['Bereich festgelegt','Area closed'],c=>Object.entries(c.world!.phase_facts.areas).filter(([,f])=>f.latest?.kind==='closed').map(([area,f])=>fact(c,[area],[],{area,closed_at:f.latest!.at},{sources:[{kind:'closing',area,seq:f.latest!.seq}]})),{areas:['core'],kind:'status',severity:'info',scopes:['closing','print']}),
 check('phase.closed-result-changed','core',['Abweichung vom festgelegten Ergebnis','Difference from closed result'],c=>(c.closed_changes??[]).filter(d=>d.closed&&d.changes.length>0).map(d=>fact(c,[d.area,d.seq],d.family_ids,{area:d.area,changes:[...d.changes],family_ids:[...d.family_ids].sort()},{sources:[{kind:'closing',area:d.area,seq:d.seq}]})),{areas:['core'],scopes:['dashboard','closing','print']}),
]
