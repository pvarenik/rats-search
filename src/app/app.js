import React, { Component } from 'react';
import './app.css';
import './router';
import PagesPie from './pages-pie.js';
//import registerServiceWorker from './registerServiceWorker';
import injectTapEventPlugin from 'react-tap-event-plugin';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';

import {Header} from './header'
import Footer from './footer'

const { ipcRenderer, remote } = require('electron');
window.currentWindow = remote.getCurrentWindow()

//var io = require("socket.io-client");
//window.torrentSocket = io(document.location.protocol + '//' + document.location.hostname + (process.env.NODE_ENV === 'production' ? '/' : ':8095/'));
 window.torrentSocket = {}
 window.torrentSocket.callbacks = {}
 window.torrentSocket.listeners = {}
 window.torrentSocket.on = (name, func) => {
	const newListener = (event, ...data) => {
        func(...data)
    }
	window.torrentSocket.listeners[func] = newListener
 	ipcRenderer.on(name, newListener);
 }
 window.torrentSocket.off = (name, func) => {
 	if(!func)
 		ipcRenderer.removeAllListeners(name);
	 else
	 {
		const realListener = window.torrentSocket.listeners[func]
		if(realListener)
		{
			ipcRenderer.removeListener(name, realListener);
			delete window.torrentSocket.listeners[func]
		}
	 }
 }
 window.torrentSocket.emit = (name, ...data) => {
 	if(typeof data[data.length - 1] === 'function')
 	{
 		const id = Math.random().toString(36).substring(5)
		window.torrentSocket.callbacks[id] = data[data.length - 1];
		data[data.length - 1] = {callback: id}
 	}
 	ipcRenderer.send(name, data)
 }
 ipcRenderer.on('callback', (event, id, data) => {
 	const callback = window.torrentSocket.callbacks[id]
 	if(callback)
 		callback(data)
 	delete window.torrentSocket.callbacks[id]
 });


 ipcRenderer.on('url', (event, url) => {
	 console.log('url', url)
	 router(url)	
 });


// Needed for onTouchTap 
// http://stackoverflow.com/a/34015469/988941 
injectTapEventPlugin();

//registerServiceWorker();

let loadersCount = 0;
let appReady = false;
window.customLoader = (func, onLoading, onLoaded) => {
	loadersCount++;
	if(onLoading) {
		onLoading();
	}
	return (...args) => {
		func(...args);
		if(onLoaded) {
			onLoaded();
		}
		loadersCount--;
	}
};

window.isReady = () => {
	return (appReady && loadersCount === 0)
}

window.peers = 0;
window.peersTorrents = 0;

class App extends Component {
	componentDidMount() {
		window.router()
		appReady = true;

		window.torrentSocket.on('peer', (peer) => {
			if(peer.size > window.peers)
				window.peersTorrents = (window.peersTorrents || 0) + peer.torrents
			else
				window.peersTorrents = (window.peersTorrents || 0) - peer.torrents
			window.peers = peer.size
			this.forceUpdate()
		})

		window.torrentSocket.emit('peers', (peers) => {
			if(peers.size > 0 || window.peers == 1)
			{
				window.peers = peers.size
				window.peersTorrents = peers.torrents
				this.forceUpdate()
			}
		})

		window.torrentSocket.emit('p2pStatus', (status) => {
			if(status == 0)
				return

			window.p2pStatus = status
			this.forceUpdate()
		})
		window.torrentSocket.on('p2pStatus', (status) => {
			window.p2pStatus = status
			this.forceUpdate()
		})
	}
	componentWillUnmount() {
		appReady = false;
	}
	render() {
		return (
			<MuiThemeProvider>
				<div>
					{
						!window.currentWindow.isModal()
						&&
						<Header />
					}
					<PagesPie />
					<Footer />
				</div>
			</MuiThemeProvider>
		);
	}
}

export default App;
