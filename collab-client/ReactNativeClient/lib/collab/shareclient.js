"use strict";
const WebSocket = require('ws')
const Collaborator = require('./collaborator.js'); 
const { shim } = require('lib/shim.js');

var Range = ace.acequire('ace/range').Range
var activeConnections = []; 

class sClient { 
	constructor(editor, credentials) { 
		this.e2ee = true; 
		this.editor = editor; 
		this.credentials = credentials
		this.preventUpdateOnNewLine = false;
		this.preventUpdateOnBsp = false;
		this.lineHasChanged = false; 
		this.lastRow = 0;
		this.rowTextPostMove = ''; 
		this.rowText =''; 
		this.sharedKey = [-367688007,-1351302050,1933088759,2096362705,-792550865,934696682,-925181213,-2138181379]; 		
		const url = 'ws://localhost:8080'
		this.connection = new WebSocket(url, [ JSON.stringify(this.credentials) ])
		activeConnections.push(this.connection); 

		var collaborators = [];

		this.connection.onopen = () => {
			console.log('ShareClient connected to; ' + url);
			this.editor.container.addEventListener("keydown", this.onKeyDownEvent, true);
			this.editor.container.addEventListener("keypress", this.onKeyPressEvent);
			this.editor.container.addEventListener("cut", this.onCutEvent); 
//			this.editor.on("blur", console.log('EDITOR blur from shareclient'));
			this.editor.container.addEventListener("blur", console.log('EDITOR.CONTAINER blur'));

			// onPaste, onCursorChange and onSelectionChange are called from NoteText.jsx
		}
		 
		this.connection.onerror = (error) => {
		  console.log(`WebSocket error: ${error}`)
		}
		 
		this.connection.onmessage = (e) => {
			var msg=JSON.parse(e.data);

			if (msg.type === 'newCollaborator') {
				const currentLine = 0;
				var newCollaborator = new Collaborator(msg.uid, msg.username, currentLine); 
				collaborators[msg.uid] = newCollaborator;

			} else if (msg.type === 'getNote') {
				var length = this.editor.session.doc.getLength();
				this.editor.session.doc.removeFullLines(0,length);
				var body = msg.body.split('\n'); 
				var stringBody = ''; 

				for (let i = 0; i < body.length; i++) {
					if (body[i]) { 
						var line = this.e2ee ? shim.sjclModule.decrypt(this.sharedKey, body[i]) : body[i]; 
					} else { var line = '' } 
					stringBody += line + '\n'; 
				}
					poz = {row: 0, column: 0};
					this.editor.session.doc.insert(poz, stringBody); 

			} else if ( collaborators.length < 1 ) {
			        console.log('no collaborators yet..');	

			} else if ( msg.type === 'newLine' ) {
				// prevent updateLine as inserting line below will cause cursor to move if new line is above cursor, leading to an updateLine sent from here as well, duplicating a line.
				this.preventUpdateOnNewLine = true;
				this.editor.session.doc.insertFullLines(msg.lineFrom,['']);
			
			} else if ( msg.type === 'deleteLine' ) {
				this.editor.session.doc.removeFullLines(msg.lineFrom,msg.lineTo);

			} else if ( msg.type === 'updateLine' ) {
				const lineText = this.e2ee ? shim.sjclModule.decrypt(this.sharedKey, msg.lineText) : msg.lineText; 
				const lineLength = this.editor.session.getLine(msg.lineNo).length;
				this.editor.session.doc.replace(new Range(msg.lineNo,0,msg.lineNo,lineLength), lineText);

			} else if ( msg.type === 'updateNote' ) { 
			  	console.log( 'TITLE: ' + msg.title);
			  	console.log( 'BODY: ' + msg.body);
			
			} else if ( msg.type === 'paste' ) {
				console.log(msg.pos.row, msg.pos.column)
				this.editor.session.insert(msg.pos, msg.text); 

			} else if ( msg.type === 'cursorMove' ) {
				const docLength = this.editor.session.doc.getLength();
				console.log('docLength: ' + docLength);
				// sync document lengths, might not be needed when syncing docs functionality is solid.
				if (msg.cursorPos >= docLength) {
					var curzor = this.editor.getCursorPosition(); 
					for (var i=docLength; i<=msg.cursorPos; i++) {
					const lineLength = this.editor.session.getLine(i).length;
					var poz = {row: i, column: lineLength};
					// create newline if doesnt exist in local note. 
					this.editor.session.doc.insertMergedLines(poz,['','']);
					console.log('curzor.row: ' + curzor.row + ', i: ' + i); 
					if (curzor.row+1 == i) { 
						this.editor.gotoLine(curzor.row+1, curzor.column, 'False'); 
						console.log('curzor.row == i !!!');
					}
					}
				}
				collaborators[msg.uid].moveCursor(msg.uid, msg.cursorPos, this.editor.session);


			} else if ( msg.type === 'updateSelection' ) {
				const selection = JSON.parse(msg['selection']);
				collaborators[msg.uid].updateSelection(msg.uid, selection, this.editor.session);
			} else {
	  			//console.log(`${ip} : message: ${message}`)
	  		}
		}
	}

