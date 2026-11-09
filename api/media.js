// Both upload gates remain OFF until schema, quota and each UI flow are accepted.
module.exports = require('../scripts/api/media.cjs').handle;
module.exports.config = { api: { bodyParser: false } };
