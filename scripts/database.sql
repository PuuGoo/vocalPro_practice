-------------------------------------------------------
-- DELETE + CREATE DATABASE SAFELY
-------------------------------------------------------

USE master;

IF EXISTS (SELECT name FROM sys.databases WHERE name = 'VocalPro')
BEGIN
    ALTER DATABASE VocalPro SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE VocalPro;
END;

-- CHỜ SQL TẠO XONG
WAITFOR DELAY '00:00:01';

CREATE DATABASE VocalPro;

-- CHỜ SQL MOUNT DB
WAITFOR DELAY '00:00:01';

ALTER DATABASE VocalPro SET MULTI_USER;

USE VocalPro;

-------------------------------------------------------
-- USERS TABLE
-------------------------------------------------------
CREATE TABLE users (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_users_id DEFAULT NEWID(),
    email VARCHAR(255) NOT NULL,
    name NVARCHAR(255) NULL,
    passwordHash VARCHAR(255) NULL,
    role VARCHAR(50) NOT NULL CONSTRAINT DF_users_role DEFAULT 'user',
    settings NVARCHAR(MAX) NULL,
    googleId VARCHAR(255) NULL,
    emailVerified BIT NOT NULL CONSTRAINT DF_users_emailVerified DEFAULT 0,

    CONSTRAINT PK_users PRIMARY KEY (id),
    CONSTRAINT UQ_users_email UNIQUE (email)
);

CREATE INDEX IX_users_googleId ON users(googleId);


-------------------------------------------------------
-- SESSIONS TABLE
-------------------------------------------------------
CREATE TABLE sessions (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_sessions_id DEFAULT NEWID(),
    sid VARCHAR(255) NOT NULL,
    userId UNIQUEIDENTIFIER NOT NULL,
    expiresAt DATETIME2(7) NOT NULL,
    date NVARCHAR(MAX) NULL,

    CONSTRAINT PK_sessions PRIMARY KEY (id),
    CONSTRAINT UQ_sessions_sid UNIQUE (sid),
    CONSTRAINT FK_sessions_users_userId FOREIGN KEY (userId)
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);


-------------------------------------------------------
-- VOCABULARIES TABLE
-------------------------------------------------------
CREATE TABLE vocabularies (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_vocabularies_id DEFAULT NEWID(),
    userId UNIQUEIDENTIFIER NOT NULL,
    word VARCHAR(255) NOT NULL,
    pronunciation VARCHAR(255) NULL,
    definition NVARCHAR(MAX) NULL,
    example NVARCHAR(MAX) NULL,
    partOfSpeech VARCHAR(255) NULL,
    difficulty INT NOT NULL CONSTRAINT DF_vocabularies_difficulty DEFAULT 1,
    imageUrl VARCHAR(255) NULL,
    audioUrl VARCHAR(255) NULL,
    createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_vocabularies_createdAt DEFAULT SYSUTCDATETIME(),
    updatedAt DATETIME2(7) NOT NULL CONSTRAINT DF_vocabularies_updatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_vocabularies PRIMARY KEY (id),
    CONSTRAINT FK_vocabularies_users_userId FOREIGN KEY (userId)
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IX_vocabularies_userId ON vocabularies(userId);
CREATE INDEX IX_vocabularies_word ON vocabularies(word);


-------------------------------------------------------
-- TAGS TABLE
-------------------------------------------------------
CREATE TABLE tags (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_tags_id DEFAULT NEWID(),
    userId UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(255) NOT NULL,
    color VARCHAR(50) NULL,
    createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_tags_createdAt DEFAULT SYSUTCDATETIME(),
    updatedAt DATETIME2(7) NOT NULL CONSTRAINT DF_tags_updatedAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_tags PRIMARY KEY (id),
    CONSTRAINT UQ_tags_userId_name UNIQUE (userId, name),
    CONSTRAINT FK_tags_users_userId FOREIGN KEY (userId)
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IX_tags_userId ON tags(userId);


-------------------------------------------------------
-- VOCABULARIES TAGS (MANY-TO-MANY)
-------------------------------------------------------
CREATE TABLE vocabulariesTags (
    vocabularyId UNIQUEIDENTIFIER NOT NULL,
    tagId UNIQUEIDENTIFIER NOT NULL,

    CONSTRAINT PK_vocabulariesTags PRIMARY KEY (vocabularyId, tagId),
    CONSTRAINT FK_vocabulariesTags_vocabularies_vocabularyId FOREIGN KEY (vocabularyId)
        REFERENCES vocabularies(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT FK_vocabulariesTags_tags_tagId FOREIGN KEY (tagId)
        REFERENCES tags(id) ON DELETE CASCADE ON UPDATE CASCADE
);


-------------------------------------------------------
-- REVIEWS TABLE
-------------------------------------------------------
CREATE TABLE reviews (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_reviews_id DEFAULT NEWID(),
    userId UNIQUEIDENTIFIER NOT NULL,
    vocabularyId UNIQUEIDENTIFIER NOT NULL,
    easeFactor FLOAT CONSTRAINT DF_reviews_easeFactor DEFAULT 2.5,
    interval INT NOT NULL CONSTRAINT DF_reviews_interval DEFAULT 0,
    repetitions INT NOT NULL CONSTRAINT DF_reviews_repetitions DEFAULT 0,
    nextReview DATETIME2(7) NOT NULL,
    lastReviewed DATETIME2(7) NULL,
    quality INT NULL,
    createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_reviews_createdAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_reviews PRIMARY KEY (id),
    CONSTRAINT UQ_reviews_userId_vocabularyId UNIQUE (userId, vocabularyId),
    CONSTRAINT FK_reviews_users_userId FOREIGN KEY (userId)
        REFERENCES users(id),
    CONSTRAINT FK_reviews_vocabularies FOREIGN KEY (vocabularyId)
        REFERENCES vocabularies(id) ON DELETE CASCADE
);

CREATE INDEX IX_reviews_userId ON reviews(userId);
CREATE INDEX IX_reviews_nextReview ON reviews(nextReview);


-------------------------------------------------------
-- API USAGE TABLE
-------------------------------------------------------
CREATE TABLE apiUsage (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_apiUsage_id DEFAULT NEWID(),
    endpoint VARCHAR(255) NOT NULL,
    date DATETIME2(7) NOT NULL,
    count INT NOT NULL CONSTRAINT DF_apiUsage DEFAULT 0,
    createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_apiUsage_createdAt DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_apiUsage PRIMARY KEY (id),
    CONSTRAINT UQ_apiUsage_endpoint_date UNIQUE (endpoint, date)
);

CREATE INDEX IX_apiUsage_endpoint ON apiUsage(endpoint);
CREATE INDEX IX_apiUsage_date ON apiUsage(date);
