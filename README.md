goauth
======

An express middleware that handles OAuth and Local logins.

## installation

	$ npm install goauth

## usage

you create an authentication app - which can then be mounted onto a connect / express middleware based web server.

```js
var express = require('express');
var goauth = require('goauth');

var app = express();

// create the auth server and configure the paths for login, register and connect actions
// these paths will be relative to where you mount the auth server onto the web server
// in our example we will use the defaults:
//
//		/auth/login
//		/auth/register
//		/auth/connect
//
// we also give provider keys for OAuth logins
// these are mounted at the 'connect' path so:
//
//		/auth/connect/facebook
//
// for example

var auth = goauth({
	paths:{
		login:'/login',
		register:'/register',
		connect:'/connect'
	},
	// here we activate
	providers:{
		facebook:{
			apikey:'...',
			secret:'...'
		}
	}

});

// the user is logging in
//	data:
//		username
//		password

auth.on('login', function(data, callback){

})

// the user is registering a new account

auth.on('register', function(data, callback){

})

// the user is connecting an api to an account
//	data:
//		user 				- the top level user account being connected to
//		provider
//		password

auth.on('connect', function(data, callback){
	
})

// mount the auth server onto the web server
app.use('/auth', auth);

// the rest of our website is here
app.use(express.static(__dirname + '/www'));

app.listen(80, function(){

})
```