"use strict"; 
var Range = ace.acequire('ace/range').Range

var collabColors = [ 'rgba(135,175,215', 'rgba(255,175,95', 'rgba(135,175,95' ]; 
class Collaborator {
	constructor(uid, username, currentLine) {
		// fix user identities
		this.uid = uid; 
		this.username = username; 
		this.currentLine = currentLine;
		this.lastMarker = null;
		this.selection = null; 
		this.styleTag = document.createElement('style');
		this.styleTag.type = "text/css";
		this.styleTag.Css = '.cursor_uid_' + this.uid +' { position: absolute; z-index: 10; color: #000000; background-image: linear-gradient(to right, ' + collabColors[uid] +',0), ' + collabColors[uid] + ',1)); } .cursor_uid_' + this.uid + '::after { float: right; content: "< ' + this.username + '"; font-size: x-small; color: white; }';
		this.styleTag.appendChild(document.createTextNode(this.styleTag.Css));
		document.head.appendChild(this.styleTag); 
	}

	moveCursor(uid, pos, session) {
		session.removeMarker(this.lastMarker);
		this.lastMarker = session.addMarker(new Range(pos,1,pos,2),"cursor_uid_" + this.uid,"fullLine");
	}

	updateSelection(uid, pos, session) {
		session.removeMarker(this.lastSelection);
		//console.log(typeof(pos));
		//console.log(pos);
		//console.log(pos.start.row);
		//console.log(pos.start.column);
		//console.log(pos.end.row);
		//console.log(pos.end.column);
		if (pos.end.column-pos.start.column > 1 || pos.end.row !== pos.start.row) {
		this.lastSelection = session.addMarker(new Range(pos.start.row, pos.start.column, pos.end.row, pos.end.column), "ace_active-line", "text");
		}
	}

	disconnect() { 
		// TODO: remove markers and styletags
	}
}

module.exports = Collaborator; 
