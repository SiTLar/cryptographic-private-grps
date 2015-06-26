'use strict';
(function(){
 var openpgp = require('openpgp');
 var mysql = require('mysql');
 var http = require('http');
var sqlOptions= {
		socketPath : '/run/mysqld/mysqld.sock',
		user     : 'frf',
		password : 'i1938068021209644612320857643',
		database : 'frf_private',
		multipleStatements: true
};
 module.exports = function(req,res, urlReq){
 var data = new Array();
 if (urlReq.pathname == '/cgi/secret/posts')req.on('end',sendPosts);
 else if (urlReq.pathname == '/cgi/secret/cmts')req.on('end',sendCmts);
 else if (urlReq.search.slice(1,2) == '@') req.on('end',sendUserPub);
 else {
	switch ( urlReq.search){
	case '?register':
		req.on('end',register);
		break;
	case '?update':
		req.on('end',update);
		break;
	case '?post':
		req.on('end',post);
		break;
	case '?edit':
		req.on('end',editP);
		break;
	case '?delete':
		req.on('end',deleteP);
		break;
	case '?token':
		req.on('end',sendToken);
		break;
	case '?data':
		req.on('end',sendUserPriv);
		break;
	default:
		req.on('end',defaultAction);
	 }
 }
 req.on('data', function (input){data.push(input); });
 function sendPosts(){
	var connection = mysql.createConnection(sqlOptions);
	connection.connect();
 	if(urlReq.query.id) return connection.query("select * from `posts`  where `id` = ?;",urlReq.query.id, porcessQuery);
 	else{
		var offset = 0;
		var limit = 10;
		if(typeof urlReq.query.offset === 'number')offset = urlReq.query.offset;
		if(typeof urlReq.query.limit === 'number')if(urlReq.query.limit<100)limit = urlReq.query.limit;else limit = 100;
		connection.query("select * from `posts` order by `createdAt` desc limit ? offset ? ;",[limit, offset] 
			,function(sqlerr,sqlres,fields){ porcessUnauthQuery(sqlerr,sqlres,fields,res) ; connection.destroy(); });
	}
	
 }
 function sendCmts(){
	var connection = mysql.createConnection(sqlOptions);
	connection.connect();
	var offset = 0;
	var limit = 30;
	if(typeof urlReq.query.offset === 'number')offset = urlReq.query.offset;
	if(typeof urlReq.query.limit === 'number')if(urlReq.query.limit<1000)limit = urlReq.query.limit;else limit = 1000;
	connection.query("select * from `comments` order by `createdAt` desc limit ? offset ? ;",[limit, offset]
		,function(sqlerr,sqlres,fields){ porcessUnauthQuery(sqlerr,sqlres,fields,res) ; connection.destroy(); });
	
 }
function porcessUnauthQuery (sqlerr,sqlres,fields, res){
	if (sqlerr) {
		res.writeHead(500);
		console.log(sqlerr);
	} else if(typeof sqlres === 'undefined')
		res.writeHead(404);
	else if(typeof sqlres[0] === 'undefined')
		res.writeHead(404);
	else{
		res.writeHead(200, { "Content-Type": "text/json" });
		res.write(JSON.stringify({'posts':sqlres}));
	}
	res.end();				
};
 function sendUserPub(){
	var connection = mysql.createConnection(sqlOptions);
	connection.connect();
	connection.query("select  `pub_key` from `keys`  where `Username` = ?;",urlReq.search.slice(2)
	,function (sqlerr,sqlres,fields){
		if (sqlerr)  res.writeHead(500);
		else if(typeof sqlres === 'undefined')
			res.writeHead(404);
		else if(typeof sqlres[0] === 'undefined')
			res.writeHead(404);
		else{
			res.writeHead(200, { "Content-Type": "text/plain" });
			res.write(sqlres[0].pub_key);
		}
		res.end();				
		connection.destroy();
	});
 
 }
 function register(){
	
		http.get("http://twinspect.net:3000/v1/posts/"+Buffer.concat(data).toString('ascii')
		,function(frfres) {
			var frfdata = '';
			frfres.on('data', function (chunk) {frfdata += chunk;});
			frfres.on('end',function (){
				if( frfres.statusCode >= 400 ){
					res.writeHead(400);
					res.end();
					return;
				} 
				var incoming = JSON.parse(frfdata);
				var connection = mysql.createConnection(sqlOptions);
				 connection.connect();
				 var cUsername = '';
				 for (var idx =0; idx < incoming.users.length; idx++){
					 if (incoming.users[idx].id == incoming.posts.createdBy){
					 	cUsername = incoming.users[idx].username;
						break;
					}
				 }
				 if (cUsername == '') {
					res.writeHead(400);
					res.end();
					return;
				 }

				var key = openpgp.key.readArmored(incoming.posts.body).keys[0];
				 var write_token = new Buffer(openpgp.crypto.random.getRandomBytes(16)).toString('base64');
				 var values = [cUsername,  incoming.posts.body, '', incoming.posts.createdBy, write_token ] ; 
				 connection.query(
				/* 'INSERT INTO `keys` (`username`,`public_key`, `secret_data`, `write_token`)'
				+'VALUES ("'+key.getUserIds()[0] +'","'+ values+'" ) ON DUPLICATE KEY UPDATE'
				+'(`public_key`, `secret_data`, `write_token`) VALUES("' + values
				*/
				"REPLACE INTO `keys` (`Username`,`pub_key`, `secret_data`, `userid`, `write_token`)"
				+'VALUES (?, ?, ?, ?, ?);', values
				,function (sqlerr,sqlres,fields){
					sendEnc(  key, write_token );
					connection.destroy();
				});
			});
		});
		 
 }
 function sendToken(){
	 var username = req.headers['x-authentication-user'];
	 var connection = mysql.createConnection(sqlOptions);
	 var write_token = new Buffer(openpgp.crypto.random.getRandomBytes(16)).toString('base64');
	 connection.connect();
	 connection.query("update `keys` set `write_token`='"+write_token+"' where `Username` = '"+username+"';"
	 ,function (sqlerr,sqlres,fields){
		if (sqlerr)  res.writeHead(500);
		else if(typeof sqlres === 'undefined'){
			res.writeHead(400);
		}else {
			connection.query("select  `pub_key` from `keys`  where `Username` = ?;", [username]
			,function (sqlerr,sqlres,fields){
				connection.destroy();
				if (sqlerr)  res.writeHead(500);
				else if(typeof sqlres === 'undefined')
					res.writeHead(404);
				else if(typeof sqlres[0] === 'undefined')
					res.writeHead(404);
				else{
					var key = openpgp.key.readArmored(sqlres[0].pub_key.toString('ascii')).keys[0];
					return sendEnc(key,write_token);
				}
				res.end();
			});
			return;
		}
		res.end();
		connection.destroy();
	});
 
 
 }
 function sendEnc( key, data ){
 	 res.writeHead(200, { "Content-Type": "text/plain" });
	 openpgp.encryptMessage(key,data).then( function (a){res.write(a); res.end();});
 };

 function update(){
	 var username = req.headers['x-authentication-user'];
	 var token = (new Buffer(req.headers["x-authentication-token"],'base64')).toString('hex');
	 var connection = mysql.createConnection(sqlOptions);
	 connection.connect();
	 connection.query("update `keys` set `secret_data`=? where `Username` = ? and sha2(`write_token`,256) = ?;"
	 , [Buffer.concat(data).toString('ascii'), username, token]
	 ,function (sqlerr,sqlres,fields){
		if (sqlerr)  res.writeHead(500);
		else if(typeof sqlres === 'undefined') res.writeHead(400);
		else if (sqlres.affectedRows == 0 )res.writeHead(400);
		else res.writeHead(204);
		res.end();
		connection.destroy();
	});

 } 
 function post(){
	 var username = req.headers['x-authentication-user'];
	 var token = (new Buffer(req.headers["x-authentication-token"],'base64')).toString('hex');
	 var type= req.headers['x-content-type'];
	 if (type == 'comment')type = 'comments';
	 else if (type == 'post')type = 'posts';
	 else {
		 res.writeHead(400);
		 res.end();
	 }
	 var connection = mysql.createConnection(sqlOptions);
	 connection.connect();
	 connection.query("select userid from `keys` where `Username` = ? and sha2(`write_token`,256) = ?;"
	 , [username, token]
	 ,function (sqlerr,sqlres,fields){
		if (sqlerr) {
			res.writeHead(500);
			console.log(sqlerr);
		} else if(typeof sqlres === 'undefined')
			res.writeHead(400);
		else if(typeof sqlres[0] === 'undefined')
			res.writeHead(400);
		else {
			connection.query("insert into ?? (`username`, `createdBy`,`createdAt`, `body` ) values (?, ?, NOW(), ?); "
			+"SELECT * from ??  where `id` = LAST_INSERT_ID();"
			, [type, username, sqlres[0].userid, Buffer.concat(data).toString('ascii'), type]
			,function (sqlerr,sqlres,fields){
			if (sqlerr) {
				res.writeHead(500);
				console.log(sqlerr);
			} else if(typeof sqlres === 'undefined') res.writeHead(400);
				else{
					res.writeHead(200);
					res.writeHead(200, { "Content-Type": "text/json" });
					res.write(JSON.stringify({'posts':(sqlres[1])[0]}));
				}
				res.end();
				connection.destroy();
			});
			return;
		}
		res.end();
		connection.destroy();
	});

 } 
 function deleteP(){
	 var username = req.headers['x-authentication-user'];
	 var postid = req.headers['x-content-id'];
	 var token = (new Buffer(req.headers["x-authentication-token"],'base64')).toString('hex');
	 var type= req.headers['x-content-type'];
	 if (type == 'comment')type = 'comments';
	 else if (type == 'post')type = 'posts';
	 else {
		 res.writeHead(400);
		 res.end();
	 }
	 var connection = mysql.createConnection(sqlOptions);
	 connection.connect();
	 connection.query("select userid from `keys` where `Username` = ? and sha2(`write_token`,256) = ?;"
	 , [username, token]
	 ,function (sqlerr,sqlres,fields){
		if (sqlerr) {
			res.writeHead(500);
			console.log(sqlerr);
		} else if(typeof sqlres === 'undefined')
			res.writeHead(400);
		else if(typeof sqlres[0] === 'undefined')
			res.writeHead(400);
		else {
			connection.query("DELETE from ??  where `id` = ? and username = ?;"
			, [type, postid,username]
			,function (sqlerr,sqlres,fields){
			if (sqlerr) {
				res.writeHead(500);
				console.log(sqlerr);
			} else if(typeof sqlres === 'undefined') res.writeHead(400);
				else if (!sqlres.affectedRows) res.writeHead(404);
				else{
					res.writeHead(204);
				}
				res.end();
				connection.destroy();
			});
			return;
		}
		res.end();
		connection.destroy();
	});

 } 
 function editP(){
	 var username = req.headers['x-authentication-user'];
	 var type= req.headers['x-content-type'];
	 if (type == 'comment')type = 'comments';
	 else if (type == 'post')type = 'posts';
	 else {
		 res.writeHead(400);
		 res.end();
	 }
	 var token = (new Buffer(req.headers["x-authentication-token"],'base64')).toString('hex');
	 var connection = mysql.createConnection(sqlOptions);
	 connection.connect();
	 connection.query("select userid from `keys` where `Username` = ? and sha2(`write_token`,256) = ?;"
	 , [username, token]
	 ,function (sqlerr,sqlres,fields){
		if (sqlerr) {
			res.writeHead(500);
			console.log(sqlerr);
		} else if(typeof sqlres === 'undefined')
			res.writeHead(400);
		else if(typeof sqlres[0] === 'undefined')
			res.writeHead(400);
		else {
			connection.query("UPDATE `posts` set `body` = ? where `id` = ? and username = ?;"
			+"SELECT * from `posts`  where `id` = ?;"
			, [Buffer.concat(data).toString('ascii'), req.headers['x-content-id'], username, req.headers['x-content-id'] ]
			,function (sqlerr,sqlres,fields){
				if (sqlerr) {
					res.writeHead(500);
					console.log(sqlerr);
				} else if(typeof sqlres === 'undefined') res.writeHead(400);
				else if (!sqlres[0].affectedRows) res.writeHead(404);
				else{
					res.writeHead(200);
					res.write(JSON.stringify({'posts':(sqlres[1])[0]}));
				}
				res.end();
				connection.destroy();
			});
			return;
		}
		res.end();
		connection.destroy();
	});

 } 
 function sendUserPriv(){
	var connection = mysql.createConnection(sqlOptions);
	var username = req.headers['x-authentication-user'];
	connection.connect();
	connection.query("select  `secret_data` from `keys`  where `Username` = ?;",username 
			,function (sqlerr,sqlres,fields){
				if (sqlerr)  res.writeHead(500);
				else if(typeof sqlres === 'undefined')
					res.writeHead(404);
				else if(typeof sqlres[0] === 'undefined')
					res.writeHead(404);
				else{
					res.writeHead(200, { "Content-Type": "text/plain" });
					res.write(sqlres[0].secret_data);
				}
				res.end();				
				connection.destroy();
			});
 
 }
 function defaultAction (){
	 console.log('no better thing to do');
	 res.writeHead(400, { "Content-Type": "text/plain" });
	 res.write("This service is new and, you know...");
	 res.end();;
  }
 }
 }());

