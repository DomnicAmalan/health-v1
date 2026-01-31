#!/usr/bin/env node

import { spawn } from 'child_process';
import readline from 'readline';

const apps = [
  { name: 'RustyVault UI (port 8215)', value: 'dev:vault' },
  { name: 'Admin Dashboard (port 4111)', value: 'dev:admin' },
  { name: 'Client Application (port 4115)', value: 'dev:client' },
  { name: 'All Apps (parallel)', value: 'dev:all' },
  { name: 'Shared Libraries Only', value: 'dev:libs' },
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('\n🚀 Health V1 Development Server\n');
console.log('Which app do you want to develop?\n');

apps.forEach((app, index) => {
  console.log(`  ${index + 1}. ${app.name}`);
});

console.log('');

rl.question('Enter your choice (1-5): ', (answer) => {
  const choice = parseInt(answer, 10) - 1;

  if (choice >= 0 && choice < apps.length) {
    const selectedApp = apps[choice];
    console.log(`\n🚀 Starting: bun run ${selectedApp.value}\n`);

    const proc = spawn('bun', ['run', selectedApp.value], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd(),
    });

    proc.on('exit', (code) => {
      rl.close();
      process.exit(code || 0);
    });

    proc.on('error', (err) => {
      console.error('Failed to start dev server:', err);
      rl.close();
      process.exit(1);
    });
  } else {
    console.log('\n❌ Invalid choice. Please run the command again.\n');
    rl.close();
    process.exit(1);
  }
});
