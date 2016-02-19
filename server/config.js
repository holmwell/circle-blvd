// config.js
//
module.exports = {
    isDebugging: false,
    httpPort: process.env.PORT || 3000,
    httpsPort: process.env.SSL_PORT || 4000,
    database: {
        // Allow a deployment to override our database
        // name via environment variables.
        name: process.env.DATABASE_NAME || 'circle-blvd'
    }
};