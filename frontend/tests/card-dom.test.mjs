import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
const bundle = readFileSync(new URL('../../custom_components/schedule_creator/frontend/schedule-creator-card.js',import.meta.url),'utf8');
const tick=()=>new Promise((r)=>setImmediate(r));
const services={cover:{open_cover:{},close_cover:{},set_cover_position:{}},switch:{turn_on:{},turn_off:{}},light:{turn_on:{},turn_off:{}},climate:{set_temperature:{},set_hvac_mode:{},set_fan_mode:{}},fan:{turn_on:{},turn_off:{},set_percentage:{},set_preset_mode:{}},automation:{trigger:{}},update:{install:{}}};
function setup() {
  const dom=new JSDOM('<body></body>',{url:'http://ha.local/lovelace/casa',runScripts:'dangerously',virtualConsole:new VirtualConsole()});
  dom.window.structuredClone=structuredClone;
  dom.window.confirm=()=>true;
  dom.window.eval(bundle);
  const states=Object.fromEntries([
    ['switch.a',{friendly_name:'Lampada test'}],['switch.outside',{friendly_name:'Fuori gruppo'}],['sensor.temperature',{unit_of_measurement:'°C',friendly_name:'Temperatura'}],['automation.test',{}],['update.test',{}],
    ['light.rgb',{supported_color_modes:['rgb','color_temp'],min_color_temp_kelvin:2000,max_color_temp_kelvin:6500}],
    ['climate.room',{hvac_modes:['heat','cool','off'],fan_modes:['low','high'],supported_features:9,min_temp:7,max_temp:30}],
    ['fan.room',{supported_features:9,preset_modes:['eco']}],
    ['cover.blind',{friendly_name:'Tenda',supported_features:15,current_position:20}],
  ].map(([id,attributes])=>[id,{entity_id:id,attributes,state:'off'}]));
  const snapshot={revision:3,config:{profiles:[{id:'p',name:'Home',active:true}],groups:[{id:'g',profile_id:'p',name:'Room',entity_ids:['switch.a']}],schedules:[]},runtime_summary:{revision:6},quick_timers:[],operational:{}};
  const writes=[];
  const hass={user:{is_admin:true},states,services,config:{time_zone:'Europe/Rome'},connection:{subscribeMessage:()=>Promise.resolve(()=>{}),sendMessagePromise:(msg)=>{if(msg.type.endsWith('get_state'))return Promise.resolve(snapshot);writes.push(JSON.parse(JSON.stringify(msg)));return Promise.resolve({revision:4});}}};
  const card=dom.window.document.createElement('schedule-creator-card');card.setConfig({});card.hass=hass;dom.window.document.body.append(card);
  const root=card.shadowRoot;
  const click=(name)=>root.querySelector(`[data-command="${name}"]`).click();
  const pick=(name,value)=>{const node=root.querySelector(`[name="${name}"][value="${value}"]`);assert.ok(node,`missing ${name}=${value}`);node.checked=true;node.dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
  const submit=()=>root.querySelector('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  const set=(name,value,event='change')=>{const node=root.querySelector(`[name="${name}"]`);assert.ok(node,`missing ${name}`);if(node.type==='checkbox')node.checked=value;else node.value=value;node.dispatchEvent(new dom.window.Event(event,{bubbles:true}));};
  return {dom,card,hass,snapshot,writes,root,click,set,pick,submit,close:()=>{card.remove();dom.window.close();}};
}
test('group lists controllable entities and search really hides nonmatches',async()=>{
 const t=setup();try {await tick();t.click('newGroup');
 assert.equal(t.root.querySelector('[name="entities"][value="sensor.temperature"]'),null);
 assert.equal(t.root.querySelector('[name="entities"][value="automation.test"]'),null);
 assert.equal(t.root.querySelector('[name="entities"][value="update.test"]'),null);
 assert.equal(t.root.querySelector('.sc-version').textContent,'v0.3.12');
 t.set('entity_search','lampada','input');
 const hidden=t.root.querySelector('[value="switch.outside"]').parentElement;
 assert.equal(hidden.hidden,true);
 assert.equal(hidden.style.getPropertyValue('display'),'none');
 assert.equal(hidden.style.getPropertyPriority('display'),'important');
 const search=t.root.querySelector('[name="entity_search"]');
 const enter=new t.dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});
 assert.equal(search.dispatchEvent(enter),false);
 assert.equal(enter.defaultPrevented,true);
 assert.ok(t.root.querySelector('[name="entity_search"]'));
 assert.equal(t.writes.length,0);
 t.card.render();
 assert.equal(t.root.querySelector('[value="switch.outside"]').parentElement.hidden,true);
 // Apply the shipped styles in the document to test the display override too.
 const style=t.dom.window.document.createElement('style');style.textContent=[...t.root.querySelectorAll('style')].map((n)=>n.textContent).join('');t.dom.window.document.head.append(style);
 const holder=t.dom.window.document.createElement('div');holder.className='sc-entities';holder.innerHTML=hidden.outerHTML;t.dom.window.document.body.append(holder);
 assert.equal(t.dom.window.getComputedStyle(holder.firstChild).display,'none');
 }finally{t.close();}
});
test('updating a group survives unsupported name getters on other form controls',async()=>{
 const t=setup();try {await tick();t.click('editGroup');
 const outside=t.root.querySelector('[name="entities"][value="switch.outside"]');
 outside.checked=true;outside.dispatchEvent(new t.dom.window.Event('input',{bubbles:true}));
 Object.defineProperty(t.dom.window.HTMLButtonElement.prototype,'name',{configurable:true,get(){throw new Error('Method not implemented.');}});
 t.root.querySelector('form').dispatchEvent(new t.dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.equal(t.writes.length,1,t.root.querySelector('.sc-error-details textarea')?.value);
 assert.equal(t.writes[0].type,'schedule_creator/group/update');
 assert.deepEqual(t.writes[0].entity_ids,['switch.a','switch.outside']);
 assert.equal(t.root.querySelector('.sc-error'),null);
 }finally{t.close();}
});
test('schedule only offers group members and sends ON/OFF without temperature or JSON',async()=>{
 const t=setup();try {await tick();t.click('newSchedule');
 assert.deepEqual([...t.root.querySelectorAll('[name="entities"]')].map((n)=>n.value),['switch.a']);
 assert.equal(t.root.querySelector('[name="start_temperature"]'),null);
 t.set('name','Test','input');t.pick('end_mode','off');
 t.root.querySelector('form').dispatchEvent(new t.dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.equal(t.writes.length,1,t.root.textContent);
 assert.deepEqual(t.writes[0].start_action,{domain:'switch',action:'turn_on',data:{}});
 assert.deepEqual(t.writes[0].end_action,{domain:'switch',action:'turn_off',data:{}});
 assert.equal(t.writes[0].profile_id,'p');assert.equal(t.writes[0].group_id,'g');
 }finally{t.close();}
});
test('schedule write error identifies command, gives recovery steps and keeps editor',async()=>{
 const t=setup();try {await tick();t.click('newSchedule');t.set('name','Test','input');
 const original=t.hass.connection.sendMessagePromise;
 t.hass.connection.sendMessagePromise=(msg)=>msg.type==='schedule_creator/schedule/create' ? Promise.reject({message:'method not implemented.'}) : original(msg);
 t.root.querySelector('form').dispatchEvent(new t.dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
 const alert=t.root.querySelector('.sc-error').textContent;
 assert.match(alert,/Dettagli errore/);
 const details=t.root.querySelector('.sc-error-details textarea').value;
 assert.match(details,/schedule_creator\/schedule\/create/);
 assert.match(details,/Fase: invio comando WebSocket/);
 assert.doesNotMatch(alert,/riavvia/);
 assert.ok(t.root.querySelector('form[data-editor]'));
 assert.equal(t.root.querySelector('[name="name"]').value,'Test');
 }finally{t.close();}
});
test('local action failure exposes phase and stack, keeps draft and permits retry',async()=>{
 const t=setup();try {await tick();t.click('newSchedule');t.set('name','Presa test','input');
 const form=t.root.querySelector('form');const elements=form.elements;
 Object.defineProperty(form,'elements',{configurable:true,get(){return new Proxy(elements,{get(target,key){if(key==='start_mode')throw new Error('Method not implemented.');const value=target[key];return typeof value==='function'?value.bind(target):value;}});}});
 t.root.querySelector('form').dispatchEvent(new t.dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.equal(t.writes.length,0);
 assert.equal(t.root.querySelector('[name="name"]').value,'Presa test');
 const details=t.root.querySelector('.sc-error-details textarea').value;
 assert.match(details,/Fase: lettura azione iniziale/);
 assert.match(details,/Traccia:\nError: Method not implemented/);
 assert.match(details,/Schedule Creator: 0.3.12/);
 assert.match(t.root.querySelector('.sc-error').textContent,/La bozza è conservata/);
 t.root.querySelector('form').dispatchEvent(new t.dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.equal(t.writes.length,1);
 assert.equal(t.root.querySelector('.sc-error-details'),null);
 }finally{t.close();}
});
test('empty schedule name is explained before any write',async()=>{
 const t=setup();try {await tick();t.click('newSchedule');t.set('name','','input');
 t.root.querySelector('form').dispatchEvent(new t.dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.equal(t.writes.length,0);
 assert.match(t.root.querySelector('.sc-error').textContent,/Inserisci un nome/);
 }finally{t.close();}
});
test('blurring the name before Save preserves the form and its submit button',async()=>{
 const t=setup();try {await tick();t.click('newSchedule');
 const form=t.root.querySelector('form');const submit=form.querySelector('[type="submit"]');
 t.set('name','Presa test','change');
 assert.equal(t.root.querySelector('form'),form);
 assert.equal(t.root.querySelector('[type="submit"]'),submit);
 assert.equal(t.card.draft.name,'Presa test');
 }finally{t.close();}
});
test('activity stays expanded as timer counts change',async()=>{
 const t=setup();try {await tick();
 const section=t.root.querySelector('.sc-operational');section.open=true;
 t.snapshot.quick_timers=[{id:'timer',entity_id:'switch.a',state:'active',expires_at:new Date(Date.now()+60000).toISOString()}];
 t.card.render();
 assert.equal(t.root.querySelector('.sc-operational').open,true);
 assert.match(t.root.querySelector('.sc-operational summary').textContent,/1 timer/);
 }finally{t.close();}
});
test('editors use one persistent dialog, preserve scroll and close on Escape',async()=>{
 const t=setup();try {await tick();
 const surface=t.root.querySelector('ha-card');const dialog=t.root.querySelector('dialog');
 for(const command of ['newProfile','newGroup','newSchedule']) {
   t.click(command);
   assert.equal(dialog.open,true);
   assert.ok(dialog.querySelector('form[data-editor]'));
   assert.equal(surface.querySelector('form'),null);
   t.set('name','Bozza','input');dialog.scrollTop=180;
   t.card.render();
   assert.equal(t.root.querySelector('dialog'),dialog);
   assert.equal(t.root.querySelector('ha-card'),surface);
   assert.equal(dialog.scrollTop,180);
   assert.equal(dialog.querySelector('[name="name"]').value,'Bozza');
   dialog.dispatchEvent(new t.dom.window.Event('cancel',{cancelable:true}));
   assert.equal(t.card.edit,null);
   assert.equal(dialog.open,false);
 }
 }finally{t.close();}
});
test('timer adapts from switch to light and climate capabilities',async()=>{
 const t=setup();try {await tick();t.click('newTimer');
 t.pick('entity_id','switch.a');assert.equal(t.root.querySelector('[name="timer_temperature"]'),null);
 t.set('entity_search','rgb','input');assert.equal(t.root.querySelector('[value="switch.a"]').closest('label').hidden,true);t.pick('entity_id','light.rgb');t.set('timer_brightness_pct','42','input');t.set('timer_color_mode','rgb');t.set('timer_color','#ff0000','input');
 assert.equal(t.root.querySelector('[data-mirror="timer_brightness_pct"]').value,'42');
 t.submit();await tick();
 assert.deepEqual(t.writes[0].action,{domain:'light',action:'turn_on',data:{brightness_pct:42,rgb_color:[255,0,0]}});
 t.click('newTimer');t.pick('entity_id','climate.room');
 assert.deepEqual([...t.root.querySelectorAll('[name="timer_mode"]')].map((n)=>n.value),['heat','cool','off']);
 assert.ok(t.root.querySelector('[name="timer_temperature"]'));
 t.pick('timer_mode','off');
 assert.equal(t.root.querySelector('[name="timer_temperature"]'),null);
 assert.equal(t.root.querySelector('[name="timer_fan_mode"]'),null);
 t.pick('timer_mode','cool');t.set('timer_temperature','23','input');t.pick('timer_fan_mode','high');
 t.submit();await tick();
 assert.deepEqual(t.writes[1].action,{domain:'climate',action:'apply_state',data:{state:'cool',temperature:23,fan_mode:'high'}});
 }finally{t.close();}
});
test('climate schedule sets a desired state at start and turns off at end',async()=>{
 const t=setup();try {await tick();
 t.snapshot.config.groups[0].entity_ids=['climate.room'];t.card.render();t.click('newSchedule');
 const temperature=t.root.querySelector('[name="start_temperature"]');
 assert.equal(temperature.min,'7');assert.equal(temperature.max,'30');
 t.pick('start_mode','cool');
 t.set('start_temperature','24','input');
 t.root.querySelector('[data-command="stepValue"][data-id="start_temperature:1"]').click();
 assert.equal(t.root.querySelector('[name="start_temperature"]').value,'24.5');
 t.root.querySelector('[data-command="stepValue"][data-id="start_temperature:-1"]').click();
 assert.equal(t.root.querySelector('[name="start_temperature"]').value,'24');
 t.pick('start_fan_mode','low');t.pick('end_mode','off');
 assert.match(t.root.querySelector('[name="name"]').value,/Freddo 24°/);
 t.submit();await tick();
 assert.equal(t.writes.length,1,t.root.textContent);
 assert.deepEqual(t.writes[0].start_action,{domain:'climate',action:'apply_state',data:{state:'cool',temperature:24,fan_mode:'low'}});
 assert.deepEqual(t.writes[0].end_action,{domain:'climate',action:'apply_state',data:{state:'off'}});
 }finally{t.close();}
});
test('existing climate set_temperature opens in the visual editor',async()=>{
 const t=setup();try {await tick();
 t.snapshot.config.groups[0].entity_ids=['climate.room'];
 t.snapshot.config.schedules=[{id:'s',profile_id:'p',group_id:'g',name:'Clima',enabled:true,target_entity_ids:['climate.room'],time_slots:[{weekdays:[0],start:'08:00',end:'09:00'}],start_action:{id:'a',domain:'climate',action:'set_temperature',data:{temperature:21,hvac_mode:'heat'}},end_action:{id:'b',domain:'climate',action:'set_hvac_mode',data:{hvac_mode:'off'}},condition:null,override_policy:'cooperative',inclusion_dates:[],exclusion_dates:[],start_notification:null,end_notification:null}];
 t.card.render();t.click('editSchedule');
 assert.equal(t.root.querySelector('[name="start_mode"]:checked').value,'heat');
 assert.equal(t.root.querySelector('[name="start_temperature"]').value,'21');
 assert.equal(t.root.querySelector('[name="end_mode"]:checked').value,'off');
 assert.equal(t.root.querySelector('[name="start_pro"]').checked,false);
 assert.equal(t.root.querySelector('[name="name"]').value,'Clima');
 }finally{t.close();}
});
test('cover schedule uses a percentage slider',async()=>{
 const t=setup();try {await tick();
 t.snapshot.config.groups[0].entity_ids=['cover.blind'];t.card.render();t.click('newSchedule');
 assert.equal(t.root.querySelector('[name="start_mode"]:checked').value,'position');
 assert.equal(t.root.querySelector('[name="start_position"]').value,'20');
 t.set('start_position','70','input');t.pick('end_mode','close');t.submit();await tick();
 assert.deepEqual(t.writes[0].start_action,{domain:'cover',action:'set_cover_position',data:{position:70}});
 assert.deepEqual(t.writes[0].end_action,{domain:'cover',action:'close_cover',data:{}});
 }finally{t.close();}
});
test('name and notification texts are suggested until the user edits them',async()=>{
 const t=setup();try {await tick();t.click('newSchedule');
 const name=()=>t.root.querySelector('[name="name"]').value;
 assert.equal(name(),'Lampada test · Accendi · Tutti i giorni 08:00–09:00');
 t.set('slot_0_start','07:30','input');
 assert.equal(name(),'Lampada test · Accendi · Tutti i giorni 07:30–09:00');
 t.set('name','Mio nome','input');t.set('slot_0_start','06:00','input');
 assert.equal(name(),'Mio nome');
 t.click('suggestName');
 assert.equal(name(),'Lampada test · Accendi · Tutti i giorni 06:00–09:00');
 t.set('start_notification_enabled',true);
 assert.equal(t.root.querySelector('[name="start_notification_message"]').value,'Lampada test: Accendi alle 06:00');
 assert.equal(t.root.querySelector('[name="start_notification_title"]').value,name());
 t.submit();await tick();
 assert.equal(t.writes[0].start_notification.message,'Lampada test: Accendi alle 06:00');
 }finally{t.close();}
});
test('version mismatch explains reload or restart',async()=>{
 const t=setup();try {await tick();
 assert.match(t.root.querySelector('.sc-warning').textContent,/Riavvia Home Assistant/);
 t.card.adapter.state={...structuredClone(t.snapshot),integration_version:'0.3.12'};t.card.render();
 assert.equal(t.root.querySelector('.sc-warning'),null);
 t.card.adapter.state.integration_version='0.4.0';t.card.render();
 assert.match(t.root.querySelector('.sc-warning').textContent,/Ricarica la pagina/);
 }finally{t.close();}
});
test('RESET requires typing RESET and sends the confirmed revision',async()=>{
 const t=setup();try {await tick();t.click('newReset');
 assert.match(t.root.querySelector('dialog').textContent,/1 profili, 1 gruppi, 0 schedule/);
 t.set('confirm','reset','input');t.submit();await tick();
 assert.equal(t.writes.length,0);assert.match(t.root.querySelector('.sc-error').textContent,/RESET in maiuscolo/);
 t.set('confirm','RESET','input');t.submit();await tick();
 assert.deepEqual(t.writes[0],{type:'schedule_creator/reset',expected_revision:3,confirm:'RESET'});
 assert.match(t.root.querySelector('.sc-notice').textContent,/RESET completato/);
 }finally{t.close();}
});
test('restore previews the backup file and imports it',async()=>{
 const t=setup();try {await tick();t.click('newRestore');
 t.submit();await tick();assert.equal(t.writes.length,0);
 const backup={format:'schedule_creator.backup',format_version:1,integration_version:'0.3.5',exported_at:'2026-09-24T10:00:00Z',config:{schema_version:1,profiles:[{id:'p2'}],groups:[{id:'g2',entity_ids:['switch.missing']}],schedules:[]}};
 await t.card.readBackupFile({files:[{text:async()=>JSON.stringify(backup)}]});
 const text=t.root.querySelector('dialog').textContent;
 assert.match(text,/1 profili · 1 gruppi · 0 schedule/);assert.match(text,/switch\.missing/);
 t.submit();await tick();
 assert.equal(t.writes[0].type,'schedule_creator/backup/import');assert.deepEqual(t.writes[0].backup,backup);
 }finally{t.close();}
});
test('profile overview explains which profiles share entities',async()=>{
 const t=setup();try {await tick();
 const state=structuredClone(t.snapshot);
 state.config.profiles.push({id:'p2',name:'Vacanza',active:false,profile_type:'exclusive',order:0});
 state.config.profiles[0].order=1;state.config.profiles[0].profile_type='shared';
 state.config.groups.push({id:'g2',profile_id:'p2',name:'Tutto',entity_ids:['switch.a']});
 const base={enabled:true,target_entity_ids:['switch.a'],time_slots:[{weekdays:[0],start:'08:00',end:'09:00'}],start_action:{domain:'switch',action:'turn_on',data:{}},end_action:null};
 state.config.schedules=[{...base,id:'s1',profile_id:'p',group_id:'g',name:'A'},{...base,id:'s2',profile_id:'p2',group_id:'g2',name:'B'}];
 t.card.adapter.state=state;t.card.render();
 assert.deepEqual([...t.root.querySelectorAll('.profile-chip')].map((n)=>n.textContent),['Vacanza','Home']);
 const overview=t.root.querySelector('.sc-overview').textContent;
 assert.match(overview,/Lampada test · (Home, Vacanza|Vacanza, Home)/);
 assert.match(overview,/Possono essere attivi insieme/);
 }finally{t.close();}
});
test('conditions start from the entity and offer fitting comparisons',async()=>{
 const t=setup();try {await tick();t.click('newSchedule');t.set('name','Condizionato','input');t.click('addSlot');
 t.click('addCondition');
 assert.equal(t.root.querySelector('[name="condition_value"]'),null);
 t.set('condition_entity_id','sensor.temperature','input');
 assert.deepEqual([...t.root.querySelectorAll('[name="condition_operator"]')].map((n)=>n.value),['numeric_greater','numeric_greater_or_equal','numeric_less','numeric_less_or_equal','numeric_range','available']);
 assert.equal(t.root.querySelector('[name="condition_hysteresis"]').value,'0.5');
 t.set('condition_value','20','input');t.pick('condition_minimum_duration_seconds','300');
 t.click('addCondition');
 assert.ok(t.root.querySelector('[name="condition.0_value"]'));
 t.set('condition.1_entity_id','switch.a','input');
 assert.deepEqual([...t.root.querySelectorAll('[name="condition.1_value"]')].map((n)=>n.value),['on','off']);
 t.pick('condition.1_value','off');t.pick('condition_operator','or');
 t.set('start_notification_enabled',true);t.set('start_notification_message','Avvio','input');
 t.submit();await tick();
 assert.equal(t.writes.length,1,t.root.querySelector('.sc-error')?.textContent);
 const c=t.writes[0].condition;
 assert.equal(c.operator,'or');
 assert.deepEqual(c.children[0],{operator:'numeric_greater',entity_id:'sensor.temperature',value:20,lower:null,upper:null,children:[],minimum_duration_seconds:300,hysteresis:0.5});
 assert.deepEqual(c.children[1],{operator:'state_equals',entity_id:'switch.a',value:'off',lower:null,upper:null,children:[],minimum_duration_seconds:null,hysteresis:null});
 assert.equal(t.writes[0].time_slots.length,2);assert.equal(t.writes[0].start_notification.message,'Avvio');
 assert.deepEqual(t.writes[0].time_slots[1],{weekdays:[0,1,2,3,4,5,6],start:'09:00',end:'10:00'});
 }finally{t.close();}
});
test('removing one of two conditions collapses the group',async()=>{
 const t=setup();try {await tick();t.click('newSchedule');t.click('addCondition');t.set('condition_entity_id','switch.a','input');t.click('addCondition');
 t.root.querySelector('[data-command="removeCondition"][data-id="condition.1"]').click();
 assert.ok(t.root.querySelector('[name="condition_entity_id"]'));assert.equal(t.card.conditionDraft.entity_id,'switch.a');
 }finally{t.close();}
});
test('day shortcuts, snap and time bar with other schedules as magnets',async()=>{
 const t=setup();try {await tick();
 const other={id:'o',profile_id:'p',group_id:'g',name:'Mattina',enabled:true,target_entity_ids:['switch.a'],time_slots:[{weekdays:[0,1,2,3,4],start:'06:00',end:'07:30'}],start_action:{domain:'switch',action:'turn_on',data:{}},end_action:null,condition:null};
 t.card.adapter.state={...structuredClone(t.snapshot),config:{...structuredClone(t.snapshot.config),schedules:[other]}};t.card.render();
 t.click('newSchedule');
 t.root.querySelector('[data-command="slotDays"][data-id="0:weekend"]').click();
 assert.deepEqual([...t.root.querySelectorAll('[name="slot_0_days"]:checked')].map((n)=>n.value),['5','6']);
 assert.equal(t.root.querySelectorAll('.sc-tb-bg').length,0);
 t.root.querySelector('[data-command="slotDays"][data-id="0:workdays"]').click();
 const bar=t.root.querySelector('.sc-timebar');
 assert.equal(t.root.querySelectorAll('.sc-tb-bg').length,1);
 assert.equal(bar.dataset.magnets,'360,450');
 t.root.querySelector('[data-command="setSnap"][data-id="30"]').click();
 assert.equal(t.root.querySelector('.sc-timebar').dataset.snap,'30');
 t.set('slot_0_start','07:00','input');
 assert.equal(t.root.querySelector('.sc-tb-label').textContent,'07:00–09:00');
 }finally{t.close();}
});
test('magnet snap prefers nearby schedule edges over the grid',async()=>{
 const {magnetSnap}=await import('../src/schedule-editor.js');
 assert.equal(magnetSnap(452,[450],20,15),450);
 assert.equal(magnetSnap(500,[450],20,15),495);
});
test('group icon and colour are chosen from lists',async()=>{
 const t=setup();try {await tick();t.click('newGroup');t.set('name','Camera','input');
 t.pick('icon','mdi:bed');t.pick('color','#43a047');
 t.root.querySelector('[name="entities"][value="switch.a"]').checked=true;
 t.submit();await tick();
 assert.equal(t.writes[0].icon,'mdi:bed');assert.equal(t.writes[0].color,'#43a047');
 t.click('newGroup');t.set('name','Altro','input');
 const custom=t.root.querySelector('[data-color-custom]');custom.value='#123456';custom.dispatchEvent(new t.dom.window.Event('input',{bubbles:true}));
 t.submit();await tick();
 assert.equal(t.writes[1].color,'#123456');assert.equal(t.writes[1].icon,null);
 }finally{t.close();}
});
test('status notification and tap target are configured from the schedule editor',async()=>{
 const t=setup();try {await tick();t.click('newSchedule');
 t.set('status_notification',true);
 t.submit();await tick();
 assert.equal(t.writes[0].status_notification,true);
 t.click('newSchedule');
 const link=t.root.querySelector('[data-command="setNotificationUrl"]');
 assert.equal(link.dataset.id,'/lovelace/casa');link.click();await tick();
 assert.deepEqual(t.writes[1],{type:'schedule_creator/settings/update',expected_revision:3,notification_url:'/lovelace/casa'});
 }finally{t.close();}
});
test('renaming preserves opaque action data, draft revision and open options',async()=>{
 const t=setup();try {await tick();
 t.snapshot.config.groups[0].entity_ids=['light.rgb'];
 t.snapshot.config.schedules=[{id:'s',profile_id:'p',group_id:'g',name:'Light',enabled:true,target_entity_ids:['light.rgb'],time_slots:[{weekdays:[2],start:'12:00',end:'12:10'}],start_action:{id:'a',domain:'light',action:'turn_on',data:{brightness:137,transition:3}},end_action:null,condition:null,override_policy:'cooperative',inclusion_dates:[],exclusion_dates:[],start_notification:null,end_notification:null}];
 t.card.render();t.click('editSchedule');
 const options=t.root.querySelector('details[data-section="row-conditions"]');options.open=true;
 t.set('name','Renamed','input');t.snapshot.revision=9;t.card.render();
 assert.equal(t.root.querySelector('details[data-section="row-conditions"]').open,true);
 t.root.querySelector('form').dispatchEvent(new t.dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.equal(t.writes[0].expected_revision,3);assert.equal(t.writes[0].name,'Renamed');
 assert.equal('start_action' in t.writes[0],false);
 }finally{t.close();}
});
test('agenda view: today column, now line, running tile and summaries',async()=>{
 const t=setup();try {await tick();
 const {haNow,temperatureColor}=await import('../src/schedule-creator-card.js').catch(()=>({}));
 const now=new Date();const day=(now.getDay()+6)%7;
 const hh=(m)=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
 const minutes=now.getHours()*60+now.getMinutes();
 const s={id:'c',profile_id:'p',group_id:'g',name:'AC',enabled:true,target_entity_ids:['climate.room'],time_slots:[{weekdays:[day],start:hh(Math.max(0,minutes-30)),end:hh(Math.min(1439,minutes+30))}],start_action:{domain:'climate',action:'apply_state',data:{state:'cool',temperature:23}},end_action:{domain:'climate',action:'apply_state',data:{state:'off'}},condition:{operator:'state_equals',entity_id:'switch.a',value:'off',children:[]}};
 const st=structuredClone(t.snapshot);st.config.groups[0].entity_ids=['climate.room'];st.config.schedules=[s];
 st.operational={occurrences:[{id:'o',schedule_id:'c',state:'active',condition_branch:'true',end_utc:new Date(Date.now()+1800000).toISOString()}],leases:[]};
 t.hass.config.time_zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
 t.card.adapter.state=st;t.card.render();
 assert.match(t.root.querySelector('.sc-now-tile.is-running').textContent,/Freddo 23°/);
 assert.ok(t.root.querySelector('.sc-day-track.is-today .sc-now-line'));
 assert.ok(t.root.querySelector('.sc-day-track.is-today .sc-time-block.is-running'));
 assert.match(t.root.querySelector('.sc-sub').textContent,/1 fascia in corso/);
 st.operational.occurrences[0].condition_branch='false';t.card.render();
 assert.match(t.root.querySelector('.sc-now-tile.is-paused').textContent,/condizione non è soddisfatta/);
 t.click('editSchedule');
 assert.match(t.root.querySelector('[data-section="row-end"] summary').textContent,/Spento/);
 assert.match(t.root.querySelector('[data-section="row-conditions"] summary').textContent,/Lampada test/);
 assert.equal(t.root.querySelector('.sc-save').textContent,'Salva schedule');
 }finally{t.close();}
});
test('condition release delay is offered and saved',async()=>{
 const t=setup();try {await tick();t.click('newSchedule');t.click('addCondition');
 t.set('condition_entity_id','sensor.temperature','input');t.set('condition_value','500','input');
 t.pick('condition_minimum_duration_seconds','600');t.pick('condition_release_delay_seconds','900');
 t.submit();await tick();
 assert.equal(t.writes[0].condition.release_delay_seconds,900);
 assert.equal(t.writes[0].condition.minimum_duration_seconds,600);
 }finally{t.close();}
});
test('clicking free calendar space or the empty state starts a new schedule',async()=>{
 const t=setup();try {await tick();
 t.root.querySelector('button.sc-empty').click();
 assert.equal(t.card.edit[0],'schedule');t.card.closeEditor();
 const st=structuredClone(t.snapshot);st.config.schedules=[{id:'s',profile_id:'p',group_id:'g',name:'S',enabled:true,target_entity_ids:['switch.a'],time_slots:[{weekdays:[0],start:'06:00',end:'07:00'}],start_action:{domain:'switch',action:'turn_on',data:{}},end_action:null,condition:null}];
 t.card.adapter.state=st;t.card.render();
 const track=t.root.querySelector('.sc-day-track[data-day="2"]');
 track.getBoundingClientRect=()=>({top:0,height:480,left:0,width:60});
 track.dispatchEvent(new t.dom.window.MouseEvent('click',{bubbles:true,clientY:290}));
 assert.equal(t.card.edit[0],'schedule');
 assert.deepEqual(JSON.parse(JSON.stringify(t.card.slotDraft)),[{weekdays:[2],start:'14:30',end:'15:30'}]);
 assert.equal(t.root.querySelector('[name="slot_0_start"]').value,'14:30');
 }finally{t.close();}
});
