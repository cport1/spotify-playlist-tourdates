/* Load the HTTP library */
var http = require("http");
var https = require('https');
var SpotifyWebApi = require('spotify-web-api-node');
var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var requestify = require('requestify');
var client_id = 'e921df5fa41942a695a313c8cab6a0f9'; // Your client id
var client_secret = '7d9aaf257a1b4c3a820404e1965d2872'; // Your client secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

var currentUser;
var currentToken;
var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/client'))
    .use(cookieParser());

app.get('/login', function(req, res) {

    var state = generateRandomString(16);
    res.cookie(stateKey, state);

    // your application requests authorization
    var scope = 'user-read-private user-read-email';
    res.redirect('https://accounts.spotify.com/authorize?' +
        querystring.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }));
});

app.get('/callback', function(req, res) {

    // your application requests refresh and access tokens
    // after checking the state parameter

    var code = req.query.code || null;
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
        res.redirect('/#' +
            querystring.stringify({
                error: 'state_mismatch'
            }));
    } else {
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };

        request.post(authOptions, function(error, response, body) {
            if (!error && response.statusCode === 200) {

                var access_token = body.access_token,
                    refresh_token = body.refresh_token;
                currentToken = body.access_token;

                var options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };

                // use the access token to access the Spotify Web API
                request.get(options, function(error, response, body) {
                    //console.log(body);
                    console.log(body.id);
                    currentUser = body.id;
                });

                // we can also pass the token to the browser to make requests from there
                res.redirect('/#' +
                    querystring.stringify({
                        access_token: access_token,
                        refresh_token: refresh_token
                    }));
            } else {
                res.redirect('/#' +
                    querystring.stringify({
                        error: 'invalid_token'
                    }));
            }
        });
    }
});

app.get('/refresh_token', function(req, res) {

    // requesting access token from refresh token
    var refresh_token = req.query.refresh_token;
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };

    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token;
            currentToken = body.access_token;
            res.send({
                'access_token': access_token
            });
        }
    });
});
//https://api.spotify.com/v1/users/{user_id}/playlists/{playlist_id}/tracks
app.get('/get_playlist', function(){
    requestify.get('https://api.spotify.com/v1/users/' + currentUser + '/playlists/7dOfOiTmyK6uCrNrPTbvT8/tracks',{
        headers:{
            'Authorization': 'Bearer ' + currentToken,
            'Accept': 'application/json'
        },
            dataType: 'json'
        })
        .then(function(response) {
                response.getBody();
                console.log('SUCCESS');
                //console.log(response.body);
                var data = JSON.parse(response.body);
                //console.log(data.items);
                //data.items.forEach(console.log('fuck'));
                data.items.forEach(function(obj){
                    console.log(obj.track.artists[0].name)
                })
            }
        );
});

console.log('Listening on 8888');
app.listen(8888);

