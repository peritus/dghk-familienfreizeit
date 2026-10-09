import { check, fact } from '../../attention/helpers.js'
import type { InventorySummary } from './index.js'
export const inventoryAttention = [check('room-inventory.room-without-places','room-inventory',['Zimmer ohne Schlafplätze','Room without sleeping places'],c=>{const inventory=c.world!.summaries['room-inventory'] as InventorySummary;if(!inventory)throw new Error('missing inventory');return inventory.rooms.filter(r=>r.place_count===0).map(r=>fact(c,[r.id],[r.id],{places:0}))},{scopes:['dashboard','accommodation']})]
