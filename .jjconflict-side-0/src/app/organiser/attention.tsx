import { useMemo, useState } from 'react'
import { useOrganiser } from './context.js'
import { activeProfile } from '../../config/index.js'
import { buildRevision } from '../../config/build.js'
import { profileAttention } from '../../attention/profile.js'
import { attentionAllClear, attentionComplete, selectAttention } from '../../attention/selectors.js'
import { canonical } from '../../attention/engine.js'
import type { AttentionItem, AttentionResult, AttentionScope, AttentionArea, AttentionAction } from '../../attention/types.js'
import type { JsonValue } from '../../events/types.js'
import { ActionableNotice } from '../components/shared/ui/notice.js'
import { Button } from '../components/shared/ui/button.js'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../components/shared/ui/dialog.js'
import { OrganiserLink } from '../components/application/organiser-link.js'
import { organiserPaths, organiserPathWithQuery } from '../../organiser/routes.js'
import { subjectName } from './closed-areas.js'
const evaluator=profileAttention(activeProfile)
export function useAttention():AttentionResult {
 const {attention,world,current_plan:plan,state}=useOrganiser()
 return useMemo(()=>attention??evaluator({domain:world?'available':'loading',world,plan:plan??null,profile:activeProfile,build_revision:plan?.meta.build_revision??buildRevision,locale:activeProfile.meta.locale,now:'2027-01-01T00:00:00.000Z',audience:'organiser',basis:{mode:state.drafts.length?'prospective':'committed',group_ids:state.drafts.flatMap(g=>g.id?[g.id]:[])}}),[attention,world,plan,state.drafts])
}
const labels:Readonly<Record<string,string>>={capacity:'Plätze',demand:'Bedarf',attendance:'Teilnahmen',actual:'Zugeordnete Schlafplätze',shortfall:'Fehlende Plätze',expected:'Erfüllungsziel',field:'Angabe',trait:'Merkmal',key:'Merkmal',capability:'Ausstattung',target:'Verweis',target_at:'Zieltermin',saved_at:'Gespeichert am',slot_id:'Slot',space_id:'Raum',room_id:'Zimmer',workshop_id:'Workshop',workshop_ids:'Workshops',person_ids:'Personen',unplaced_person_ids:'Ohne Schlafplatz',family_ids:'Betroffene Familien',people:'Teilnehmende',leaders:'Leitungen',unavailable:'Nicht verfügbar',age_min:'Mindestalter',age_max:'Höchstalter',audience:'Zielgruppe',asked:'Gewählte Workshops',fulfilled:'Erfüllte Wünsche',max_rank:'Anzahl Wahlrunden',attendance_changed:'Teilnahme würde sich ändern',places:'Schlafplätze',slots:'Slots',spaces:'Räume',count:'Anzahl',cardinality:'Erlaubte Anzahl',value:'Wert',choices:'Antwort',reasons:'Gründe',reason:'Grund',changes:'Änderungen',area:'Bereich'}
export function AttentionDetails({item}:{item:AttentionItem}) {
 const {world,stage,dispatch,state,apply}=useOrganiser()
 const [confirm,setConfirm]=useState<AttentionAction|null>(null)
 const display=(value:JsonValue):string=>typeof value==='string'?(world?.entity_kind_by_id[value]?subjectName(world,value):activeProfile.traits[value as keyof typeof activeProfile.traits]?.title?typeof activeProfile.traits[value as keyof typeof activeProfile.traits].title==='string'?activeProfile.traits[value as keyof typeof activeProfile.traits].title as string:(activeProfile.traits[value as keyof typeof activeProfile.traits].title as Readonly<Record<string,string>>).de??value:value):typeof value==='boolean'?value?'Ja':'Nein':value===null?'—':Array.isArray(value)?value.map(display).join(', '):typeof value==='object'?Object.entries(value).filter(([key])=>labels[key]).map(([key,v])=>`${labels[key]}: ${display(v)}`).join('; '):String(value)
 const execute=()=>{
  if(confirm?.kind==='clear-label') {
   const current=world?.labels_by_entity[confirm.entity_id]?.find(l=>l.key===confirm.key&&canonical(l.value)===canonical(confirm.value)&&l.set_seq===confirm.seq)
   if(!current){setConfirm(null);return}
   stage([{type:'LabelCleared',at:new Date().toISOString(),actor:state.principal_email!,subject:confirm.entity_id,payload:{entity_id:confirm.entity_id,key:confirm.key,value:confirm.value}}])
  } else if(confirm?.kind==='review-group') dispatch({type:'discard-group',group_id:confirm.group_id})
  setConfirm(null)
 }
 return <div className="space-y-2">
  <p>{item.wording.detail}</p>
  {item.subjects.length?<ul>{item.subjects.map(s=><li key={`${s.kind}:${s.id}`}>{s.available&&world?subjectName(world,s.id):'Objekt nicht verfügbar'}</li>)}</ul>:null}
  {item.wording.reasons.length?<ul className="list-disc pl-5">{item.wording.reasons.map((r,i)=><li key={`${r}:${i}`}>{r}</li>)}</ul>:null}
  <dl className="text-sm">{Object.entries(item.evidence).filter(([key])=>labels[key]&&!['reason','reasons'].includes(key)).map(([key,value])=><div key={key}><dt className="font-bold">{labels[key]}</dt><dd>{display(value)}</dd></div>)}</dl>
  {item.source_refs.length?<p className="text-sm text-muted">Grundlage: {item.source_refs.map(s=>s.kind==='label'?`Angabe, Ereignis ${s.seq}`:s.kind==='closing'?`Festlegung, Ereignis ${s.seq}`:s.kind==='stage'?'Berechnete Zuordnung':s.kind==='resolver'?'Abgeleitete Anforderungen':s.kind==='field'?'Eingabeprüfung':'Speichervorgang').join(' · ')}</p>:null}
  <div className="flex flex-wrap gap-2 print:hidden">{item.actions.map((action,i)=>action.kind==='navigate'?<OrganiserLink key={i} className="underline" href={action.destination==='family'&&action.entity_id?organiserPaths.family_detail(action.entity_id):action.destination==='workshop'?organiserPathWithQuery(organiserPaths.workshops(),{workshop:action.entity_id??''}):action.destination==='accommodation'?organiserPaths.assignment_board():action.destination==='programme'?organiserPaths.workshop_programme():organiserPaths.workshop_allocation()}>Ansehen</OrganiserLink>:<Button key={i} variant="neutral" onClick={()=>{if(action.kind==='reload'||action.kind==='retry')action.kind==='retry'?void apply():window.location.reload();else if(action.kind==='login')window.location.assign('/login');else setConfirm(action)}} disabled={action.kind==='review-group'&&state.submitted_groups?.includes(action.group_id)}>{action.kind==='clear-label'?'Angabe entfernen …':action.kind==='review-group'?'Änderungsgruppe prüfen …':action.kind==='login'?'Anmelden':action.kind==='retry'?'Erneut versuchen':'Neu laden'}</Button>)}</div>
  <Dialog open={confirm!==null} onOpenChange={open=>{if(!open)setConfirm(null)}}><DialogContent><DialogHeader><DialogTitle>{confirm?.kind==='clear-label'?'Diese Angabe entfernen?':'Diese Änderungsgruppe verwerfen?'}</DialogTitle><DialogDescription>{confirm?.kind==='clear-label'?'Die angezeigte Angabe wird nach erneuter Prüfung ihres aktuellen Standes entfernt.':'Andere Änderungsgruppen bleiben erhalten.'}</DialogDescription></DialogHeader><DialogFooter><DialogClose render={<Button variant="neutral">Behalten</Button>}/><Button onClick={execute}>Bestätigen</Button></DialogFooter></DialogContent></Dialog>
 </div>
}
export function AttentionNotices({scope,area,subject_id:subjectId,actionable=false,show_clear:showClear=false}:{scope?:AttentionScope;area?:AttentionArea;subject_id?:string;actionable?:boolean;show_clear?:boolean}) {
 const result=useAttention(),items=selectAttention(result,{scope,area,subject_id:subjectId,actionable})
 if(items.length===0)return showClear?<p>{attentionAllClear(result)?'Keine offenen Hinweise in den geprüften Daten.':!attentionComplete(result)?'Die Prüfung ist noch nicht vollständig.':null}</p>:null
 return <ActionableNotice title={`${items.length} ${items.length===1?'Hinweis':'Hinweise'}`}><ul className="space-y-3">{items.map(item=><li key={item.id}><details><summary className="cursor-pointer font-bold">{item.wording.title}</summary><AttentionDetails item={item}/></details></li>)}</ul></ActionableNotice>
}
