var http = require('http');
var secret = require('./secret_pg.js');
var options = require('./frfpg.js');
var server = http.createServer(
		function(req, res) {
			if(req){
				var urlReq = require('url').parse(req.url, true);
				switch(urlReq.pathname){
					case "/cgi/secret":
					case "/cgi/secret/posts":
					case "/cgi/secret/cmts":
						secret(req, res, urlReq);
						break;
					default:
						res.statusCode = 500;
						res.end("500 not found "+ urlReq.pathname);
				}
			}
		}).listen(options.server_port,'localhost');
server.on('error', function(e) { console.log("Got error: " + e.message);});
