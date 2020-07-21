"use strict";
const WebSocket = require('ws')
const { shim } = require('lib/shim.js');

var activeConnections = []; 

class CollabServerMgr { 
	constructor(url, credentials) { 
		this.credentials = credentials
		this.users = [];
		this.notes = [];

		this.sharedKey = [-367688007,-1351302050,1933088759,2096362705,-792550865,934696682,-925181213,-2138181379]; 		
		this.url = 'ws://localhost:8080'
		this.connection = new WebSocket(this.url, [ JSON.stringify(this.credentials) ])
		activeConnections.push(this.connection); 

		this.connection.onopen = () => {
			console.log('ShareClient connected to; ' + this.url);
		}
		 
		this.connection.onerror = (error) => {
		  console.log(`WebSocket error: ${error}`)
		}
		 
		this.connection.onmessage = (e) => {
			var msg=JSON.parse(e.data);
			
	  		}
		}

	accessNote(noteId) { 
		const message = {
			type: 'accessNote',
			'noteId': noteId
		}
		this.connection.send(JSON.stringify(message));
		console.log('sending accesNote message');

	}

	getClientConnection() { 
		return activeConnections; 
	}

	destroy() { 
		activeConnections[0].close();
		activeConnections.splice(0) 
		console.log('destroy(): activeConnections.length: ' + activeConnections.length)
	}
}
module.exports = CollabServerMgr; 

