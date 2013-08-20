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
var express = require('express');
var _ = require('lodash');

module.exports = function(options){

	options = options || {};
	
	var paths = _.defaults(options.paths || {}, {
		status:'/status',
		login:'/login',
		logout:'/logout',
		register:'/register',
		connect:'/connect',
		post_login:'/',
		post_register:'/'
	})

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
		var user = req.session.user || {};

	  var ret = {};

	  for(var prop in user){
	    if(prop.charAt(0)!='_'){
	      ret[prop] = user[prop];
	    }
	  }

	  res.json(ret);
	})

	/*
	
		LOGIN
		
	*/
	app.post(paths.login, function(req, res, next){
		app.emit('login', req.body || {}, function(error, result){
			if(error){
				res.json([error])
			}
			else{
				req.session.user = result;
				res.json([null, result, paths.post_login]);
			}
		})
	})

	/*
	
		REGISTER
		
	*/
	app.post(paths.register, function(req, res, next){
		app.emit('register', req.body || {}, function(error, result){
			if(error){
				res.json([error])
			}
			else{
				req.session.user = result;
				res.json([null, result, paths.post_register]);
			}
		})
	})

	/*
	
		CONNECT SERVICES
		
	*/
	app.get(paths.connect + '/:service', authom.app);

	authom.on("auth", function(req, res, data) {
		console.log('-------------------------------------------');
		console.log('authenticated with service!');
		console.dir(data);
		var connect_data = {};
		app.emit('connect', connect_data, function(error, result){
			
		})
	})

	authom.on("error", function(req, res, data) {
	  console.log('-------------------------------------------');
		console.log('error with service!');
		console.dir(data);
	})

	_.each(providers, function(config, name){
		var service = authom.createServer({
			name: name,
		  service: config.provider || name,
		  id: config.id,
		  secret: config.secret,
		  scope: config.scope || []
		})

		services[name] = service;
	})

	return app;
}