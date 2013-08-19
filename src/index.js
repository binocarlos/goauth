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
		login:'/login',
		register:'/register',
		connect:'/connect'
	})

	var providers = options.providers || {};

	/*
	
		we create authom handlers into here
		
	*/
	var services = {};

	var app = express();

	app.post(paths.login, function(req, res, next){
		console.log('-------------------------------------------');
		console.log('login route');
		var login_data = {};
		app.emit('login', login_data, function(error, result){

		})
	})

	app.post(paths.register, function(req, res, next){
		console.log('-------------------------------------------');
		console.log('register route');
		var register_data = {};
		app.emit('register', register_data, function(error, result){
			
		})
	})

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