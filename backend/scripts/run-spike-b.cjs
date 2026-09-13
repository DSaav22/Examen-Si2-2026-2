const { spawnSync } = require('child_process');

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://ensayar:ensayar@localhost:5432/ensayar?schema=public';
}

console.log('Spike B — migrate + seed + carrera de última unidad');
run('npx', ['prisma', 'migrate', 'deploy']);
run('npx', ['prisma', 'db', 'seed']);
process.env.SPIKE_B = '1';
run('npx', ['jest', 'src/ventas/ventas.spike-b.spec.ts', '--runInBand']);
