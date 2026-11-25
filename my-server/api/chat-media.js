module.exports = require('../scripts/api/media.cjs').createMediaHandler({ chat: true });
module.exports.config = { api: { bodyParser: false } };
