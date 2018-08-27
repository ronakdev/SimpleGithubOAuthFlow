const request = require("request");
const url = require("url");
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
const port = 8080;

function redirect(req, resp, destination) {
  resp.statusCode = 301;
  resp.setHeader("location", destination);
  resp.end();
}

function login(req, resp) {
  const state = {
    reffer: req.url,
    signature: sig
  };

  const url =
    "https://github.com/login/oauth/authorize" +
    "?client_id=" +
    opts.githubClient +
    (opts.scope ? "&scope=" + opts.scope : "") +
    "&state=" +
    JSON.stringify(state);

  resp.statusCode = 302;
  resp.setHeader("location", url);
  resp.end();
}

function callback(req, resp) {
  const query = url.parse(req.url, true).query;
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
    code +
    "&state=" +
    state;

  request.get(
    {
      url: url,
      json: true
    },
    function(err, tokenResp, body) {
      if (err) {
        // TODO send 500 response
      } else {
        const state = JSON.parse(query.state);

        // TODO Store DB

        resp.writeHead(200, { "Content-Type": "text/html" });

        // Redirect user back to app
        resp.setHeader("location", state.reffer);
      }
    }
  );
}

http
  .createServer((req, res) => {
    console.log(`URL: ${req.url}`);

    if (req.url === "/") {
      res.statusCode = 200;
      res.write("alive");
      res.end();
      return;
    } else if (req.url === "/login/") {
      return login(req, res);
    } else if (url.parse(req.url).pathname === "/callback/") {
      return callback(req, res);
    } else {
      res.statusCode = 200;
      res.write(`Request URL ${req.url} does not exist`);
      res.end();
      return;
    }
  })
  .listen(port, () => {
    console.log("Now listening on http://localhost:8080/");
  });
