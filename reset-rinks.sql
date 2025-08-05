-- Reset Rinks to Yura's Original Coaching Locations
-- Run this script to replace all rinks with the original 7 locations with accurate data

-- First, delete any existing time slots to avoid foreign key issues
DELETE FROM "RinkTimeSlot";
DELETE FROM "Lesson"; 
DELETE FROM "Rink";

-- Reset the sequence if using PostgreSQL
-- ALTER SEQUENCE "Rink_id_seq" RESTART WITH 1;

-- Insert Yura's Original Rinks with Proper IDs and Researched Data
INSERT INTO "Rink" ("id", "name", "timezone", "address", "maxCapacity", "createdAt", "updatedAt")
VALUES ('east-west-ice-palace', 'East West Ice Palace', 'America/Los_Angeles', '11446 Artesia Blvd, Artesia, CA 90701', 200, NOW(), NOW());

INSERT INTO "Rink" ("id", "name", "timezone", "address", "maxCapacity", "createdAt", "updatedAt")
VALUES ('great-park-ice-irvine', 'Great Park Ice', 'America/Los_Angeles', '888 Ridge Valley, Irvine, CA 92618', 2500, NOW(), NOW());

INSERT INTO "Rink" ("id", "name", "timezone", "address", "maxCapacity", "createdAt", "updatedAt")
VALUES ('lakewood-ice-arena', 'Lakewood Ice', 'America/Los_Angeles', '3975 Pixie Ave, Lakewood, CA 90712', 300, NOW(), NOW());

INSERT INTO "Rink" ("id", "name", "timezone", "address", "maxCapacity", "createdAt", "updatedAt")
VALUES ('skating-club-boston-khs', 'KHS', 'America/New_York', 'Skating Club of Boston, 750 University Ave, Norwood, MA 02062', 200, NOW(), NOW());

INSERT INTO "Rink" ("id", "name", "timezone", "address", "maxCapacity", "createdAt", "updatedAt")
VALUES ('sap-center-san-jose', 'SAP Center (San Jose Sharks)', 'America/Los_Angeles', '525 W Santa Clara St, San Jose, CA 95113', 17562, NOW(), NOW());

INSERT INTO "Rink" ("id", "name", "timezone", "address", "maxCapacity", "createdAt", "updatedAt")
VALUES ('novi-ice-arena-michigan', 'Novi Ice Arena', 'America/Detroit', '42400 Nick Lidstrom Dr, Novi, MI 48375', 500, NOW(), NOW());

INSERT INTO "Rink" ("id", "name", "timezone", "address", "maxCapacity", "createdAt", "updatedAt")
VALUES ('london-ontario-rink', 'Any Rink in London ON', 'America/Toronto', 'London, ON, Canada', 300, NOW(), NOW());

-- Verify the results
SELECT "id", "name", "timezone", "address", "maxCapacity" FROM "Rink" ORDER BY "name";