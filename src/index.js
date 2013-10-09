/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/*
  Module dependencies.
*/

var authom = require('authom');
var OAuth2Provider = require('oauth2-provider').OAuth2Provider
var express = require('express');
var _ = require('lodash');

module.exports = function(options){

	options = options || {};
	
	var route = options.id || '/auth';
	

	var paths = _.defaults(options.paths || {}, {
		status:'/status',
		update:'/update',
		login:'/login',
		logout:'/logout',
		register:'/register',
		connect:'/connect',
		post_login:'/',
		post_register:'/'
	})

	// oauth server
	var crypt_key = options.crypt_key || 'crypt_key';
	var sign_key = options.sign_key || 'sign_key';
	var myOAP = new OAuth2Provider({crypt_key: crypt_key, sign_key: sign_key});

	var providers = options.providers || {};

	/*
	
		we create authom handlers into here
		
	*/
	var services = {};

	var app = express();

	/*
	
		LOGOUT
		
	*/
	app.get(route + paths.logout, function(req, res, next){
		req.session.destroy();
		res.redirect('/');
	})

	/*
	
		USER STATUS
		
	*/
	app.get(route + paths.status, function(req, res, next){
		var auth = req.session.auth || {};
		var user = null;

		if(auth.loggedIn){
			user = auth.user;
		}

	  res.json(user);
	})

	/*
	
		LOGIN
		
	*/
	app.post(route + paths.login, function(req, res, next){

		var format = req.query.format || 'json';

		app.emit('login', req.body || {}, function(error, result){
			if(error){
				if(format=='json'){
				  res.json([error])
				} else {
				  res.redirect(paths.login + '?message=incorrect_details')
				}
			}
			else{
				req.session.auth = {
					loggedIn:true,
					user:result
				}

				if(format=='json'){
				  res.json([null, result, paths.post_login]);
				} else {
				  res.redirect(paths.post_login)
				}
				
			}
		})
	})

	/*
	
		REGISTER
		
	*/
	app.post(route + paths.register, function(req, res, next){

		var format = req.query.format || 'json';
		
		app.emit('register', req.body || {}, function(error, result){
			if(error){
				if(format=='json'){
				  res.json([error])
				} else {
				  res.redirect(paths.login + '?message=incorrect_details')
				}
			}
			else{
				req.session.auth = {
					loggedIn:true,
					user:result
				}
				if(format=='json'){
				  res.json([null, result, paths.post_register]);
				} else {
				  res.redirect(paths.post_register)
				}
				
			}
		})
	})

	/*
	
		UPDATE
		
	*/
	app.post(route + paths.update, function(req, res, next){
		var auth = req.session.auth || {};
		if(!auth.loggedIn){
			res.statusCode = 401;
			res.send('not authorized');
			return;
		}
		var user = auth.user;
		for(var prop in (req.body || {})){
			auth.user[prop] = req.body[prop];
		}
		
		app.emit('update', user, req.body || {}, function(error, result){
			if(error){
				res.json([error])
			}
			else{
				res.json([null, true]);
			}
		})
	})

	authom.on("auth", function(req, res, data) {
		var connect_data = {};
		var auth = req.session.auth || {};
		var user = auth.user;
		app.emit('connect', user, data, function(error, result){
			if(error){
			  res.redirect(paths.login + '?error=' + error)
			}
			else{
				if(!req.session.auth){
					var active = {};
					active[data.service] = true;
					req.session.auth = {
						loggedIn:true,
						user:result,
						active:active
					}	
				}
				else{
					var auth = req.session.auth || {};
					var active = auth.active || {};

					auth.user = result;
					auth.loggedIn = true;
					active[data.service] = true;
					auth.active = active;

					req.session.auth = auth;
				}
				
			  res.redirect(paths.post_login)
				
			}
		})
	})

	authom.on("error", function(req, res, data) {
		res.redirect(paths.login);
	})

	_.each(providers, function(config, name){
		var options = _.extend(config, {
			service:name
		})
		var service = authom.createServer(options);
		services[name] = service;
	})




	// before showing authorization page, make sure the user is logged in
	myOAP.on('enforce_login', function(req, res, authorize_url, next) {
	  if(req.session.user) {
	    next(req.session.user);
	  } else {
	    res.writeHead(303, {Location: paths.login + '?next=' + encodeURIComponent(authorize_url)});
	    res.end();
	  }
	});

	// render the authorize form with the submission URL
	// use two submit buttons named "allow" and "deny" for the user's choice
	myOAP.on('authorize_form', function(req, res, client_id, authorize_url) {
	  //res.end('<html>this app wants to access your account... <form method="post" action="' + authorize_url + '"><button name="allow">Allow</button><button name="deny">Deny</button></form>');
	  app.emit('authorize_form', req, res, client_id, authorize_url);
	  
	});

	// save the generated grant code for the current user
	myOAP.on('save_grant', function(req, client_id, code, next) {
		app.emit('save_grant', req, client_id, code, next);
	})

	/*
	  if(!(req.session.user in myGrants))
	    myGrants[req.session.user] = {};

	  myGrants[req.session.user][client_id] = code;
	  next();
	});*/

	// remove the grant when the access token has been sent
	myOAP.on('remove_grant', function(user_id, client_id, code) {
		app.emit('remove_grant', user_id, client_id, code);
	  //if(myGrants[user_id] && myGrants[user_id][client_id])
	  //  delete myGrants[user_id][client_id];
	});

	// find the user for a particular grant
	myOAP.on('lookup_grant', function(client_id, client_secret, code, next) {
	  // verify that client id/secret pair are valid

	  app.emit('lookup_grant', client_id, client_secret, code, next);
	  /*
	  if(client_id in myClients && myClients[client_id] == client_secret) {
	    for(var user in myGrants) {
	      var clients = myGrants[user];

	      if(clients[client_id] && clients[client_id] == code)
	        return next(null, user);
	    }
	  }

	  next(new Error('no such grant found'));
	  */
	});

	// embed an opaque value in the generated access token
	myOAP.on('create_access_token', function(user_id, client_id, next) {
		app.emit('create_access_token', user_id, client_id, next);
	  //var extra_data = 'blah'; // can be any data type or null
	  //var oauth_params = {token_type: 'bearer'};

	  //next(extra_data/*, oauth_params*/);
	});

	// (optional) do something with the generated access token
	myOAP.on('save_access_token', function(user_id, client_id, access_token) {
	  //console.log('saving access token %s for user_id=%s client_id=%s', JSON.stringify(access_token), user_id, client_id);
	  app.emit('save_access_token', user_id, client_id, access_token);
	});

	// an access token was received in a URL query string parameter or HTTP header
	myOAP.on('access_token', function(req, token, next) {
	  var TOKEN_TTL = 10 * 60 * 1000; // 10 minutes

	  if(token.grant_date.getTime() + TOKEN_TTL > Date.now()) {
	    req.session.user = token.user_id;
	    req.session.data = token.extra_data;
	  } else {
	    console.warn('access token for user %s has expired', token.user_id);
	  }

	  next();
	});

	// (optional) client authentication (xAuth) for trusted clients
	/*
	myOAP.on('client_auth', function(client_id, client_secret, username, password, next) {
	  if(client_id == '1' && username == 'guest') {
	    var user_id = '1337';

	    return next(null, user_id);
	  }

	  return next(new Error('client authentication denied'));
	});
	*/


	/*
	
		CONNECT SERVICES
		
	*/

	app.get(route + '/:service', authom.app);

	return app;
}