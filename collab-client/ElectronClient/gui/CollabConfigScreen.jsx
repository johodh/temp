const React = require('react');
const { connect } = require('react-redux');
const { bridge } = require('electron').remote.require('./bridge');
const { themeStyle } = require('lib/theme');
const { _ } = require('lib/locale.js');
const ClipperServer = require('lib/ClipperServer');
const Setting = require('lib/models/Setting');
const { clipboard } = require('electron');
const ExtensionBadge = require('./ExtensionBadge.min');
const collabManager = require('lib/collab/manager.js'); 

class CollabConfigScreenComponent extends React.Component {
	constructor() {
		super();
		this.copyToken_click = this.copyToken_click.bind(this);
		this.serverConnect = this.serverConnect.bind(this);
		this.catchName = this.catchName.bind(this); 
		this.catchServer = this.catchServer.bind(this); 
		this.catchUsername = this.catchUsername.bind(this);
		this.catchPassword = this.catchPassword.bind(this);
		this.serverChange = this.serverChange.bind(this); 
		this.deleteServer = this.deleteServer.bind(this); 
		this.state = {
			savedservers: Setting.value('collab.servers'),
		}

		console.log(this.props);
	}

	disableClipperServer_click() {
		Setting.setValue('clipperServer.autoStart', false);
		ClipperServer.instance().stop();
	}

	enableClipperServer_click() {
		Setting.setValue('clipperServer.autoStart', true);
		ClipperServer.instance().start();
	}

	copyToken_click() {
		clipboard.writeText(this.props.apiToken);

		alert(_('Token has been copied to the clipboard!'));
	}

	catchName(event) { 
		this.setState({ name: event.target.value })
	}

	catchServer(event) { 
		this.setState({ server: event.target.value }) 
	}

	catchUsername(event) { 
		this.setState({ username: event.target.value }) 
	}
	
	catchPassword(event) { 
		this.setState({ password: event.target.value }) 
	}

	serverChange(event) { 
		this.setState({ chosen: event.target.value }) 
	}

	deleteServer(event) { 
		var savedServers = this.state.savedservers;
		Setting.deleteObjectKey('collab.servers', this.state.chosen);
		delete savedServers[this.state.chosen]; 
		this.setState({ savedservers: savedServers }); 
		console.log(this.state.savedservers); 
	}

	serverConnect() { 
		if (this.state !== null) {
		var savedServers = Setting.value('collab.servers');
		alert(_('Connecting to ' + this.state.server)); 
		const server = { host: this.state.server, username: this.state.username, password: this.state.password }; 
		Setting.setObjectKey('collab.servers', this.state.name, server)
		savedServers[this.state.name] = server;
		this.setState({ savedservers: savedServers }); 
		} else { alert(_('Fill in credentials')) } 
	}
	render() {
		const theme = themeStyle(this.props.theme);

		const containerStyle = Object.assign({}, theme.containerStyle, {
			overflowY: 'scroll',
		});

		const buttonStyle = Object.assign({}, theme.buttonStyle, { marginRight: 10 });

		const stepBoxStyle = {
			border: '1px solid',
			borderColor: theme.dividerColor,
			padding: 15,
			paddingTop: 0,
			marginBottom: 15,
			backgroundColor: theme.backgroundColor,
		};

		const webClipperStatusComps = [];

		const apiTokenStyle = Object.assign({}, theme.textStyle, {
			color: theme.colorFaded,
			wordBreak: 'break-all',
			paddingTop: 10,
			paddingBottom: 10,
		});
		var options = []; 	
		if (this.state.savedservers) { 
			var key; 
			for (key in this.state.savedservers) { 
				if (this.state.savedservers.hasOwnProperty(key)) {
					options.push(
						<option value={key} key={key}>
						{key}
						</option>
					);
				}
			}
		}

		return (
			<div>
				<div style={containerStyle}>
					<div style={{ padding: theme.margin }}>
						<p style={theme.textStyle}>{_('In order to collaborate with another Joplin user you need access to a collab-server.')}</p>

						<div style={stepBoxStyle}>
							<p style={theme.h1Style}>{_('Step 1: Create a private/public keypair')}</p>
						</div>

						<div style={stepBoxStyle}>
							<p style={theme.h1Style}>{_('Step 2: Connect to a collab-server')}</p>
							<label style={theme.textStyle}>
  				                 	<input onChange={this.catchName} placeholder="Name" /><br /><br />
							</label>
							<label style={theme.textStyle}>
  				                 	<input onChange={this.catchServer} placeholder="Host Address/Ip:Port"/><br /><br />
							</label>
							<label style={theme.textStyle}>
 							 <input onChange={this.catchUsername} placeholder="Username" /><br /><br />
							</label>
							<label style={theme.textStyle}>
 							 <input onChange={this.catchPassword} placeholder="Password" /><br /><br />
							</label>
 							<button onClick={this.serverConnect}>Add server</button>
							<div style={{ display: 'flex', flexDirection: 'row' }}>
							</div>
						</div>
						<div style={stepBoxStyle}>
						<select onChange={this.serverChange}> {options} </select><br />
						<button onClick={this.deleteServer}>Delete</button>
						</div>
					</div>
				</div>
			</div>
		);
	}
}

const mapStateToProps = state => {
	return {
		theme: state.settings.theme,
		collabAutoConnect: true
	};
};

const CollabConfigScreen = connect(mapStateToProps)(CollabConfigScreenComponent);

module.exports = { CollabConfigScreen };
