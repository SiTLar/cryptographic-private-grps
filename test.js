"use strict";
var username = "testo"
var password = "testo"
var srvurl = "https://moimosk.ru/cgi/secret";
var authsrv = "https://micropeppa.freefeed.net/v1/";
var https = require("https");
var XMLHttpRequest =  require("xhr2");
var openpgp = require("openpgp");
var testData = "qwertyuiop[]asdfghjkl;zxcvbnm,./";
var tokenPP;
var token;
var keyPuA;
var keyPrA;
function auth(){
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		if(this.status < 400){	
			tokenPP = JSON.parse(this.response).authToken;
			openpgp.generateKeyPair({numBits: 1024, userId: username, passphrase: "",unlocked: true })
			.then (function (a){
					keyPuA = a.publicKeyArmored;
					keyPrA = a.privateKeyArmored;
					register();
			});
		//	initDoc();

		}else console.log("Cannot auth on micropeppa %d: %s, %s", oReq.status, oReq.statusText, oReq.response);
	};
	oReq.open("post", authsrv+"session", true);
	oReq.setRequestHeader("X-Authentication-Token", "");
	oReq.setRequestHeader("Content-type","application/x-www-form-urlencoded");
	oReq.send("username="+username+"&password="+password);
}

function register(){
	var oReq = new XMLHttpRequest();
	oReq.onload = function(){
		if(oReq.status < 400){
			var res = JSON.parse(oReq.response);
			var oReqS = new XMLHttpRequest();
			oReqS.open("POST", srvurl+"?register");
			oReqS.onload = function(){
				if(oReqS.status < 400){ 
					var msgEnc = openpgp.message.readArmored(oReqS.response);
					var dkey = openpgp.key.readArmored(keyPrA);
					openpgp.decryptMessage(dkey.keys[0],msgEnc);
					.then(function(msg){
						token = msg;
						console.log("OK register "+msg);
						update();
					});
					var oReqD = new XMLHttpRequest();
					oReqD.open("delete",authsrv+"posts/"+res.posts.id);
					oReqD.setRequestHeader("X-Authentication-Token",tokenPP );
					oReqD.send();

				}else console.log("Register %d: %s", oReqS.status, oReqS.statusText);
			}
			oReqS.setRequestHeader("Content-type","text/plain");
			oReqS.send(res.posts.id);
		}else reject();
	};
	

	oReq.open("post",authsrv+"posts" ,true);
	oReq.setRequestHeader("X-Authentication-Token", tokenPP);
	oReq.setRequestHeader("Content-type","application/json");
	var post = new Object();
	post.body = keyPuA ;
	var postdata = new Object();
	postdata.post = post;
	postdata.meta = new Object();
	postdata.meta.feeds = username; 
	oReq.send(JSON.stringify(postdata));
}

function update(){
	var oReq = new XMLHttpRequest();
	oReq.open("POST", srvurl+"?update" );
	oReq.onload = function(){
		if(oReq.status < 400){
			console.log("OK update");
			getPriv();
		}else	console.log("Update %d: %s", oReq.status, oReq.statusText);
	}
	oReq.setRequestHeader("X-Authentication-Token",token);
	oReq.setRequestHeader("X-Authentication-User",username);
	oReq.send(testData);
}
function getPriv(){
	var oReq = new XMLHttpRequest();
	oReq.open("GET", srvurl+"?data" );
	oReq.onload = function(){
		if(oReq.status < 400){
			if(oReq.response == testData )console.log("OK get private data");
			newPost();
		}else console.log("Get private data %d: %s", oReq.status, oReq.statusText);
	}
	oReq.setRequestHeader("X-Authentication-User",username);
	oReq.send();
}
function newPost(){
	var oReq = new XMLHttpRequest();
	oReq.open("post",srvurl+"?post", true);
	oReq.setRequestHeader("x-content-type", "post"); 
	oReq.setRequestHeader("Content-type","text/plain");
	oReq.setRequestHeader("x-content-token", ".;dlvn;dl"); 
	oReq.onload = function(){
		console.log(oReq);
		if(oReq.status < 400){
			if(res.posts.body == testData )console.log("OK new post");
			else console.log(res);
		}else	console.log("New post %d: %s", oReq.status, oReq.statusText);
	}
	oReq.send(testData);
}
auth();
