const request = require("request");
const urlParser = require("url");
const http = require("http");
const crypto = require("crypto");

let opts = {
  githubClient: process.env["GITHUB_CLIENT"],
  githubSecret: process.env["GITHUB_SECRET"],
  baseURL: "http://localhost",
  loginURI: "/login",
  callbackURI: "/callback",
  scope: "user" // optional, default scope is set to user
};

// Using a cryptographically signed string to pass through
// the various steps within the OAuth flow to ensure
// the request has not been tampered with.
const sig = crypto.randomBytes(20).toString("hex");
const port = 8090;
let state = {
  "signature" : sig
};

function redirect(req, resp, destination) {
  resp.statusCode = 301;
  resp.setHeader("location", destination);
  resp.end();
}

function login(req, resp) {
  state.reffer = req.url

  const urlString =
    "https://github.com/login/oauth/authorize" +
    "?client_id=" +
    opts.githubClient +
    (opts.scope ? "&scope=" + opts.scope : "") +
    "&state=" +
    JSON.stringify(state);

  resp.statusCode = 302;
  resp.setHeader("location", urlString);
  resp.end();
}

function callback(req, resp) {
  const query = urlParser.parse(req.url, true).query;
  const code = query.code;
  if (!code) {
    // Send 400 missing oauth code
  }

  const url =
    "https://github.com/login/oauth/access_token" +
    "?client_id=" +
    opts.githubClient +
    "&client_secret=" +
    opts.githubSecret +
    "&code=" +
    code

     console.log (`getting token, code: ${code}, url: ${url}`)
  request.get(
    {
      url: url,
      json: true
    },
    function(err, tokenResp, body) {
      if (err) {
        // TODO send 500 response
        resp.writeHead(500, { "Content-Type" : "text/html"})
        resp.write("<h1>500 Error</h1>")
      } else {
        const recievedState = JSON.parse(query.state);
        const reffer = recievedState.reffer
        // TODO Store DB

        resp.writeHead(200, { "Content-Type": "text/html" });
        resp.write(`<h1>Success!</h1><br/><p>Token Recieved! View API Information <a href='https://api.github.com/user?access_token=${body.access_token}'>here<a></p>`)

        // Redirect user back to app
        //resp.setHeader("location", state.reffer);
      }
    }
  );
}

http
  .createServer((req, res) => {

    if (req.url === "/") {
      res.statusCode = 200;
      res.write("alive");
      res.end();
      return;
    } 
    else if (urlParser.parse(req.url).pathname === "/login") {
      return login(req, res);
    } 
    else if (urlParser.parse(req.url).pathname === "/callback") {
      return callback(req, res);
    } 
    else {
      res.statusCode = 200;
      res.write(`Request URL ${req.url} does not exist`);
      res.end();
      return;
    }
  })
  .listen(port, () => {
    console.log(`Now listening on http://localhost:${port}/`);
  });
