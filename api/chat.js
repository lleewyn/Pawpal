const chatHandler = require('../scripts/api/chat.js');

module.exports = async function (req, res) {
    return chatHandler(req, res);
};
