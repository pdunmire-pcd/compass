import mysql from 'mysql2/promise'

// Server-only MySQL connection pool.
// Never expose DB credentials to the browser.
if (!process.env.DB_HOST) throw new Error('Missing DB_HOST')
if (!process.env.DB_USER) throw new Error('Missing DB_USER')
if (!process.env.DB_PASSWORD) throw new Error('Missing DB_PASSWORD')
if (!process.env.DB_NAME) throw new Error('Missing DB_NAME')

export const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
})
