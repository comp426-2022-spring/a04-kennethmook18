// Require better-sqlite.
const Database = require('better-sqlite3');

// Connect to a database or create one if it doesn't exist yet.
const logdb = new Database('log.db');

// Is the database initialized or do we need to initialize it?
const stmt = logdb.prepare(`SELECT name FROM sqlite_master WHERE type='table' and name='accesslog';`);

// Define row using `get()` from better-sqlite3
let row = stmt.get();

// Check if there is a table. If row is undefined then no table exists.
if (row === undefined) {

// Set a const that will contain your SQL commands to initialize the database.
    const sqlInit = `CREATE TABLE accesslog ( id INTEGER PRIMARY KEY, remoteaddr TEXT, remoteuser TEXT, time TEXT, method TEXT, url TEXT, protocol TEXT, httpversion TEXT, status TEXT, referer TEXT, useragent TEXT);`;

// Execute SQL commands that we just wrote above.
    logdb.exec(sqlInit);

} else {
// Since the database already exists, echo that to the console.
    console.log('Log database exists.')
}

// Export all of the above as a module so that we can use it elsewhere.
module.exports = logdb

