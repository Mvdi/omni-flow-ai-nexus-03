#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const file = path.resolve(__dirname, 'tasks.json');
const OPENAI_KEY = process.env.OPENAI_API_KEY;
let inquirer = null;
try {
  inquirer = require('inquirer').default || require('inquirer');
} catch (e) {
  inquirer = require('inquirer');
}

function load() {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function save(tasks) {
  fs.writeFileSync(file, JSON.stringify(tasks, null, 2));
}

async function aiSort(tasks) {
  if (!OPENAI_KEY) {
    console.error('Set OPENAI_API_KEY in your environment.');
    process.exit(1);
  }
  const prompt = `Sortér og grupper følgende opgaver i logisk rækkefølge og grupper, og tilføj prioritet (1=høj, 2=middel, 3=lav). Returnér som JSON array med: text, priority, group.\n\nOpgaver:\n${tasks.map(t => t.text).join('\n')}`;
  const res = await axios.post('https://api.openai.com/v1/chat/completions', {
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 512,
    temperature: 0.2
  }, {
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}` }
  });
  try {
    const json = JSON.parse(res.data.choices[0].message.content);
    return json.map((t, i) => ({ ...t, done: false, id: i+1 }));
  } catch (e) {
    console.error('AI kunne ikke parse output:', res.data.choices[0].message.content);
    process.exit(1);
  }
}

async function aiSortBatched(tasks, batchSize = 10) {
  let allSorted = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    try {
      const sorted = await aiSort(batch);
      allSorted = allSorted.concat(sorted);
    } catch (e) {
      console.error('AI fejl i batch', i / batchSize + 1, ':', e.message);
      // Gem rå batch hvis fejl
      fs.writeFileSync('failed_brainstorm_batch.json', JSON.stringify(batch, null, 2));
      console.error('Batch gemt i failed_brainstorm_batch.json');
      throw e;
    }
  }
  return allSorted;
}

const [,, cmd, ...args] = process.argv;
let tasks = load();

async function main() {
  if (cmd === 'add') {
    tasks.push({ text: args.join(' '), done: false, priority: 2, group: 'Diverse', id: tasks.length+1 });
    save(tasks);
    console.log('Task added.');
  } else if (cmd === 'brainstorm') {
    const brainstorm = args.join(' ');
    const brainstormTasks = brainstorm.split(/[.\n;]/).map(s => s.trim()).filter(Boolean).map(text => ({ text }));
    const sorted = await aiSort(brainstormTasks);
    tasks = tasks.concat(sorted);
    save(tasks);
    console.log('Brainstorm tilføjet og AI-sorteret!');
  } else if (cmd === 'sort') {
    const sorted = await aiSort(tasks.filter(t => !t.done));
    // Bevar done-tasks bagerst
    const done = tasks.filter(t => t.done);
    tasks = sorted.concat(done);
    save(tasks);
    console.log('Tasks AI-sorteret!');
  } else if (cmd === 'list') {
    tasks.forEach((t, i) => {
      console.log(`${t.done ? '[x]' : '[ ]'} ${t.text} (Prio: ${t.priority || 2}, Gruppe: ${t.group || 'Diverse'})`);
    });
  } else if (cmd === 'done') {
    const idx = parseInt(args[0], 10) - 1;
    if (tasks[idx]) { tasks[idx].done = true; save(tasks); }
    console.log('Task marked as done.');
  } else if (cmd === 'remove') {
    const idx = parseInt(args[0], 10) - 1;
    if (tasks[idx]) { tasks.splice(idx, 1); save(tasks); }
    console.log('Task removed.');
  } else if (cmd === 'next') {
    const next = tasks.find(t => !t.done);
    if (next) console.log('Next task:', next.text);
    else console.log('No tasks left!');
  } else {
    console.log('Usage: taskmaster add|brainstorm|list|done|remove|next|sort');
    console.log('Eksempler:');
    console.log('  taskmaster brainstorm "Byg login. Lav AI scoring. Forbind support tickets."');
    console.log('  taskmaster add "Implementer rapportering"');
    console.log('  taskmaster list');
    console.log('  taskmaster done 2');
    console.log('  taskmaster sort');
  }
}

async function interactivePrompt() {
  while (true) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Hvad vil du gøre?',
        choices: [
          { name: 'Brainstorm (AI opdeler og prioriterer)', value: 'brainstorm' },
          { name: 'Tilføj enkelt opgave', value: 'add' },
          { name: 'Se taskliste', value: 'list' },
          { name: 'Marker task som færdig', value: 'done' },
          { name: 'Se næste task', value: 'next' },
          { name: 'AI-sortér tasks', value: 'sort' },
          { name: 'Afslut', value: 'exit' }
        ]
      }
    ]);
    if (action === 'exit') break;
    if (action === 'brainstorm') {
      const { brainstorm } = await inquirer.prompt([
        { type: 'input', name: 'brainstorm', message: 'Skriv dine ideer/opgaver (adskil med punktum eller linjeskift):' }
      ]);
      const brainstormTasks = brainstorm.split(/[.\n;]/).map(s => s.trim()).filter(Boolean).map(text => ({ text }));
      if (brainstormTasks.length > 10) {
        console.log(`Lang brainstorm! Deler op i ${Math.ceil(brainstormTasks.length/10)} AI-kald...`);
      }
      try {
        const sorted = await aiSortBatched(brainstormTasks, 10);
        tasks = tasks.concat(sorted);
        save(tasks);
        console.log('Brainstorm tilføjet og AI-sorteret!');
      } catch (e) {
        console.error('Kunne ikke AI-sortere hele brainstormen. Se failed_brainstorm_batch.json for dine opgaver.');
      }
    } else if (action === 'add') {
      const { text } = await inquirer.prompt([
        { type: 'input', name: 'text', message: 'Skriv opgaven:' }
      ]);
      tasks.push({ text, done: false, priority: 2, group: 'Diverse', id: tasks.length+1 });
      save(tasks);
      console.log('Task added.');
    } else if (action === 'list') {
      if (tasks.length === 0) console.log('Ingen tasks endnu.');
      tasks.forEach((t, i) => {
        console.log(`${i+1}. ${t.done ? '[x]' : '[ ]'} ${t.text} (Prio: ${t.priority || 2}, Gruppe: ${t.group || 'Diverse'})`);
      });
    } else if (action === 'done') {
      if (tasks.length === 0) { console.log('Ingen tasks.'); continue; }
      const { idx } = await inquirer.prompt([
        { type: 'input', name: 'idx', message: 'Task-nummer der er færdig:' }
      ]);
      const i = parseInt(idx, 10) - 1;
      if (tasks[i]) { tasks[i].done = true; save(tasks); console.log('Task marked as done.'); }
      else console.log('Ugyldigt nummer.');
    } else if (action === 'next') {
      const next = tasks.find(t => !t.done);
      if (next) console.log('Next task:', next.text);
      else console.log('No tasks left!');
    } else if (action === 'sort') {
      const sorted = await aiSort(tasks.filter(t => !t.done));
      const done = tasks.filter(t => t.done);
      tasks = sorted.concat(done);
      save(tasks);
      console.log('Tasks AI-sorteret!');
    }
    console.log();
  }
}

function showBanner() {
  console.log(`\n\x1b[36m
████████╗ █████╗ ███████╗██╗  ██╗    ███╗   ███╗ █████╗ ███████╗████████╗███████╗██████╗     █████╗ ██╗
╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝    ████╗ ████║██╔══██╗██╔════╝╚══██╔══╝██╔════╝██╔══██╗   ██╔══██╗██║
   ██║   ███████║███████╗█████╔╝     ██╔████╔██║███████║███████╗   ██║   █████╗  ██████╔╝   ███████║██║
   ██║   ██╔══██║╚════██║██╔═██╗     ██║╚██╔╝██║██╔══██║╚════██║   ██║   ██╔══╝  ██╔══██╗   ██╔══██║██║
   ██║   ██║  ██║███████║██║  ██╗    ██║ ╚═╝ ██║██║  ██║███████║   ██║   ███████╗██║  ██║██╗██║  ██║███████╗
   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝    ╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚══════╝
\x1b[0m`);
  console.log('by https://github.com/eyaltoledano/claude-task-master\n');
  console.log('\x1b[1mAI Task Manager\x1b[0m - Skriv, prioriter og eksekver dine opgaver med AI.\n');
  console.log('Vælg en handling i menuen, eller brug kommandoer som "add", "brainstorm", "list" osv.\n');
}

if (!cmd) {
  showBanner();
  interactivePrompt();
} else {
  main();
} 