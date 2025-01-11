--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS BibleIndex (
  id       INTEGER      PRIMARY KEY,
  bookName VARCHAR(255) NOT NULL,
  chapters INTEGER      NOT NULL
);

CREATE TABLE IF NOT EXISTS BookChapters (
  bookId  INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verses  INTEGER NOT NULL,
  PRIMARY KEY (bookId, chapter),
  FOREIGN KEY (bookId) REFERENCES BibleIndex(id)
);

CREATE TABLE IF NOT EXISTS Verses (
  bookId     INTEGER NOT NULL,
  chapter    INTEGER NOT NULL,
  verse      INTEGER NOT NULL,
  startTime  VARCHAR(50),
  duration   VARCHAR(50),
  PRIMARY KEY (bookId, chapter, verse),
  FOREIGN KEY (bookId, chapter) REFERENCES BibleIndex(bookId, id)
);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP TABLE BibleIndex;
DROP TABLE BookChapters;
DROP TABLE Verses;