const request = require('request')
const url = require('url')

let opts = {
  githubClient: process.env['GITHUB_CLIENT'],
  githubSecret:  process.env['GITHUB_SECRET'],
  baseURL: 'http://localhost',
  loginURI: '/login',
  callbackURI: '/callback',
  scope: 'user' // optional, default scope is set to user
}

const crypto = require("crypto");
const state = crypto.randomBytes(20).toString('hex');
let port = 8080

require('http').createServer(function(req, res) {
  if (req.url.match(/login/)) return login(req, res)
  if (req.url.match(/callback/)) return callback(req, res)
    else return redirect(req, res, "/login")
}).listen(port)

console.log("Now listening on http://localhost:8080/")

function redirect(req, resp, destination) {
resp.statusCode = 301
  resp.setHeader('location', destination)
  resp.end()
}
function login(req, resp) {
	let u = 'https://github.com/login/oauth/authorize'
	    + '?client_id=' + opts.githubClient
	    + (opts.scope ? '&scope=' + opts.scope : '')
	    + '&state=' + state
	    ;
	resp.statusCode = 302
	resp.setHeader('location', u)
	resp.end()
}

function callback(req, resp, cb) {
	var query = url.parse(req.url, true).query
    var code = query.code
    if (!code) return gotToken('missing oauth code', null, null, req, resp)
    var u = 'https://github.com/login/oauth/access_token'
       + '?client_id=' + opts.githubClient
       + '&client_secret=' + opts.githubSecret
       + '&code=' + code
       + '&state=' + state
       ;
    request.get({url:u, json: true}, function (err, tokenResp, body) {
      if (err) {
        if (cb) {
          err.body = body
          err.tokenResp = tokenResp
          return cb(err)
        }
        return gotToken(err, body, tokenResp, req, resp)
      }
      if (cb) {
        cb(null, body)
      }
      gotToken(null, body, tokenResp, req, resp)
    })
}

function gotToken(error, token, tokenResp, req, resp) {
  if (!error) {
    console.log(token.access_token)
    resp.writeHead(200, {'Content-Type': 'text/html'})  
    resp.write(`Access Token: <a href="https://api.github.com/user?access_token=${token.access_token}">${token.access_token}</a>`)
    resp.end()
  }
  else {
    console.log(error)
  }
}