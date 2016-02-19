// config.js
//
var databaseName = process.env.DATABASE_NAME || 'circle-blvd';

module.exports = {
    isDebugging: false,
    httpPort: process.env.PORT || 3000,
    httpsPort: process.env.SSL_PORT || 4000,
    database: {
        name: databaseName
    },
    sessionDatabase: {
        name: databaseName + '-sessions'
    }
};