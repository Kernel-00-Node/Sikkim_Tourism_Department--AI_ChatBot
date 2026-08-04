-- ============================================================
-- Migration 003 — add the `circulars` table
-- ============================================================
-- Stores official notices/circulars scraped from the department's
-- website (road status reports, cancellation orders, general
-- notices) so the chatbot can answer "latest update" questions
-- from locally stored data instead of fetching the site live on
-- every chat message.
--
-- Run this once against the department's existing MySQL database:
--   mysql -u <user> -p sikkim_tourism < 003_add_circulars_table.sql
-- ============================================================

USE sikkim_tourism;

CREATE TABLE IF NOT EXISTS circulars (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  title           VARCHAR(300)  NOT NULL,
  category        ENUM('road_status', 'cancellation_order', 'notice') NOT NULL,
  district        VARCHAR(100)  NULL,
  issue_date      DATE          NOT NULL,
  source_url      VARCHAR(500)  NOT NULL,
  -- sha256 hex digest of the PDF bytes — lets the scraper skip files
  -- it has already ingested instead of re-downloading/re-processing them.
  pdf_hash        CHAR(64)      NOT NULL,
  extracted_text  LONGTEXT      NOT NULL,
  ingested_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_circulars_pdf_hash (pdf_hash),
  INDEX idx_circulars_category_date (category, issue_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;