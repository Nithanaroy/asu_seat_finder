// var request = require('request');

// var options = {
//     url: 'https://webapp4.asu.edu/catalog/classlist?s=CSE&l=grad&t=2151&e=all&hon=F',
//     headers: {
//         'Cookie': 'JSESSIONID=5B44C5C29D899E5DD0AF412869FD80F0.catalog2'
//     }
// }

// request(options, function(error, response, body) {
//     if (!error && response.statusCode == 200) {
//         console.log(response.headers, Object.keys(response));
//     }
// })



var request = require("request");

var options = {
    url: "https://webapp4.asu.edu/catalog/",
    followredirect: false,
}

request.get(options, function(error, response, body) {
    console.log(response.headers['set-cookie']);
});
