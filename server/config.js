// config.js
//
module.exports = {
    database: {
        // Allow a deployment to override our database
        // name via environment variables.
        name: process.env.DATABASE_NAME || 'circle-blvd'
    }
};