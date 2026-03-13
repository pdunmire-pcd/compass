-- Run these commands in MySQL after creating your database.
-- You can run this file directly: mysql -u root -p compass < schema.sql

CREATE DATABASE IF NOT EXISTS compass;
USE compass;

-- Messages table: stores the full conversation history
CREATE TABLE IF NOT EXISTS messages (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  session_id      VARCHAR(36)  NOT NULL,
  role            ENUM('user', 'assistant') NOT NULL,
  content         TEXT         NOT NULL,
  display_content TEXT,
  created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_created (session_id, created_at)
);

-- Deadlines table: stores extracted tasks and due dates
CREATE TABLE IF NOT EXISTS deadlines (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  session_id  VARCHAR(36)  NOT NULL,
  task        VARCHAR(255) NOT NULL,
  due_date    DATE         NOT NULL,
  raw_date    VARCHAR(100),
  completed   TINYINT(1)   DEFAULT 0,
  created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_due (session_id, due_date)
);
