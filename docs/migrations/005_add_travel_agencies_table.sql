-- ============================================================
-- Migration 005 — add the `travel_agencies` table
-- ============================================================
-- Stores registered travel agency records synced from the
-- department's public district-wise JSON directory
-- (https://sikkimtourism.gov.in/assets/data/travel-agencies/<district>.json)
-- so the chatbot can resolve "email/contact for <agency>" questions
-- from locally stored data instead of relying on RAG/web-search
-- fallback, which was inventing or missing answers.
--
-- Run this once against the department's existing MySQL database:
--   mysql -u <user> -p sikkim_tourism < 005_add_travel_agencies_table.sql
-- ============================================================

USE sikkim_tourism;

CREATE TABLE IF NOT EXISTS travel_agencies (
                                               id                  INT UNSIGNED  NOT NULL AUTO_INCREMENT,
                                               name                VARCHAR(300)  NOT NULL,
    -- Unique per source record — used to upsert on re-sync instead of
    -- duplicating rows every time the scraper runs.
    registration_number VARCHAR(100)  NOT NULL,
    proprietor          VARCHAR(200)  NULL,
    address             VARCHAR(500)  NULL,
    -- Nullable: most source records omit this field; the scraper fills it
    -- in from the source district file name when the record itself has none.
    district             VARCHAR(100)  NULL,
    grade               VARCHAR(20)   NULL,
    contact             VARCHAR(200)  NULL,
    email_or_website    VARCHAR(300)  NULL,
    date_of_issue       VARCHAR(50)   NULL,
    renewed_upto        VARCHAR(50)   NULL,
    synced_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_travel_agencies_registration_number (registration_number),
    INDEX idx_travel_agencies_district (district),
    FULLTEXT KEY ft_travel_agencies (name, proprietor)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;