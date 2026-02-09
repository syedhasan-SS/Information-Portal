import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTable() {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync('./create-attendance-table.sql', 'utf8');
    console.log('Executing SQL...');
    const result = await client.query(sql);
    console.log('✅ Table created successfully!');
    console.log(result);
  } catch (error) {
    console.error('❌ Error creating table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTable();
