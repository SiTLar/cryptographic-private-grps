------------------------------------------------------------------
-- My2Pg 1.32 translated dump
--
------------------------------------------------------------------

BEGIN;



CREATE TABLE "comments" (
  "id" SERIAL,
  "createdAt" timestamp NOT NULL DEFAULT '0001-01-01 00:00:00',
  "body" text NOT NULL,
  "token" char(50) NOT NULL,
  PRIMARY KEY ("createdAt")

);


CREATE TABLE "keys" (
  "Username" varchar(30),
  "pub_key" TEXT DEFAULT '' NOT NULL,
  "secret_data" TEXT DEFAULT '' NOT NULL,
  "write_token" varchar(1024),
  "userid" char(36) NOT NULL,
  PRIMARY KEY ("Username")

);


CREATE TABLE "posts" (
  "id" SERIAL, 
  "createdAt" timestamp NOT NULL DEFAULT '0001-01-01 00:00:00',
  "body" text NOT NULL,
  "token" char(50) NOT NULL,
  PRIMARY KEY ("createdAt")

);




COMMIT;
