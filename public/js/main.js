$(function() {
    $("#track-btn").click(function() {
        var to_track = $("#classes").val().split(',');
        $.ajax({
            url: '/track',
            data: {
                'classes': to_track
            },
            success: function(data) {
                $("#alert-msg").text("Started tracking");
            },
            error: function() {
                $("#alert-msg").text("Something went wrong :(");
            }
        });
    });

    $("#stop-track-btn").click(function() {
        $.ajax({
            url: '/stoptrack',
            success: function(data) {
                $("#alert-msg").text("Tracking stopped!");
            }
        });
    });

    $("#get-status-btn").click(function() {
        $("#alert-msg").html("Request sent. Please wait for an update");
        var to_track = $("#classes").val().split(',');
        $.ajax({
            url: '/getstatus',
            data: {
                'classes': to_track
            },
            success: function(res) {
                if (res.status) {
                    $("#alert-msg").html(res.msg);
                    generate_table_for_classes(res.data);
                } else {
                    console.log("Errors", res.data);
                    $("#alert-msg").html(res.msg);
                }
            },
            error: function(data) {
                $("#alert-msg").text("Something terrible happened");
                console.log(data);
            }
        });
    });

    function generate_table_for_classes(classes) {
        // tr
        //         td #
        //         td Name
        //         td Class#
        //         td Available seats
        //         td Total seats
        //         td Status

        var status_map = {
            0: "Available",
            1: "Reserved",
            2: "Unavailable"
        };

        $("#output tbody").html("");

        var sno = 1;
        for (var class_id in classes) {
            var tr = $("<tr />");

            $(tr).append($("<td />").text(sno));
            $(tr).append($("<td />").text(classes[class_id].name));
            $(tr).append($("<td />").text(class_id));
            $(tr).append($("<td />").text(classes[class_id].available_seats));
            $(tr).append($("<td />").text(classes[class_id].total_seats));
            $(tr).append($("<td />").text(status_map[classes[class_id].class_status]));

            $("#output tbody").append(tr);

            sno = sno + 1;
        }
    }
});
