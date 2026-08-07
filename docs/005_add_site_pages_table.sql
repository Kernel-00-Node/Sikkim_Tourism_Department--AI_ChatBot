-- ============================================================
-- Migration 005 — add the `site_pages` table
-- ============================================================
-- Stores every page crawled from the department's live website
-- (sikkimtourism.gov.in) by the whole-site scraper
-- (backend/app/services/site_scraper.py), so the chatbot can
-- answer general site-content questions from locally stored,
-- embedded text instead of fetching the live site on every
-- chat message.
--
-- Run this once against the department's existing MySQL database:
--   mysql -u <user> -p sikkim_tourism < 005_add_site_pages_table.sql
-- ============================================================

USE sikkim_tourism;

CREATE TABLE IF NOT EXISTS site_pages (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  url             VARCHAR(500)  NOT NULL,
  title           VARCHAR(300)  NOT NULL,
  -- sha256 hex digest of extracted_text — lets a re-crawl skip
  -- re-embedding a page whose content hasn't actually changed.
  text_hash       CHAR(64)      NOT NULL,
  extracted_text  LONGTEXT      NOT NULL,
  depth           SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  -- Number of vector chunks currently embedded for this page in
  -- Qdrant — used to clean up orphaned chunks if a re-crawl
  -- produces fewer chunks than the previous version.
  chunk_count     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  last_crawled_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_site_pages_url (url),
  INDEX idx_site_pages_last_crawled (last_crawled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;