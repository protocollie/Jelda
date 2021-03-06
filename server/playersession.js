function playerSession(socket) {

	// DEBUGGERY
	this.Name = 'Unknown Player';

	////////////////////////////////////////////////////////////
	// Contacts the player on their socket
	////////////////////////////////////////////////////////////
	this.SubscribeToEvent = function(event, callback) {

		// Send the message out over the socket
		socket.on(event, callback);

	};

	/////////////////////////////////////////////////////////////
	// Finishes logging in the player and populates the session
	////////////////////////////////////////////////////////////
	this.Login = function(token) {

		// DEBUGGERY
		this.Name = token;

	};

	////////////////////////////////////////////////////////////
	// Contacts the player on their socket
	////////////////////////////////////////////////////////////
	this.SendEventToPlayer = function(event, args) {

		// Send the message out over the socket
		socket.emit(event, args);

	};

};

////////////////////////////////////////////////////////////
// Exports
////////////////////////////////////////////////////////////
module.exports.PlayerSession = playerSession;