	// TODO: take noteId as arg. Make server take joplins noteId on creating new note, for simplicity. Joplins noteId should be unique enough.
	accessNote(noteId) { 
		const message = {
			type: 'accessNote',
	//		noteId: '3f4a1c0f4fba4dc89e4c9587d43e9fa1'
			'noteId': noteId
		}
		this.connection.send(JSON.stringify(message));
		console.log('sending accesNote message');

	}

	newLine(lineNo) { 
		const message = {
			type: 'newLine',
			'lineFrom': lineNo,
		};
		console.log('SENDING NEWLINE');
		this.connection.send(JSON.stringify(message));
	}

	deleteLine(lineFrom, lineTo) { 
		const message = {
			type: 'deleteLine', 
			'lineFrom': lineFrom,
			'lineTo': lineTo
		};
		this.preventUpdateOnNewLine = true; 
		this.connection.send(JSON.stringify(message));
	}
	// TODO: Below methods are all pushing TO server. Rename them for more clarity.
	updateLine(lineNo, lineText) {
		const data = this.e2ee ? shim.sjclModule.encrypt(this.sharedKey, lineText) : lineText;
		const message = { 
			type: 'updateLine', 
			'lineNo': lineNo, 
			'lineText': data 
		};
		this.connection.send(JSON.stringify(message)); 
	}

	paste(text, pos) {
		const data = this.e2ee ? shim.sjclModule.encrypt(this.sharedKey, text) : text;

		const message = { 
			type: 'paste',
			'text': text,
			'pos': pos
		}
		this.connection.send(JSON.stringify(message));
	}
	updateNote(noteTitle, noteBody) {
		const message = {
			type: 'updateNote', 
			title: noteTitle, 
			body: noteBody 
		};
		this.connection.send(JSON.stringify(message));
	}
		
	updateCursor(cursorPos) {
		const message = {
			type: 'cursorMove',
			'cursorPos': cursorPos
		};
		this.connection.send(JSON.stringify(message));
	}

	updateSelection(selection) {
		const message = {
			type: 'updateSelection',
			'selection': selection
		}
		this.connection.send(JSON.stringify(message));
	}

	removeInitialSpaces(rowText) { 
		return rowText.replace(/^\s+/g, '')
	}
// TODO: look over refactoring. change this.preventUpdateOnNewLine to something more generic. this.preventOnCursorChange? 

	getBrokenRows(range, enter = null) { 
		const startRow = this.editor.session.getLine(range.start.row);  
		const endRow = this.editor.session.getLine(range.end.row); 
		const brokenRow1 = startRow.slice(0,range.start.column);
		const brokenRow2 = endRow.slice(range.end.column, endRow.length);
		const response = enter ? [brokenRow1, brokenRow2] : brokenRow1+brokenRow2;
		return response;
	}

