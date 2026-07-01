// backend/db/init.js
/**
 * Simple DB initialization for the SELIDIKI backend.
 * Creates the required SQLite tables if they do not exist.
 */
const knex = require('./knex');
const path = require('path');
const fs = require('fs');

async function ensureDataDir() {
  const dataDir = path.resolve(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

async function createTables() {
  // phone_nodes
  const hasPhone = await knex.schema.hasTable('phone_nodes');
  if (!hasPhone) {
    await knex.schema.createTable('phone_nodes', (table) => {
      table.increments('id').primary();
      table.string('phone_hash').unique().notNullable();
      table.string('country_code');
      table.integer('risk_score').defaultTo(0);
      table.integer('report_count').defaultTo(0);
      table.timestamp('last_seen').defaultTo(knex.fn.now());
      table.string('status').defaultTo('active');
    });
  }

  // fraud_reports
  const hasReports = await knex.schema.hasTable('fraud_reports');
  if (!hasReports) {
    await knex.schema.createTable('fraud_reports', (table) => {
      table.increments('id').primary();
      table.string('reporter_id').notNullable();
      table.string('target_hash').notNullable();
      table.string('target_type').notNullable();
      table.string('category').notNullable();
      table.text('evidence');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index(['target_hash', 'created_at']);
    });
  }

  // risk_scores
  const hasRisk = await knex.schema.hasTable('risk_scores');
  if (!hasRisk) {
    await knex.schema.createTable('risk_scores', (table) => {
      table.increments('id').primary();
      table.string('entity_id').notNullable();
      table.string('entity_type').notNullable();
      table.integer('score').notNullable();
      table.text('factors'); // JSON string
      table.float('confidence').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index(['entity_id', 'entity_type']);
    });
  }
}

async function main() {
  try {
    await ensureDataDir();
    await createTables();
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Error during DB init:', err);
    process.exit(1);
  } finally {
    await knex.destroy();
  }
}

main();
