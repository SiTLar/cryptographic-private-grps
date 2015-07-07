------------------------------------------------------------------
-- My2Pg 1.32 translated dump
--
------------------------------------------------------------------


CREATE USER frf_secret NOSUPERUSER ;
CREATE DATABASE frf_secret;
\c frf_secret

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
  PRIMARY KEY ("Username")

);


CREATE TABLE "posts" (
  "id" SERIAL, 
  "createdAt" timestamp NOT NULL DEFAULT '0001-01-01 00:00:00',
  "body" text NOT NULL,
  "token" char(50) NOT NULL,
  PRIMARY KEY ("createdAt")

);
create index on "posts" ("createdAt" );
create index on  "comments" ("createdAt");
grant all on keys to  frf_secret;
grant all on posts to  frf_secret;
grant all on comments to  frf_secret;
grant USAGE, select on sequence posts_id_seq to frf_secret;
grant USAGE, select on sequence comments_id_seq to frf_secret;



COMMIT;