	sendDeletedLines() { 
		var range = this.selectionRange_; 
		if (range.end.row-range.start.row > 0) {
			this.deleteLine(range.start.row, range.end.row-1)
			this.updateLine(range.start.row, this.getBrokenRows(range));
		} else { return true }
	} 

	enterKeyOnSelection() { 
		var curzor = this.editor.getCursorPosition(); 
		var range = this.editor.getSelectionRange(); 
		if (range.end.row !== range.start.row) {
			if (range.end.row-range.start.row > 1) {
				this.deleteLine(range.start.row, range.end.row-2);
			}
				var brokenRows = this.getBrokenRows(range, true);

			if (curzor.column === range.end.column && curzor.row === range.end.row) {
				// for some reason pressing enter when cursor position is at the end of the selection range triggers onCursorChange an extra time. this must be prevented, or remote clients will receive the wrong line.. 
				this.preventUpdateOnNewLine = true; 
				//brokenRow2 = this.removeInitialSpaces(destinationLine);
				
			}
				this.updateLine(range.start.row, brokenRows[0]);
				this.updateLine(range.start.row+1, brokenRows[1]); 

		} else if (range.end.column-range.start.column > 0) {
				// single row range
				const startRowText = this.editor.session.getLine(range.start.row)
				const brokenRow1 = startRowText.slice(0,range.start.column);
				var brokenRow2 = startRowText.slice(range.end.column,startRowText.length);
				this.preventUpdateOnNewLine = true; 
				this.newLine(range.start.row+1)
				if (curzor.column === range.end.column) {
					this.preventUpdateOnNewLine = true; 
					// ace behaves weird here. sometimes it keeps the space and sometimes not. 
					// brokenRow2 = this.removeInitialSpaces(destinationLine); 
				}
				this.updateLine(range.start.row, brokenRow1);
				this.updateLine(range.start.row+1, brokenRow2); 
		} else { return true } 
	}

	delAndBspOnSelection() { 
		var curzor = this.editor.getCursorPosition(); 
		var range = this.selectionRange_  
		if (range.end.row !== range.start.row) {
			if (range.end.row-range.start.row > 0) {
				this.deleteLine(range.start.row+1, range.end.row);
			}

				var joinedRows = this.getBrokenRows(range); 
			if (curzor.column === range.end.column && curzor.row === range.end.row) {
				this.preventUpdateOnNewLine = true; 
				//brokenRow2 = this.removeInitialSpaces(destinationLine);
				
			}
				this.updateLine(range.start.row, joinedRows);

		} else { return true } 
	}

// below methods are called by eventlisteners that are defined in constructor. should be defined only if connection succeeds. TODO: remove eventlisteners on disconnect. 

