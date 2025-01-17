import { migrate } from './migrations';

async function runMigration() {
  try {
    await migrate();
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 