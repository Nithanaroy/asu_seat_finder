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
    console.log('Info: ', 'CRON job up and running');
}

function fetch_classes_and_email(classes_to_track) {
    console.log('Method: ', 'Fetch Classes');

    var deferred = Q.defer();

    var currnet_classes_url = 'https://dl.dropboxusercontent.com/u/95923404/current_classes_list.txt';
    var jsession_id_url = 'https://dl.dropboxusercontent.com/u/95923404/asu_classes_session_id.txt';
    request(jsession_id_url, function(err, res, jsession_id) {
        if (err) {
            var msg = "Couldn't fetch jsession id. May have to manually provide.";
            handle_error(msg, msg);
            return;
        };

        console.log('Info: ', 'Fetched JSESSION_ID');
        var options = {
            url: 'https://webapp4.asu.edu/catalog/classlist?s=CSE&l=grad&t=2151&e=all&hon=F',
            headers: {
                'Cookie': jsession_id
            }
        }

        request(options, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                // var jquery = fs.readFileSync("./public/components/jquery/dist/jquery.min.js").toString();
                jsdom.env(
                    body, ['http://code.jquery.com/jquery.js'],
                    function(errors, window) {
                        console.log('Info: ', 'Completed ASU Classes page request');

                        var $ = window.$;
                        var classes = scrape_asu_page(body, $);
                        var tracked_classes_status = check_classes_and_email(classes, classes_to_track);

                        request(currnet_classes_url, function(err, res, body) {
                            if (err) {
                                var msg = "Couldn't fetch list of existing classes. You will not be updated on changes to classes";
                                handle_error(msg, msg);
                                return;
                            };

                            console.log('Info: ', 'Checking if there are changes in classes...');

                            var old_classes = [];
                            body = body.split(',');
                            for (var i = 0; i < body.length; i++) {
                                var temp = body[i].trim();
                                if (temp.length > 0)
                                    old_classes.push(temp);
                            };
                            check_for_classes_changes(classes, old_classes);
                        });
                        
                        deferred.resolve(tracked_classes_status);

                        global.gc();
                    }
                );
            }

            if (error) {
                handle_error("Error during fetching ASU classes. Possible expired cookie.", "Renew Cookie!");
                return;
            };
        })
    });

    return deferred.promise;
}

function handle_error(msg, email_msg) {
    console.log('Error: ', msg, error);
    send_email_and_stop_job(email_msg);
    deferred.reject(msg);
}

function check_for_classes_changes (current_classes, old_classes) {

    var delta = get_diff(Object.keys(current_classes), old_classes);

    var html_msg = '';
    if (delta.new_classes.length > 0) {
        html_msg += '<p>These classes are added</p>';

        for (var i = 0; i < delta.new_classes.length; i++) {
            var aclass = delta.new_classes[i];
            html_msg += ["<strong>", aclass, ' ', current_classes[aclass].name, ":</strong> Available = ", current_classes[aclass]['available_seats'], " of ", current_classes[aclass]['total_seats'], "<br />"].join("");
        }
    };

    if (delta.removed_classes.length > 0) {
        html_msg += '< br /><p>These classes are removed</p>';
        html_msg += delta.removed_classes.join(', ');
    };

    if (html_msg.length > 0)
        send_email(html_msg);
}

function get_diff(current_list, possessed_list) {
    var new_classes = current_list.filter(function(new_class_id) { return possessed_list.indexOf(new_class_id) < 0; } );
    var removed_classes = possessed_list.filter(function(new_class_id) { return current_list.indexOf(new_class_id) < 0; } );
    return {
        new_classes: new_classes,
        removed_classes: removed_classes
    };
}

/**
 * Alerts me whenever cookie expired. I then have to manually update the cookie. As scraping
 * is no longer active, we stop the job as well.
 * @return {[type]}
 */
function send_email_and_stop_job(email_msg) {
    send_email(email_msg);
    if (globals.job) {
        globals.job.stop();
        console.log("Stopped the job as scraping failed");
    };
}

function check_classes_and_email(all_classes, classes_to_track) {
    var classes_opened = {},
        tracking_classes = {};
    for (var i = 0; i < classes_to_track.length; i++) {
        var class_id = classes_to_track[i].trim();
        console.log('Info for classid', class_id, all_classes[class_id]);
        if (all_classes[class_id] && all_classes[class_id].available_seats > 0 && all_classes[class_id].class_status == 0) {
            classes_opened[class_id] = all_classes[class_id];
        }
        tracking_classes[class_id] = all_classes[class_id];
    }
    if (Object.keys(classes_opened).length > 0)
        email_about_classes(classes_opened);
    return tracking_classes;
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
        var class_name = $(tds).eq(2).text().trim();

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
            'class_status': class_status,
            'name': class_name
        };
    });
    return classes;
}

function email_about_classes(available_classes) {
    var html_msg = "The seats in the following classes have opened up: <br /><br />";
    for (var aclass in available_classes) {
        html_msg += ["<strong>", aclass, ' ', available_classes[aclass].name, ":</strong> Available = ", available_classes[aclass]['available_seats'], " of ", available_classes[aclass]['total_seats'], "<br />"].join("");
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

    var job_msg = "";
    if (globals.job) {
        globals.job._callbacks[0]();
    } else {
        set_up_cron_job(classes_to_track);
        job_msg = "No jobs are currently running.";
    }

    var classes_to_track = req.query.classes;
    fetch_classes_and_email(classes_to_track).then(function(classes) {
        res.send({
            data: classes,
            status: true,
            msg: ["You will receive an email(s) if any of the requested classes are open and a CRON job is running", job_msg].join('.<br />')
        });
    }, function(error) {
        res.send({
            data: error,
            status: false,
            msg: error
        });
    });

}
