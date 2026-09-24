import assert from 'node:assert/strict';
import {test} from 'node:test';
import {weeklySegments} from '../src/timeline.js';
const schedule=(id,start,end,weekdays)=>({id,time_slots:[{start,end,weekdays}]});
test('overnight Sunday spans wrap to Monday without a negative duration',()=>{
  const days=weeklySegments([schedule('night','23:00','02:00',[6])]);
  assert.deepEqual(days[6].map(({start,end})=>[start,end]),[[1380,1440]]);
  assert.deepEqual(days[0].map(({start,end})=>[start,end]),[[0,120]]);
  assert.equal(days[1].length,0);
  assert.equal(weeklySegments([schedule('midnight','22:00','00:00',[0])])[1].length,0);
});
test('overlapping spans get separate lanes and adjacent spans reuse full width',()=>{
  const [day]=weeklySegments([schedule('a','08:00','10:00',[0]),schedule('b','09:00','11:00',[0]),schedule('c','11:00','12:00',[0])]);
  assert.deepEqual(day.map(({lane,lanes})=>[lane,lanes]),[[0,2],[1,2],[0,1]]);
});
