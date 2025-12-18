-- Migration: Enable PostGIS extension
-- Description: Enable PostGIS for geographic data and spatial queries
-- This is required for geographic_regions table with boundary geometry support

CREATE EXTENSION IF NOT EXISTS postgis;

