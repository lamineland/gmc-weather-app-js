// OS task simulation: computes every result used in the report and generates report.html
const fs = require('fs');

// ---------- Part 1: scheduling ----------
const procs = [{ id: 'P1', arrival: 0, burst: 5 }, { id: 'P2', arrival: 1, burst: 3 }, { id: 'P3', arrival: 2, burst: 1 }];

function fcfs(ps) {
  let t = 0; const gantt = [];
  [...ps].sort((a, b) => a.arrival - b.arrival).forEach((p) => {
    t = Math.max(t, p.arrival); gantt.push({ id: p.id, start: t, end: t + p.burst }); t += p.burst;
  });
  return gantt;
}

function roundRobin(ps, q) {
  const rem = Object.fromEntries(ps.map((p) => [p.id, p.burst]));
  const pending = [...ps].sort((a, b) => a.arrival - b.arrival);
  const queue = []; const gantt = []; let t = 0;
  const admit = () => { while (pending.length && pending[0].arrival <= t) queue.push(pending.shift().id); };
  admit();
  while (queue.length || pending.length) {
    if (!queue.length) { t = pending[0].arrival; admit(); }
    const id = queue.shift(); const run = Math.min(q, rem[id]);
    gantt.push({ id, start: t, end: t + run }); t += run; rem[id] -= run;
    admit(); // new arrivals join before the preempted process
    if (rem[id] > 0) queue.push(id);
  }
  return gantt;
}

function metrics(gantt, ps) {
  return ps.map((p) => {
    const slices = gantt.filter((g) => g.id === p.id);
    const completion = slices[slices.length - 1].end;
    const turnaround = completion - p.arrival;
    return { ...p, completion, turnaround, waiting: turnaround - p.burst, response: slices[0].start - p.arrival };
  });
}
const avg = (rows, k) => rows.reduce((s, r) => s + r[k], 0) / rows.length;

// ---------- Part 3: paging ----------
function paging(refs, frames, policy) {
  const mem = []; const lastUse = {}; const steps = []; let faults = 0;
  refs.forEach((page, t) => {
    let fault = false, evicted = null;
    if (!mem.includes(page)) {
      fault = true; faults++;
      if (mem.length < frames) mem.push(page);
      else {
        const victimIdx = policy === 'FIFO' ? 0 : mem.reduce((best, p, i) => (lastUse[p] < lastUse[mem[best]] ? i : best), 0);
        evicted = mem[victimIdx];
        if (policy === 'FIFO') { mem.shift(); mem.push(page); } else mem[victimIdx] = page;
      }
    }
    lastUse[page] = t;
    steps.push({ page, frames: [...mem], fault, evicted });
  });
  return { steps, faults };
}

// ---------- Part 4: disk ----------
function diskFCFS(head, reqs) { return [head, ...reqs]; }
function diskSSTF(head, reqs) {
  const left = [...reqs]; const order = [head]; let cur = head;
  while (left.length) {
    let i = 0; left.forEach((r, j) => { if (Math.abs(r - cur) < Math.abs(left[i] - cur)) i = j; });
    cur = left.splice(i, 1)[0]; order.push(cur);
  }
  return order;
}
const movement = (order) => order.slice(1).reduce((s, r, i) => s + Math.abs(r - order[i]), 0);

const results = {
  fcfs: fcfs(procs), rr: roundRobin(procs, 2),
  fifo: paging([1, 2, 3, 2, 4, 1, 5], 3, 'FIFO'), lru: paging([1, 2, 3, 2, 4, 1, 5], 3, 'LRU'),
  dFcfs: diskFCFS(53, [98, 183, 37, 122, 14, 124, 65, 67]), dSstf: diskSSTF(53, [98, 183, 37, 122, 14, 124, 65, 67]),
};
results.fcfsM = metrics(results.fcfs, procs); results.rrM = metrics(results.rr, procs);

if (require.main === module) {
  console.log('FCFS', results.fcfs.map((g) => `${g.id}[${g.start}-${g.end}]`).join(' '), 'avgW', avg(results.fcfsM, 'waiting'), 'avgR', avg(results.fcfsM, 'response'));
  console.log('RR  ', results.rr.map((g) => `${g.id}[${g.start}-${g.end}]`).join(' '), 'avgW', avg(results.rrM, 'waiting'), 'avgR', avg(results.rrM, 'response'));
  console.log('FIFO faults', results.fifo.faults, 'LRU faults', results.lru.faults);
  console.log('Disk FCFS', results.dFcfs.join('→'), movement(results.dFcfs));
  console.log('Disk SSTF', results.dSstf.join('→'), movement(results.dSstf));
}
module.exports = { results, avg, movement };
