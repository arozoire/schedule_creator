import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
const bundle = readFileSync(new URL('../../custom_components/schedule_creator/frontend/schedule-creator-card.js',import.meta.url),'utf8');
const tick=()=>new Promise((r)=>setImmediate(r));
const services={switch:{turn_on:{},turn_off:{}},light:{turn_on:{},turn_off:{}},climate:{set_temperature:{},set_hvac_mode:{},set_fan_mode:{}},fan:{turn_on:{},turn_off:{},set_percentage:{},set_preset_mode:{}},automation:{trigger:{}},update:{install:{}}};
function setup() {
  const dom=new JSDOM('<body></body>',{runScripts:'dangerously',virtualConsole:new VirtualConsole()});
  dom.window.structuredClone=structuredClone;
  dom.window.confirm=()=>true;
  dom.window.eval(bundle);
  const states=Object.fromEntries([
    ['switch.a',{friendly_name:'Lampada test'}],['switch.outside',{friendly_name:'Fuori gruppo'}],['sensor.temperature',{}],['automation.test',{}],['update.test',{}],
    ['light.rgb',{supported_color_modes:['rgb','color_temp'],min_color_temp_kelvin:2000,max_color_temp_kelvin:6500}],
    ['climate.room',{hvac_modes:['heat','cool','off'],fan_modes:['low','high'],supported_features:9,min_temp:7,max_temp:30}],
    ['fan.room',{supported_features:9,preset_modes:['eco']}],
  ].map(([id,attributes])=>[id,{entity_id:id,attributes,state:'off'}]));
  const snapshot={revision:3,config:{profiles:[{id:'p',name:'Home',active:true}],groups:[{id:'g',profile_id:'p',name:'Room',entity_ids:['switch.a']}],schedules:[]},runtime_summary:{revision:6},quick_timers:[],operational:{}};
  const writes=[];
  const hass={user:{is_admin:true},states,services,config:{time_zone:'Europe/Rome'},connection:{subscribeMessage:()=>Promise.resolve(()=>{}),sendMessagePromise:(msg)=>{if(msg.type.endsWith('get_state'))return Promise.resolve(snapshot);writes.push(JSON.parse(JSON.stringify(msg)));return Promise.resolve({revision:4});}}};
  const card=dom.window.document.createElement('schedule-creator-card');card.setConfig({});card.hass=hass;dom.window.document.body.append(card);
  const root=card.shadowRoot;
  const click=(name)=>root.querySelector(`[data-command="${name}"]`).click();
  const set=(name,value,event='change')=>{const node=root.querySelector(`[name="${name}"]`);assert.ok(node,`missing ${name}`);if(node.type==='checkbox')node.checked=value;else node.value=value;node.dispatchEvent(new dom.window.Event(event,{bubbles:true}));};
  return {dom,card,hass,snapshot,writes,root,click,set,close:()=>{card.remove();dom.window.close();}};
}
test('group lists controllable entities and search really hides nonmatches',async()=>{
 const t=setup();try {await tick();t.click('newGroup');
 assert.equal(t.root.querySelector('[name="entities"][value="sensor.temperature"]'),null);
 assert.equal(t.root.querySelector('[name="entities"][value="automation.test"]'),null);
 assert.equal(t.root.querySelector('[name="entities"][value="update.test"]'),null);
 assert.equal(t.root.querySelector('.sc-version').textContent,'v0.3.0');
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
test('schedule only offers group members and sends ON/OFF without temperature or JSON',async()=>{
 const t=setup();try {await tick();t.click('newSchedule');
 assert.deepEqual([...t.root.querySelectorAll('[name="entities"]')].map((n)=>n.value),['switch.a']);
 assert.equal(t.root.querySelector('[name="start_temperature"]'),null);
 t.set('name','Test','input');t.set('end_command','turn_off');
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
 assert.match(alert,/schedule_creator\/schedule\/create/);
 assert.match(alert,/riavvia completamente Home Assistant/);
 assert.ok(t.root.querySelector('form[data-editor]'));
 assert.equal(t.root.querySelector('[name="name"]').value,'Test');
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
test('timer adapts from switch to light and climate capabilities',async()=>{
 const t=setup();try {await tick();t.click('newTimer');
 t.set('entity_id','switch.a');assert.equal(t.root.querySelector('[name="timer_temperature"]'),null);
 t.set('entity_id','light.rgb');t.set('timer_brightness_pct','42','input');t.set('timer_color_mode','rgb');t.set('timer_color','#ff0000','input');
 t.root.querySelector('form').dispatchEvent(new t.dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.deepEqual(t.writes[0].action,{domain:'light',action:'turn_on',data:{brightness_pct:42,rgb_color:[255,0,0]}});
 t.click('newTimer');t.set('entity_id','climate.room');t.set('timer_command','set_hvac_mode');
 assert.deepEqual([...t.root.querySelector('[name="timer_hvac_mode"]').options].map((n)=>n.value),['heat','cool','off']);
 assert.equal(t.root.querySelector('[name="timer_temperature"]'),null);
 t.set('timer_command','set_fan_mode');t.set('timer_fan_mode','high');
 t.root.querySelector('form').dispatchEvent(new t.dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.deepEqual(t.writes[1].action,{domain:'climate',action:'set_fan_mode',data:{fan_mode:'high'}});
 }finally{t.close();}
});
test('condition tree, multiple slots and notifications can be saved using controls',async()=>{
 const t=setup();try {await tick();t.click('newSchedule');t.set('name','Condizionato','input');t.click('addSlot');
 t.click('addCondition');t.set('condition_operator','and');
 t.set('condition.0_entity_id','sensor.temperature');t.set('condition.0_operator','numeric_greater');t.set('condition.0_value','20','input');
 t.set('condition.1_entity_id','switch.a');t.set('condition.1_operator','state_equals');t.set('condition.1_value','off','input');
 t.set('start_notification_enabled',true);t.set('start_notification_message','Avvio','input');
 t.root.querySelector('form').dispatchEvent(new t.dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.equal(t.writes.length,1,t.root.textContent);assert.equal(t.writes[0].condition.children[0].value,20);
 assert.equal(t.writes[0].time_slots.length,2);assert.equal(t.writes[0].start_notification.message,'Avvio');
 }finally{t.close();}
});
test('renaming preserves opaque action data, draft revision and open options',async()=>{
 const t=setup();try {await tick();
 t.snapshot.config.groups[0].entity_ids=['light.rgb'];
 t.snapshot.config.schedules=[{id:'s',profile_id:'p',group_id:'g',name:'Light',enabled:true,target_entity_ids:['light.rgb'],time_slots:[{weekdays:[2],start:'12:00',end:'12:10'}],start_action:{id:'a',domain:'light',action:'turn_on',data:{brightness:137,transition:3}},end_action:null,condition:null,override_policy:'cooperative',inclusion_dates:[],exclusion_dates:[],start_notification:null,end_notification:null}];
 t.card.render();t.click('editSchedule');
 const options=[...t.root.querySelectorAll('details')].find((x)=>x.querySelector('summary').textContent==='Condizioni e opzioni');options.open=true;
 t.set('name','Renamed','input');t.snapshot.revision=9;t.card.render();
 assert.equal([...t.root.querySelectorAll('details')].find((x)=>x.querySelector('summary').textContent==='Condizioni e opzioni').open,true);
 t.root.querySelector('form').dispatchEvent(new t.dom.window.Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.equal(t.writes[0].expected_revision,3);assert.equal(t.writes[0].name,'Renamed');
 assert.equal('start_action' in t.writes[0],false);
 }finally{t.close();}
});
