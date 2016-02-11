// settings.js
//
// These are the initial settings for Circle Blvd.
// Public and private settings can be edited. These
// are saved in the database.
//
var uuid = require('node-uuid');

// Visibility definitions:
//   public: visible to all
//   private: visible to administrators
//   secret: visible to the database and computer memory
module.exports = [{
    name: "domain-name",
    value: null,
    visibility: "public"
},{
    name: "google-analytics",
    value: null,
    visibility: "private"
},{
    name: "limit-circles",
    value: 300,
    visibility: "private"
},{
    name: "limit-stories-per-circle",
    value: 1000,
    visibility: "private"
},{
    name: "limit-archives-per-circle",
    value: 10000,
    visibility: "private"
},{
    name: "limit-lists-per-circle",
    value: 150,
    visibility: "private"
},{
    name: "limit-total-members",
    value: 5000,
    visibility: "private"
},{
    name: 'session-secret',
    value: uuid.v4(),
    visibility: "secret"
},{
    name: "contact-from-address",
    value: null,
    visibility: "private"
},{
    name: "contact-to-address",
    value: null,
    visibility: "private"
},{
    name: "smtp-login",
    value: null,
    visibility: "private"
},{
    name: "smtp-password",
    value: null,
    visibility: "secret"
},{
    name: "smtp-service",
    value: "Zoho",
    visibility: "private"
},{ 
    name: "ssl-ca-path",
    value: null,
    visibility: "private"
},{
    name: "ssl-ca-path-root",
    value: null,
    visibility: "private"
},{
    name: "ssl-cert-path",
    value: null,
    visibility: "private"
},{
    name: "ssl-key-path",
    value: null,
    visibility: "private"
},{
    name: "stripe-public-key",
    value: null,
    visibility: "public"
},{
    name: "stripe-secret-key",
    value: null,
    visibility: "secret"
},{
    name: "free-trial-days",
    value: 30,
    visibility: "public"
}];