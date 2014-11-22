var nodemailer = require('nodemailer');

// List of all application level variables (static)
exports.constants = {
    job: null,
    transporter: function () {
        return nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: 'nitin.pasumarthy@gmail.com',
                pass: 'lifeissobeautiful'
            }
        });
    }
};
