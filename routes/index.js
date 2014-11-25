var express = require('express');
router = express.Router(),
    fs = require('fs'),
    request = require('request'),
    jsdom = require('jsdom'),
    CronJob = require('cron').CronJob,
    Q = require('q'),
    globals = require('../utils/globals').constants,
    nodemailer = require('nodemailer');

exports.home = function(req, res) {
    res.render('index', {
        title: 'ASU Seat Finder'
    });
};

exports.track = function(req, res) {
    console.log('Method: ', 'track');
    var classes_to_track = req.query.classes;
    set_up_cron_job(classes_to_track);
    res.send();
};


function set_up_cron_job(classes_to_track) {

    console.log('Method: ', 'Setting up CRON');

    var job = globals.job;

    // Stop existing job if any
    if (job) {
        console.log('Stopped CRON Job');
        job.stop();
    };

    job = new CronJob({
        cronTime: '0 */15 * * * *',
        onTick: function() {
            console.log('\r\n', new Date(), "Running CRON");
            fetch_classes_and_email(classes_to_track);
        },
        start: true,
        timeZone: "America/Phoenix"
    });

    // save the job to the globals job
    globals.job = job;
}

function fetch_classes_and_email(classes_to_track) {
    console.log('Method: ', 'Fetch Classes');
    var options = {
        url: 'https://webapp4.asu.edu/catalog/classlist?s=CSE&l=grad&t=2151&e=all&hon=F',
        headers: {
            'Cookie': 'onlineCampusSelection=C; JSESSIONID=A6BA31011EDEE07306A1A4D899DFACB8.catalog2; webfxtab_my-programs-tabs=1; MOBILE_DETECTION=false; ASUWEBAUTH=ST-44772-79fUOyKsK7BeWJBOQIYO-02_b3c1aa6d-9c2e-42b0-b4bf-2a6e9eeb3680; SSONAME=Nitin; _ga=GA1.2.1181178433.1416636901; myclasses=2151; __utma=59190898.1181178433.1416636901.1416879873.1416892730.12; __utmc=59190898; __utmz=59190898.1416892730.12.9.utmcsr=weblogin.asu.edu|utmccn=(referral)|utmcmd=referral|utmcct=/cas/login; _op_aixPageId=a2_bc7be951-8098-4e5e-9f7e-e28594705a98; __utmt=1; __utma=137925942.445756493.1415131804.1416892685.1416929761.52; __utmb=137925942.1.10.1416929761; __utmc=137925942; __utmz=137925942.1415131804.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none)'
        }
    }

    // var deferred = Q.defer();

    request(options, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                // var jquery = fs.readFileSync("./public/components/jquery/dist/jquery.min.js").toString();
                jsdom.env(
                    body, ['http://code.jquery.com/jquery.js'],
                    function(errors, window) {
                        console.log('Info: ', 'Completed ASU Classes page request');

                        var $ = window.$;
                        var classes = scrape_asu_page(body, $);
                        // deferred.resolve(classes);
                        check_classes_and_email(classes, classes_to_track);

                    }
                );
            }

            if (error) {
                console.log("Error during ASU classes fetch", error);
                // deferred.reject(errors);
                send_email_and_stop_job();
                return;
            };
        })
        // return deferred.promise;
}

/**
 * Alerts me whenever cookie expired. I then have to manually update the cookie. As scraping
 * is no longer active, we stop the job as well.
 * @return {[type]}
 */
function send_email_and_stop_job() {
    send_email("Renew Cookie!");
    if (globals.job) {
        globals.job.stop();
        console.log("Stopped the job as scraping failed");
    };
}

function check_classes_and_email(all_classes, classes_to_track) {
    var classes_opened = {};
    for (var i = 0; i < classes_to_track.length; i++) {
        var class_id = classes_to_track[i].trim();
        console.log('Info for classid', class_id, all_classes[class_id], all_classes[class_id].available_seats, all_classes[class_id].class_status);
        if (all_classes[class_id] && all_classes[class_id].available_seats > 0 && all_classes[class_id].class_status == 0) {
            classes_opened[class_id] = all_classes[class_id];
        }
    }
    if (Object.keys(classes_opened).length > 0)
        email_about_classes(classes_opened);
}

/**
 * Scrapes a HTML page for classes and other details
 * @param  {the webpage in raw HTML format} html
 * @param  {jquery handler} $
 * @return {classes, availability, total seats}
 */
function scrape_asu_page(html, $) {
    console.log('Method: ', 'Scrape ASU Page');

    var table = $(html).find("#CatalogList");
    var classes = {};
    $(table).children("tbody").children("tr").each(function() {
        var tds = $(this).children("td");
        var availability_col = $(this).children("td.availableSeatsColumnValue");
        var available_seats, total_seats, temp;

        var class_id = parseInt($(tds).first().text().trim());
        var img_src = $(availability_col).find('img').attr('src');
        var class_status = -1; // 0 = available, 1 = reserved, 2 = unavailable

        temp = parseInt($(availability_col).find("td:eq(0)").text().trim());
        if (!isNaN(temp)) {
            available_seats = temp;
        };

        temp = parseInt($(availability_col).find("td:eq(2)").text().trim());
        if (!isNaN(temp)) {
            total_seats = temp;
        };

        if (img_src == "images/seats-red-x.gif") {
            // unavailable
            class_status = 2;
        } else if (img_src == 'images/icon_triangle.png') {
            // reserved
            class_status = 1;
        } else {
            // open
            class_status = 0;
        }

        // classes.push("[" + class_id + ", " + available_seats + ", " + total_seats + "] <br />");
        classes[class_id] = {
            'available_seats': available_seats,
            'total_seats': total_seats,
            'class_status': class_status
        };
    });
    return classes;
}

function email_about_classes(available_classes) {
    var html_msg = "The seats in the following classes have opened up: <br /><br />";
    for (var aclass in available_classes) {
        html_msg += ["<strong>", aclass, ":</strong> Available = ", available_classes[aclass]['available_seats'], " of ", available_classes[aclass]['total_seats'], "<br />"].join("");
    }
    send_email(html_msg);
}

function send_email(html_msg) {

    console.log('Method: ', 'Send Email');

    var mailOptions = {
        from: 'Nitin Pasumarthy <npasumar@asu.edu>', // sender address
        to: 'nithanaroy@gmail.com',
        subject: 'ASU Seat Finder Alert', // Subject line
        text: 'Hello world', // plaintext body
        html: html_msg
    };

    // send mail with defined transport object
    var gmail_transporter = globals.transporter();
    gmail_transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log('Error: Sending email', error);
        } else {
            console.log('Info: Message sent: ' + info.response);
        }
        gmail_transporter.close();
    });
}


exports.stoptrack = function(req, res) {

    console.log('Method: ', 'In stop tracking');

    if (globals.job) {
        globals.job.stop();
        console.log('Stopped a Job');
    } else {
        console.log('No jobs are running');
    }
    res.send();
};

exports.getstatus = function(req, res) {
    if (globals.job) {
        globals.job._callbacks[0]();
        res.send("Tracking request sent. You will receive an email(s) if any classes open, else no notification will be received");
    } else {
        res.send("No jobs currently running");
    }
}
