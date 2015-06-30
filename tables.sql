SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

CREATE TABLE `comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `createdAt` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `body` text CHARACTER SET ascii NOT NULL,
  `token` char(50) CHARACTER SET ascii NOT NULL,
  PRIMARY KEY (`createdAt`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


CREATE TABLE `keys` (
  `Username` varchar(30) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `pub_key` blob NOT NULL,
  `secret_data` blob NOT NULL,
  `write_token` varchar(1024) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `userid` char(36) CHARACTER SET ascii NOT NULL,
  PRIMARY KEY (`Username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


CREATE TABLE `posts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `createdAt` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `body` text CHARACTER SET ascii NOT NULL,
  `token` char(50) CHARACTER SET ascii NOT NULL,
  PRIMARY KEY (`createdAt`),
  KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


