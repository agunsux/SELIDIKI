// db/migrate.js
const fs = require('fs');
const path = require('path');
const db = require('../utils/db');

async function run() {
  console.log('🏁 Running PostgreSQL database migrations...');
  const migrationsDir = path.resolve(__dirname, 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations folder found.');
    process.exit(0);
  }

  const files = fs.readdirSync(migrationsDir).sort();
  
  for (const file of files) {
    if (file.endsWith('.sql')) {
      console.log(`Executing migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      try {
        await db.query(sql);
        console.log(`✅ Success: ${file}`);
      } catch (err) {
        console.error(`❌ FAILED executing migration ${file}:`, err.message);
        process.exit(1);
      }
    }
  }
  console.log('🎉 All PostgreSQL migrations completed successfully!');
  process.exit(0);
}

run();
