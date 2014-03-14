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
//var OAuth2Provider = require('oauth2-provider').OAuth2Provider
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
	//var crypt_key = options.crypt_key || 'crypt_key';
	//var sign_key = options.sign_key || 'sign_key';
	//var myOAP = new OAuth2Provider({crypt_key: crypt_key, sign_key: sign_key});

	var providers = options.providers || {};

	/*
	
		we create authom handlers into here
		
	*/
	var services = {};

	var app = express();

	/*
	
		LOGOUT
		
	*/
	app.get(paths.logout, function(req, res, next){
		req.session.destroy();
		res.redirect('/');
	})

	/*
	
		USER STATUS
		
	*/
	app.get(paths.status, function(req, res, next){
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
	app.post(paths.login, function(req, res, next){

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
					active:{
						digger:true
					},
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
	app.post(paths.register, function(req, res, next){

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
					active:{
						digger:true
					},
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
	app.post(paths.update, function(req, res, next){
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
		config = config || {};
		if(config.id && config.secret){
			var options = _.extend(config, {
				service:name
			})
			var service = authom.createServer(options);
			services[name] = service;	
		}
		
	})

	app.get('/:service', function(req, res, next){
		if(!services[req.params.service]){
			return next();
		}
		authom.app(req, res, next);
	});

	return app;
}