import { DataSource } from 'typeorm';
import { runSeeders } from 'typeorm-extension';
import { seederOptions } from '../data-source';

async function main() {
  console.log('🚀 Starting seeders...');

  // Create DataSource with seeder options
  const dataSource = new DataSource(seederOptions);
  await dataSource.initialize();

  // Run seeders with the configured options
  await runSeeders(dataSource);

  await dataSource.destroy();
  console.log('✅ Seeding finished!');
}

main().catch((err) => {
  console.error('❌ Error running seeders:', err);
  process.exit(1);
});
