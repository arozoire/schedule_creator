// Weekly wall-clock projection; execution and date exceptions remain server-side.
export function weeklySegments(schedules) {
  const days = Array.from({length:7},()=>[]);
  const minutes = value => {const [h,m]=value.split(':').map(Number);return h*60+m;};
  for(const schedule of schedules) for(const slot of schedule.time_slots || []) {
    const start=minutes(slot.start),end=minutes(slot.end);
    for(const day of slot.weekdays) {
      if(end>start) days[day].push({schedule,start,end});
      else {
        days[day].push({schedule,start,end:1440});
        if(end>0) days[(day+1)%7].push({schedule,start:0,end});
      }
    }
  }
  for(const day of days) {
    day.sort((a,b)=>a.start-b.start || b.end-a.end);
    let cluster=[],ends=[];
    const finish=()=>{for(const segment of cluster) segment.lanes=ends.length;cluster=[];ends=[];};
    for(const segment of day) {
      if(cluster.length && ends.every(end=>end<=segment.start)) finish();
      let lane=ends.findIndex(end=>end<=segment.start);
      if(lane<0) lane=ends.length;
      ends[lane]=segment.end;segment.lane=lane;cluster.push(segment);
    }
    finish();
  }
  return days;
}
