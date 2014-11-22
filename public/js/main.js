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
});