	onKeyDownEvent = event => {
		var curzor = this.editor.getCursorPosition(); 
		this.selectionRange_ = this.editor.getSelectionRange(); 
		// On active editor selection this.enterKeyOnSelection overrides. 
		// enter (13) 
		if (event.keyCode === 13 && this.enterKeyOnSelection()) {
			if (curzor.column === 0) {
				this.newLine(curzor.row);
			} else {
				var currentRowText = this.editor.session.getLine(curzor.row);
				var rowLength = currentRowText.length
				this.newLine(curzor.row+1) 
				// send copy of the moved part of the line to collaborators. as there is a preventUpdateOnNewLine on the receiving end this update will take precedence.
				if (curzor.column !== rowLength) {
				// when joining two lines by backspace and then pressing enter directly, the line you're pressing enter on won't have changed by the current logic, so i need this extra test to say it has. if i dont, the complete line will be sent to collaborators on enter, instead of the sliced one. (i'm referring to the updateLine induced by cursorChange, not the one below.  
				this.lineHasChanged = true;
				// remove initial space if any, to make remote same as local (it will be removed by ace locally)
				const formattedRow = currentRowText.slice(curzor.column,rowLength).replace(/^\s+/g, '')
				this.updateLine(curzor.row+1, formattedRow);
				}
			}
		}
		// delete (46) 
		else if (event.keyCode === 46 && this.delAndBspOnSelection()) { 
			const docLength = this.editor.session.doc.getLength();
			// delete current line if empty and cursor on column 0
			// if on last row, dont send any changes. they will be sent with updateLine instead.
			if (curzor.row != docLength-1) {
				this.rowText = this.editor.session.getLine(curzor.row);
				if (curzor.column === 0 && !this.rowText) { 
					this.deleteLine(curzor.row, curzor.row) 
				}
				// delete next line if cursor at end of row 
				else if (curzor.column === this.rowText.length) {
					var joinedRow = this.rowText += this.editor.session.getLine(curzor.row+1);
					this.deleteLine(curzor.row+1, curzor.row+1)
					this.updateLine(curzor.row, joinedRow);
				}
			}
		}
		// backspace (8) 
		else if (event.keyCode === 8 && this.delAndBspOnSelection()) {
			if (curzor.column === 0 && curzor.row > 0) { 
				var prevRow = this.editor.session.getLine(curzor.row-1);
				var joinedRow = prevRow += this.editor.session.getLine(curzor.row); 
				// need to prevent lineUpdate when moving the text up, or remote client will get extra lines. (backspace on col 0 will fire onEditorCursorChange, leading to sent lineUpdate)
				this.preventUpdateOnBsp = true; 
				this.deleteLine(curzor.row-1, curzor.row-1);
				this.updateLine(curzor.row-1, joinedRow);
			} else if ( curzor.column === 0 && curzor.row === 0 ) {
				this.updateLine(curzor.row, this.editor.session.getLine(curzor.row));
			}
		};
	}

	onKeyPressEvent = event => {
		// Any key pressed on active selection will result in deleted lines. This change is pushed to server with sendDeletedLines. Enter is already caught onKeyDown. 
		if (event.charCode != 13) { 
			this.sendDeletedLines();
		}
		//console.log('onKeyPress. charCode = ' + event.charCode)
		//String.fromCharCode(char)
	};

	onCursorChangeEvent = () => {
	console.log('onCursorChange');
	var curzor = this.editor.getCursorPosition();
	if (curzor.row != this.lastRow) {
		this.rowTextPostMove = this.editor.session.getLine(this.lastRow);
		this.updateCursor(curzor.row);
		// any preventions? did we change the line? if not, send update.
		if ((!this.preventUpdateOnNewLine) && (!this.preventUpdateOnBsp) && (this.rowTextPostMove != this.rowText) || (this.lineHasChanged)) { 
			this.updateLine(this.lastRow, this.rowTextPostMove) 
		};
		this.preventUpdateOnNewLine = false;
		this.preventUpdateOnBsp = false;
		this.lineHasChanged = false; 
		this.rowText = this.editor.session.getLine(curzor.row);
	}
	this.lastRow = curzor.row;
};

	onSelectionChangeEvent = () => {
		var range = this.editor.getSelectionRange();
		this.updateSelection(JSON.stringify(range)) 
	};
	
	onPasteEvent = (string) => { 
		// Everything seems to work, except pasting on active single row selectionrange
		console.log('onPaste');
		var range = this.editor.getSelectionRange(); 
		var curzor = this.editor.getCursorPosition();
		if (range.end.row-range.start.row > 0) {
			this.deleteLine(range.start.row, range.end.row-1)
			this.updateLine(range.start.row, this.getBrokenRows(range));
		}
		this.paste(string.text, { row: range.start.row, column: range.start.column });
	}
	
	onCutEvent = () => {
		// Works for most part. TODO: range.start.row is not syncing correctly to remote. Probably because the local line operations lags behind the on cut eventlistener. Could probably be solved by caching the rows on keydown ctrl+x.
		console.log('onCut');
		console.log(this.selectionRange_); 
		// lineHasChanged is a temporary fix to mentioned sync problem. the line should update on cursorChange.. 
		this.lineHasChanged = true; 
		this.sendDeletedLines(); 
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
module.exports = sClient; 

