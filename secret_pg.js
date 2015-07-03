'use strict';
(function(){
 var openpgp = require('openpgp');
 var pg  = require('pg');
 var https = require('https');
 var url = require('url');
 var authSRV = 'https://nanopeppa.freefeed.net/v1/posts/';
 var pgsqlOptions= require('./frfpg.js');
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
	pg.connect(pgsqlOptions, function(err, client, done){
		if(urlReq.query.id) 
			client.query(
				'select * from "posts"  where "id" = $1;'
				,[urlReq.query.id]
				,function (sqlerr,sqlres){
					porcessUnauthQuery(sqlerr,sqlres,done);
				}
			);
		else{
			var offset = 0;
			var limit = 10;
			if(typeof urlReq.query.offset === 'number')offset = urlReq.query.offset;
			if(typeof urlReq.query.limit === 'number')
				limit = urlReq.query.limit<100?urlReq.query.limit:100;
			client.query(
				'select * from "posts" order by "createdAt" desc limit $1 offset $2 ;'
				,[limit, offset] 
				,function (sqlerr,sqlres){
					porcessUnauthQuery(sqlerr,sqlres,done);
				}
			);
		}
	});
	
 }
 function sendCmts(){
	pg.connect(pgsqlOptions, function(err, client, done){
		var offset = 0;
		var limit = 30;
		if(typeof urlReq.query.offset === 'number')offset = urlReq.query.offset;
		if(typeof urlReq.query.limit === 'number')
			limit = urlReq.query.limit<1000?urlReq.query.limit:1000;
		
		client.query(
			'select * from "comments" order by "createdAt" desc limit $1 offset $2 ;'
			,[limit, offset] 
			,function (sqlerr,sqlres){
				porcessUnauthQuery(sqlerr,sqlres,done);
			}
		);
		
	});
	
 }
function porcessUnauthQuery (sqlerr,sqlres,done){
	if (sqlerr)  res.writeHead(500);
	else if(!sqlres.rowCount)
		res.writeHead(404);
	else if(typeof sqlres.rows[0] === 'undefined')
		res.writeHead(500);
	else{
		res.writeHead(200, { 'Content-Type': 'text/json' });
		res.write(JSON.stringify({'posts':sqlres.rows}));
	}
	res.end();				
	done();
};
 function sendUserPub(){
	pg.connect(pgsqlOptions, function(err, client, done){
		client.query('select  "pub_key" from "keys"  where "Username" = $1;'
		,[urlReq.search.slice(2)]
		,function (sqlerr,sqlres){
			if (sqlerr)  res.writeHead(500);
			else if(!sqlres.rowCount)
				res.writeHead(404);
			else if(typeof sqlres.rows[0] === 'undefined')
				res.writeHead(500);
			else{
				res.writeHead(200, { 'Content-Type': 'text/plain' });
				res.write(sqlres.rows[0].pub_key);
			}
			res.end();				
			done();
		});
	});
 
 }
function register(){
	https.get(authSRV+Buffer.concat(data).toString('ascii')
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
			var values = [cUsername,  incoming.posts.body, '', write_token ] ; 
			pg.connect(pgsqlOptions, function(err, client, done){
				client.query('INSERT INTO "keys" '
				+'("Username","pub_key", "secret_data", "write_token")'
				+'VALUES ($1, $2, $3, $4) ;', values
				,function (sqlerr,sqlres){
					sendEnc(  key, write_token );
					done();
				});
			});
		});
	});
	 
}
 function sendToken(){
	var username = req.headers['x-authentication-user'];
	var write_token = new Buffer(openpgp.crypto.random.getRandomBytes(16)).toString('base64');
	pg.connect(pgsqlOptions, function(err, client, done){
		client.query('update "keys" set "write_token"= $1 where "Username" = $2 ;'
		,[write_token,username]
		 ,function (sqlerr,sqlres){
			if (sqlerr)  res.writeHead(500);
			else if(typeof sqlres === 'undefined'){
				res.writeHead(400);
			}else {
				client.query('select  "pub_key" from "keys"  where "Username" = $1;'
				,[username]
				,function (sqlerr,sqlres){
					done();
					if (sqlerr)  res.writeHead(500);
					else if(!sqlres.rowCount)
						res.writeHead(404);
					else if(typeof sqlres.rows[0] === 'undefined')
						res.writeHead(500);
					else{
						var key = openpgp.key.readArmored(sqlres.rows[0].pub_key).keys[0];
						return sendEnc(key,write_token);
					}
					res.end();
				});
				return;
			}
			res.end();
			done();
		});
	});
 
 
 }
 function sendEnc( key, data ){
 	 res.writeHead(200, { 'Content-Type': 'text/plain' });
	 openpgp.encryptMessage(key,data).then( function (a){res.write(a); res.end();});
 };

 function update(){
	 var username = req.headers['x-authentication-user'];
	 var token = req.headers['x-authentication-token'];
	 pg.connect(pgsqlOptions, function(err, client, done){
	 	var params = [Buffer.concat(data).toString('ascii'), username, token];
		 client.query('update "keys" set "secret_data" = $1 where "Username" = $2 and "write_token" = $3 returning "secret_data";'
		 //we can make a 3-way auth by sending salt to the client and comparing hashes
		 ,params
		 ,function (sqlerr,sqlres){
			if (sqlerr)  res.writeHead(500);
			else if(typeof sqlres === 'undefined') res.writeHead(400);
			else if (sqlres.rowCount == 0 )res.writeHead(400);
			else res.writeHead(204);
			res.end();
			done();
		});
	});

 } 
 function post(){
	 var type = req.headers['x-content-type'];
	 var token = req.headers['x-content-token']; 
	 if (type == 'comment')type = 'comments';
	 else if (type == 'post')type = 'posts';
	 else {
		 res.writeHead(400);
		 res.end();
	 }
	 pg.connect(pgsqlOptions, function(err, client, done){
		 client.query('insert into '+ type +' ("createdAt", "body", "token" ) values (current_timestamp, $1, $2)'
		 +'RETURNING "id", "createdAt", "body";'
		 //we can make a 3-way auth by sending salt to the client and comparing hashes
		 , [Buffer.concat(data).toString('ascii'), token]
		 ,function (sqlerr,sqlres){
			if (sqlerr)  {
				res.writeHead(500);
				console.log(sqlerr);
			}
			else if(!sqlres.rowCount)
				res.writeHead(404);
			else if(typeof sqlres.rows[0] === 'undefined')
				res.writeHead(500);
			else{
				 res.writeHead(200, { 'Content-Type': 'text/json' });
				 res.write(JSON.stringify({'posts':sqlres.rows[0]}));
			 }
			 res.end();
			 done();
		 });
	 });
 } 
 function deleteP(){
	 var username = req.headers['x-authentication-user'];
	 var token = req.headers['x-access-token'];
	 var postid = req.headers['x-content-id'];
	 var type= req.headers['x-content-type'];
	 if (type == 'comment')type = 'comments';
	 else if (type == 'post')type = 'posts';
	 else {
		 res.writeHead(400);
		 res.end('wrong type');
		 return;
	 }
	 if(!token || !postid){
		 res.writeHead(400);
		 res.end('parameters missing');
		 return;
	 }
	 pg.connect(pgsqlOptions, function(err, client, done){
		 client.query('DELETE from '+type+' where "id" = $1 and "token" = $2;'
		 //we can make a 3-way auth by sending salt to the client and comparing hashes
		 , [postid,token]
		 ,function (sqlerr,sqlres){
			 if (sqlerr) {
				res.writeHead(500);
				console.log(sqlerr);
			 } else if(typeof sqlres === 'undefined') res.writeHead(400);
			 else if (!sqlres.rowCount) res.writeHead(400);
			 else{
				res.writeHead(204);
			 }
			 res.end();
			 done();
		 });
	 });

 } 
 function editP(){
	 var type= req.headers['x-content-type'];
	 var token = req.headers['x-access-token'];
	 var newToken = req.headers['x-content-token']; 
	 var id = req.headers['x-content-id']; 
	 if (type == 'comment')type = 'comments';
	 else if (type == 'post')type = 'posts';
	 else {
		 res.writeHead(400);
		 res.end('wrong type');
		 return;
	 }
	 if(!token || !newToken || !id){
		 res.writeHead(400);
		 res.end('parameters missing');
		 return;
	 }
	 pg.connect(pgsqlOptions, function(err, client, done){
		 client.query('UPDATE '+type+' set "body" = $1, "token" = $2 where "id" = $3 and "token" = $4 '
		 +'RETURNING "id", "createdAt", "body";'
		 //we can make a 3-way auth by sending salt to the client and comparing hashes
		 , [ Buffer.concat(data).toString('ascii'), newToken, id, token ]
		 ,function (sqlerr,sqlres){
			if (sqlerr) {
				res.writeHead(500);
				console.log(sqlerr);
			} else if(typeof sqlres === 'undefined') res.writeHead(400);
			else if (!sqlres.rowCount) res.writeHead(404);
			else{
				res.writeHead(200);
				res.write(JSON.stringify({'posts':sqlres.rows[0]}));
			}
			res.end();
		 	done();
		 });
	 });
 } 
 function sendUserPriv(){
	var username = req.headers['x-authentication-user'];
	pg.connect(pgsqlOptions, function(err, client, done){
		client.query('SELECT  "secret_data" FROM "keys"  WHERE "Username" = $1;',[username]
		,function (sqlerr,sqlres){
			if (sqlerr)  res.writeHead(500);
			else if(!sqlres.rowCount)
				res.writeHead(404);
			else if(typeof sqlres.rows[0] === 'undefined')
				res.writeHead(500);
			else{
				res.writeHead(200, { 'Content-Type': 'text/plain' });
				res.write(sqlres.rows[0].secret_data);
			}
			res.end();				
			done();
		});
	}); 
 }
 function defaultAction (){
	 console.log('no better thing to do');
	 res.writeHead(400, { 'Content-Type': 'text/plain' });
	 res.write('This service is new and, you know...');
	 res.end();;
  }
 }
 }());

