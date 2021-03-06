////////////////////////////////////////////////////////////
// Some globals
////////////////////////////////////////////////////////////
var TILE_SIZE = 32;

////////////////////////////////////////////////////////////
// The local cache. This stores behaviors, images, maps, etc.
////////////////////////////////////////////////////////////
var jeldaCache = function() {

	////////////////////////////////////////////////////////////
	// Variables
	////////////////////////////////////////////////////////////
	var cache = {
			map: {},
			tile: {},
			entity: {}
		},
		engine;

	////////////////////////////////////////////////////////////
	// getCachedAsset
	////////////////////////////////////////////////////////////
	var getCachedAsset = function(assetType, assetId, callback) {

		var net = engine.network,
			log = engine.logger;

		// If we can't find the asset, request it.
		if (cache[assetType][assetId] === undefined) {

			// Log that we're requesting it.
			log.LogEvent(assetType + ' asset with ID ' + assetId + ' not found in cache. Requesting from service...');

			// Request the asset
			net.GetAsset(assetType, assetId, function(asset) {

				// Log that we've got it
				log.LogEvent(assetType + ' asset with ID ' + assetId + ' retrieved. Caching and returning to request source...');				

				// Save the asset in the cache.
				cache[assetType][assetId] = asset;

				// Call the callback with the asset.
				callback(asset);

			});

		} else {

			// Log that it was cached all along
			log.LogEvent(assetType + ' asset with ID ' + assetId + ' cached. Returning to request source...');

			// Return the cached asset.
			callback(cache[assetType][assetId]);

		}

	};

	////////////////////////////////////////////////////////////
	// GetMap 
	////////////////////////////////////////////////////////////
	var getMap = function(mapId, callback) {

		getCachedAsset('map', mapId, callback);

	};

	////////////////////////////////////////////////////////////
	// GetMap 
	////////////////////////////////////////////////////////////
	var getEntity = function(entityId, callback) {

		getCachedAsset('entity', entityId, callback);

	};

	////////////////////////////////////////////////////////////
	// GetTile 
	////////////////////////////////////////////////////////////
	var getTile = function(tileId, callback) {

		getCachedAsset('tile', tileId, function(asset) {
			
			// We need to get the image data, too.
			asset.ImageData = new Image();

			// Callback when the image loads.
			asset.ImageData.onload = function() {

				// And execute the callback with our completed asset.
				callback(asset);

			};

			// And start the preload.
			asset.ImageData.src = asset.ImageUri;

		});

	};


	////////////////////////////////////////////////////////////
	// GetMultipleTiles 
	// * Requests many tile assets at once and returns when they're all retrieved.
	////////////////////////////////////////////////////////////
	var getMultipleTiles = function(assets, callback) {

		// Keep track of how many pending assets there are.
		var pendingAssets = assets.length, returnedAssets = [], log = engine.logger;

		// Log what's happening
		log.LogEvent('Requested ' + pendingAssets + ' assets from cache.');

		// Kick off cache requests for all the assets.
		for (var i = 0; i < assets.length; i++) {

			// We need to capture the value of i, because we're going to return an array with all the tiles in the correct order.
			(function(i) {

				// Kick off a request for this asset
				getTile(assets[i], function(asset) {

					// Add the returned asset to the array
					returnedAssets[i] = asset;

					// We have one less outstanding request
					pendingAssets -= 1;

					// And if they're all done...
					if (pendingAssets === 0) {

						log.LogEvent('All assets retrieved.');

						// Return the request assets.
						callback(returnedAssets);

						// Leave this method.
						return;

					}
	
					// Log that we're still waiting.
					log.LogEvent('Still ' + pendingAssets + ' pending assets from cache.');

				});

			})(i);

		};
	};
	
	////////////////////////////////////////////////////////////
	// Initialize 
	////////////////////////////////////////////////////////////
	var initialize = function(e) {

		// Save the engine reference
		engine = e;

		// Log that network connection has been initialized.
		engine.logger.LogEvent('Initialized cache.');

		// Return that everything worked out okay.
		return true;

	};

	////////////////////////////////////////////////////////////
	// Expose the things we want to expose
	////////////////////////////////////////////////////////////
	return {
		GetEntity: getEntity,
		GetMap: getMap,
		GetMultipleTiles: getMultipleTiles,
		GetTile: getTile,
		Initialize: initialize
	};
};

////////////////////////////////////////////////////////////
// Debug logger object
////////////////////////////////////////////////////////////
var jeldaDebugLogger = function() {

	////////////////////////////////////////////////////////////
	// Variables
	////////////////////////////////////////////////////////////
	var logElement;

	////////////////////////////////////////////////////////////
	// Initialize 
	////////////////////////////////////////////////////////////
	var initialize = function() {

		// Locate and remember the log element.
		logElement = document.getElementById('debug-log');

		// Log that the logger was initialized.
		logEvent('Logger initialized.');

	};

	////////////////////////////////////////////////////////////
	// Write an event to the debug log
	////////////////////////////////////////////////////////////
	var logEvent = function(message) {

		// Create an element to append to the log div.
		var newLog = document.createElement('p');

		// Add some HTML to the element.
		newLog.innerText = '[' + new Date() + '] ' + message;

		// Append the new log to the log element
		logElement.appendChild(newLog);

		// Scroll to the bottom
		logElement.scrollTop = logElement.scrollHeight;

	};

	////////////////////////////////////////////////////////////
	// Expose the things we want to expose
	////////////////////////////////////////////////////////////
	return {
		Initialize: initialize,
		LogEvent: logEvent
	};

};

////////////////////////////////////////////////////////////
// The graphics abstraction layer
////////////////////////////////////////////////////////////
var jeldaGraphicsEngine = function() {

	////////////////////////////////////////////////////////////
	// Variables
	////////////////////////////////////////////////////////////
	var context, dimensions, engine;
  
	////////////////////////////////////////////////////////////
	// ClearCanvas
	////////////////////////////////////////////////////////////
	var clearCanvas = function() {

		context.clearRect(0, 0, dimensions.width, dimensions.height);

	};

	////////////////////////////////////////////////////////////
	// DrawImage
	////////////////////////////////////////////////////////////
	var drawImage = function(image, x, y, width, height, clipStartX, clipStartY, clipWidth, clipHeight) {

		if (typeof clipStartX !== 'undefined') {
			context.drawImage(image, clipStartX, clipStartY, clipWidth, clipHeight, x, y, width, height);
		} else if (typeof width !== 'undefined') {
			context.drawImage(image, x, y, width, height);
		} else {
			context.drawImage(image, x, y);
		}

	};

	////////////////////////////////////////////////////////////
	// DrawText
	////////////////////////////////////////////////////////////
	var drawText = function(text, font, color, x, y, strokeColor, strokeWidth) {

		// Draw stroke
		if (strokeColor) {
			context.strokeStyle = strokeColor;
			context.lineWidth = strokeWidth;
			context.strokeText(text, x, y);
		}

		// Set the context's rendering font
		context.font = font;
		context.fillStyle = color;

		// Draw the text
		context.fillText(text, x, y);

	};

	////////////////////////////////////////////////////////////
	// GetDimensions
	////////////////////////////////////////////////////////////
	var getDimensions = function() { return dimensions; };

	////////////////////////////////////////////////////////////
	// Initialize 
	////////////////////////////////////////////////////////////
	var initialize = function(e) {

		var viewport;

		// Save other initialized objects passed in.
		engine = e;

		// Locate the viewport element
		viewport = document.getElementById('viewport');

		// Get the context of the viewport
		try
		{
			// Get the 2d drawing context
			context = viewport.getContext('2d');

		} catch(error) { return false; }

		// Check to make sure we have a valid context
		if (!context.rect) {
			return false;
		}
		
		// Set up the viewport dimensions object
		dimensions = {
			width: context.canvas.width, 
			height: context.canvas.height 
		};

		// Log that everything's golden.
		engine.logger.LogEvent('Initialized graphics context.')

		// Everything is initialized fine.
		return true;

	};

	////////////////////////////////////////////////////////////
	// MeasureText
	////////////////////////////////////////////////////////////
	var measureText = function(text, font) {

		// Set the context's rendering font
		context.font = font;

		// Return the text measurement object.
		return context.measureText(text);

	};

	////////////////////////////////////////////////////////////
	// Expose the things we want to expose
	////////////////////////////////////////////////////////////
	return {
		ClearCanvas: clearCanvas,
		DrawImage: drawImage,
		DrawText: drawText,
		GetDimensions: getDimensions,
		Initialize: initialize,
		MeasureText: measureText
	};

};

////////////////////////////////////////////////////////////
// Captures input
////////////////////////////////////////////////////////////
var jeldaInput = function() {

	////////////////////////////////////////////////////////////
	// Variables
	////////////////////////////////////////////////////////////
	var engine,
		keyHooks = [],
		keyStates = [];

	////////////////////////////////////////////////////////////
	// handleInputEvent 
	////////////////////////////////////////////////////////////
	var handleInputEvent = function(event) {

		keyStates[event.keyCode] = event.type === 'keydown';

	};

	////////////////////////////////////////////////////////////
	// Initialize 
	////////////////////////////////////////////////////////////
	var initialize = function(e) {

		// Save the engine reference
		engine = e;

		// Initialize the array of key-press states.
		for (var i = 8; i <= 222; i++) {
			keyStates[i] = false;
		}

		// Hook into key up and key down events
		window.onkeyup = handleInputEvent;
		window.onkeydown = handleInputEvent;

		// Log that network connection has been initialized.
		engine.logger.LogEvent('Initialized input manager.');

		// Return that everything worked out okay.
		return true;

	};

	////////////////////////////////////////////////////////////
	// PollKeys 
	////////////////////////////////////////////////////////////
	var pollKeys = function() {

		// Return the states of all the keys
		return keyStates;

	};

	////////////////////////////////////////////////////////////
	// Expose the things we want to expose
	////////////////////////////////////////////////////////////
	return {
		PollKeys: pollKeys,
		Initialize: initialize
	};

};

////////////////////////////////////////////////////////////
// The network connection.
////////////////////////////////////////////////////////////
var jeldaNetworkConnection = function() {

	////////////////////////////////////////////////////////////
	// Variables
	////////////////////////////////////////////////////////////
	var engine, mapServerConnection;

	////////////////////////////////////////////////////////////
	// GetAsset
	////////////////////////////////////////////////////////////
	var getAsset = function(assetType, assetId, callback) {

		// Build the path to the asset
		var assetPath = '/assets/' + assetType + '/' + assetId + '.js';

		// Request the asset
		makeRequest(assetPath, callback);

	};

	////////////////////////////////////////////////////////////
	// GetPlayerState	
	////////////////////////////////////////////////////////////
	var getPlayerState = function(token, callback) {

		var statePath = '/login/' + token;

		// Actually request player state
		makeRequest(statePath, callback);

	};
	
	////////////////////////////////////////////////////////////
	// Initialize 
	////////////////////////////////////////////////////////////
	var initialize = function(e) {

		// Save the engine reference
		engine = e;

		// Log that network connection has been initialized.
		engine.logger.LogEvent('Initialized network connection.');

		// Return that everything worked out okay.
		return true;

	};

	////////////////////////////////////////////////////////////
	// LoginToMap	
	////////////////////////////////////////////////////////////
	var loginToMap = function(mapId, token, callback) {

		/// Log what's happening!
		engine.logger.LogEvent('Initializing map server connection...');

		// If we have an existing connection, close it.
		// TODO: FIX THIS
		if (mapServerConnection) {
			mapServerConnection.close();
		}

		// Open the connection
		mapServerConnection = io.connect();

		// Set up something to respond to the map state
		mapServerConnection.on('mapstate', function(data) {

			// Log that we got the map state.
			engine.logger.LogEvent('Initial map state received!');

			// The initial map state packet should be handled by our map state callback.
			callback(data);

		});

		// Set up something to respond to the map state
		mapServerConnection.on('playerentityid', function(data) {

			// Log that we got the map state.
			engine.logger.LogEvent('Received player entity ID.');

			// The initial map state packet should be handled by our map state callback.
			engine.worldManager.SetPlayerEntityId(data);

		});

		// Set up something to respond to the map state
		mapServerConnection.on('entitystateupdate', function(data) {

			// Log that we got the map state.
			engine.logger.LogEvent('Received update to entity ' + data.EntityId + '.');

			// The initial map state packet should be handled by our map state callback.
			engine.worldManager.LocateAndUpdateEntity(data);

		});

		// Set up something to respond to the map state
		mapServerConnection.on('entitycreated', function(data) {

			// Log that we got the map state.
			engine.logger.LogEvent('Server created entity ' + data.EntityId + '.');

			// The initial map state packet should be handled by our map state callback.
			engine.worldManager.InitializeEntity(data);

		});

		// Set up something to respond to the map state
		mapServerConnection.on('entitydestroyed', function(data) {

			// Log that we got the map state.
			engine.logger.LogEvent('Server destroyed entity ' + data + '.');

			// The initial map state packet should be handled by our map state callback.
			engine.worldManager.DestroyEntity(data);

		});
		
		// Log in to a specific map
		mapServerConnection.emit('mapconnect', {
			MapId: mapId,
			Token: token
		});

	};

	////////////////////////////////////////////////////////////
	// makeRequest 
	////////////////////////////////////////////////////////////
	var makeRequest = function(path, callback) {

		// Create the XHR object
		var xhr = new XMLHttpRequest();

		// Set up our handler for when it's done.
		xhr.onreadystatechange = function() {

			// Is it ready?
			if (xhr.readyState === 4 && xhr.status === 200) {

				// Turn this into an object.
				// We don't use JSON.parse because we trust the source and need scripts to appear, too.
				callback(objectify(xhr.responseText));

			}

		};

		// Finish configuring and make the request
		xhr.open('GET', path, true);
		xhr.send();

	};

	////////////////////////////////////////////////////////////
	// objectify 
	////////////////////////////////////////////////////////////
	var objectify = function(responseText) {

		return eval('(function() { return ' + responseText + '; })();');

	};

	////////////////////////////////////////////////////////////
	// SendEntityStateUpdate
	////////////////////////////////////////////////////////////
	var sendEntityStateUpdate = function(entity) {

		// Log what's happening
		engine.logger.LogEvent('Entity ' + entity.EntityId + ' requested state update transmission.');

		// Get the state of the entity.
		var state = entity.GetClientState();

		// Append the entity ID to the state
		state.EntityId = entity.EntityId;

		// Send it along
		mapServerConnection.emit('entitystateupdate', state);

	};

	////////////////////////////////////////////////////////////
	// Expose the things we want to expose
	////////////////////////////////////////////////////////////
	return {
		GetAsset: getAsset,
		LoginToMap: loginToMap,
		GetPlayerState: getPlayerState,
		Initialize: initialize,
		SendEntityStateUpdate: sendEntityStateUpdate
	};
};

////////////////////////////////////////////////////////////
// The world manager. This does most of the heavy lifting of
// requesting items through the cache, drawing the world map,
// etcetera.
////////////////////////////////////////////////////////////
var jeldaWorldManager = function() {

	////////////////////////////////////////////////////////////
	// Variables
	////////////////////////////////////////////////////////////
	var engine, entityLookupTable = {}, map, mapState, state;

	////////////////////////////////////////////////////////////
	// getCurrentMap
	////////////////////////////////////////////////////////////
	var getCurrentMap = function() { return map };

	////////////////////////////////////////////////////////////
	// getMapState
	////////////////////////////////////////////////////////////
	var getMapState = function() { return mapState };

	////////////////////////////////////////////////////////////
	// getState
	////////////////////////////////////////////////////////////
	var getState = function() { return state };

	////////////////////////////////////////////////////////////
	// DestroyEntity
	////////////////////////////////////////////////////////////
	var destroyEntity = function(entityId) {

		// Locate and eliminate the entity in the list.
		for (var i = 0; i < mapState.Entities.length; i++) {

			if (mapState.Entities[i].EntityId === entityId) {
				mapState.Entities.splice(i, 1);
			}

		}

		// Also the entity lookup table
		delete entityLookupTable[entityId];

	};

	////////////////////////////////////////////////////////////
	// DetectCollision
	////////////////////////////////////////////////////////////
	var detectCollision = function(colX, colY, width, height) {

		var tileX, tileY, currentTile,
			detectionStartX = Math.floor((colX - TILE_SIZE) / TILE_SIZE),
			detectionStartY = Math.floor((colY - TILE_SIZE) / TILE_SIZE),
			detectionEndX = Math.ceil((colX + width) / TILE_SIZE),
			detectionEndY = Math.ceil((colY + height) / TILE_SIZE); 

		// Basic 'don't leave the map' detection.
		if (colX < 0 || colX + width > map.Dimensions.Width * TILE_SIZE ||
			colY < 0 || colY + height > map.Dimensions.Height * TILE_SIZE) {

			// We have a map boundary collision!
			return { 
				type: 'boundary'
			}

		}

		// Clamp terrain collision detection to tiles that actually exist.
		if (detectionStartX < 0) { detectionStartX = 0; }
		if (detectionEndX > map.Dimensions.Width - 1) { detectionEndX = map.Dimensions.Width - 1; }
		if (detectionStartY < 0) { detectionStartY = 0; }
		if (detectionEndY > map.Dimensions.Height - 1) { detectionEndY = map.Dimensions.Height - 1; }

		// Detect terrain collisions
		for (var x = detectionStartX; x <= detectionEndX; x++) {
			for (var y = detectionStartY; y <= detectionEndY; y++) {

				// Calculate the position of this tile.
				tileX = x * TILE_SIZE, tileY = y * TILE_SIZE;

				// Are we actually overlapping the tile?
				if (((tileX + TILE_SIZE >= colX && tileX <= colX + width) || 
					(tileX <= colX + width && tileX + TILE_SIZE >= colX)) &&
					((tileY + TILE_SIZE >= colY && tileY <= colY + height) ||
					(tileY <= colY + height && tileY + TILE_SIZE >= colY))) {

					// For readability
					currentTile = map.MapData[y][x];

					// If the tile is solid...
					if(map.TileAssets[currentTile].Solid === true) {

						// Return true
						return {
							type: 'terrain',
							x: tileX,
							y: tileY
						};

					}

				}
			}
		}

		// No collisions!
		return false;
	};

	////////////////////////////////////////////////////////////
	// handleMapUpdate
	////////////////////////////////////////////////////////////
	var handleMapUpdate = function(newState, callback) {

		// To shorten things.
		var log = engine.logger,
			cache = engine.cache;

		// Do we need to load a new map?
		if (typeof state === 'undefined' || state.LocationInfo.LocationId !== newState.LocationInfo.LocationId) {

			// Get the map from the cache
			engine.cache.GetMap(newState.LocationInfo.LocationId, function(newMap) {

				// First, save the map locally.
				map = newMap;

				// Log that we got it, and some other data.
				log.LogEvent('Loaded map ' + map.Metadata.Id + ' via cache.');
				log.LogEvent('Need ' + map.TileAssets.length + ' tile assets to finish map load.');

				// Request those assets that we need.
				engine.cache.GetMultipleTiles(map.TileAssets, function(tileAssets) {

					// Overwrite the primitive list of tile assets with our retrieved assets.
					map.TileAssets = tileAssets;

					// Loaded all the map assets. We're good to go from here on out.
					callback(true);

				});

			});

		} else {

			// Nothing to do!
			callback(false);

		}

	};

	////////////////////////////////////////////////////////////
	// handlePlayerStateChange 
	////////////////////////////////////////////////////////////
	var handlePlayerStateChange = function(newState, callback) {

		var net = engine.network;

		// TODO: Clean up old state, dispose all items.

		// First, did we jump maps?
		handleMapUpdate(newState, function(didChangeMaps) {

			// We're done. Save the state as the new current state...
			state = newState;

			// Log the change.
			engine.logger.LogEvent('Player state updated.');

			// If we changed maps, we need to sync map state with the new region.
			if (didChangeMaps) { 

				// Log that we changed maps.
				engine.logger.LogEvent('NEW REGION - Must sync map state..');

				// Sync state with the new map.
				syncMapState(function() {

					// Finally, call the callback.
					callback();

				});

			} else {

				// ...And callback.
				callback();

			}

		});

	};
	
	////////////////////////////////////////////////////////////
	// Initialize 
	////////////////////////////////////////////////////////////
	var initialize = function(e, token, callback) {

		// Save the engine reference
		engine = e;

		// TODO: This should be post-login. Token will be an actual one-time login token in the future, not a player name.
		// Get the player's state.
		engine.network.GetPlayerState(token, function(playerState) {

			// Log that network connection has been initialized.
			engine.logger.LogEvent('Got player state.');

			// Return that everything worked out okay.
			handlePlayerStateChange(playerState, function() {

				// Call the callback.
				callback(true);

			});

		});

	};


	////////////////////////////////////////////////////////////
	// initializeEntity
	////////////////////////////////////////////////////////////
	var initializeEntity = function(entity, callback) {

		// Get the behavior from the cache
		engine.cache.GetEntity(entity.EntityType, function(entityAsset) {

			// First, initialize the entity.
			var finishedEntity = new entityAsset(engine);

			// Now, assign it its ID.
			finishedEntity.EntityId = entity.EntityId

			// TODO: Preload all necessary graphics assets.

			// Set up entity state.
			updateEntity(finishedEntity, entity.EntityState);

			// Initialize the entity, if there's initialization to be done, now that it has a state.
			if (typeof finishedEntity.Initialize === 'function') {

				finishedEntity.Initialize();

			}

			// Add it to our local entity list
			mapState.Entities.push(finishedEntity);

			// Add it to our entity lookup
			entityLookupTable[entity.EntityId] = finishedEntity;

			// Call the callback
			if (typeof callback === 'function') {
				callback(finishedEntity);
			}

		});

	};

	////////////////////////////////////////////////////////////
	// LocateAndUpdateEntity 
	////////////////////////////////////////////////////////////
	var locateAndUpdateEntity = function(entityState) {

		updateEntity(entityLookupTable[entityState.EntityId], entityState);

	};

	////////////////////////////////////////////////////////////
	// processEntityStates 
	////////////////////////////////////////////////////////////
	var processEntityStates = function(delta) {

		var entities = mapState.Entities;

		// Iterate through all the entities
		for (var i = 0; i < entities.length; i++) {

			// If it's a renderable entity...
			if (typeof entities[i].DoProcessing === 'function') {

				// Render it.
				entities[i].DoProcessing(delta);

			}

		}

	};

	////////////////////////////////////////////////////////////
	// RunWorld
	////////////////////////////////////////////////////////////
	var runWorld = function() {

		var log = engine.logger, running = true, lastFrameStart = new Date().getTime();

		// Here's our game loop
		var gameLoop = function() {

			var startTime = new Date().getTime(), delta = startTime - lastFrameStart;

			// Limit frame rates to 60fps
			if (delta <= (1000 / 60)) {

				// Delay briefly.
				setTimeout(gameLoop, 1);

				// Don't finish this iteration.
				return;

			}

			// TODO: Exit more gracefully
			if (running === false) { return; }

			// Let every entity do its processing
			processEntityStates(delta);

			// Draw the world
			engine.worldRenderer.DrawFrame();

			// Calculate framerate.
			var frameRate = Math.floor(1000 / (startTime - lastFrameStart));

			// Print the framerate
			engine.graphics.DrawText(frameRate + 'fps', '12px Arial', 'white', 10, 20); 

			// Allow processing, then come back.
			setTimeout(gameLoop, 0);

			// Store the time we started rendering this.
			lastFrameStart = startTime;

		};

		// Log that we entered the world rendering loop.
		log.LogEvent('Entered game loop.');

		// Actually start the game loop.
		gameLoop();

	};

	////////////////////////////////////////////////////////////
	// SetPlayerEntityId
	////////////////////////////////////////////////////////////
	var setPlayerEntityId = function(entityId) {

		state.PlayerEntityId = entityId;

	};

	////////////////////////////////////////////////////////////
	// syncMapState
	////////////////////////////////////////////////////////////
	var syncMapState = function(callback) {

		// Log what's about to happen
		engine.logger.LogEvent('Requesting map state.');

		// First thing's first - let's request the map state.
		engine.network.LoginToMap(state.LocationInfo.LocationId, state.PlayerInfo.Token, function(newMapState) {

			var entitiesToInitialize = newMapState.Entities.length;

			// Set the map state up
			mapState = newMapState;

			// Dump out if there's no initializing to do
			if (entitiesToInitialize === 0) {
				callback();
			}

			// Now that we have it, let's initialize all the entities.
			// Right now we have stubs that describe entities, but it's just a collection of states.
			// We're going to initialize them one by one and replace them.
			var stubEntities = mapState.Entities;
			mapState.Entities = [];

			for (var i = 0; i < stubEntities.length; i++) {

				(function(i) {

					// First, we need to see if this is OUR entity. All player entities come down as playerEntity.
					// We need our particular entity to be a playerControlledEntity.
					if (stubEntities[i].EntityId === state.PlayerEntityId) {

						stubEntities[i].EntityType = 'playerControlledEntity';

					}
					
					// Convert the entity descriptin into something we can work with.
					initializeEntity(stubEntities[i], function(entity) {

						// If we have no entities left to initialize, then we're good.
						entitiesToInitialize -= 1;

						// We have no entities left to initialize?
						if (entitiesToInitialize === 0) {

							// Finally, we're done. Call back.
							callback();

							// And end here.
							return;

						};

						// Log how many entities are left.
						engine.logger.LogEvent(entitiesToInitialize + ' entities remain requiring initialization.');

					});

				})(i);

			}

		});

	};

	////////////////////////////////////////////////////////////
	// updateEntity
	////////////////////////////////////////////////////////////
	var updateEntity = function(entity, entityState) {

		for (var stateMember in entityState) {

			// No inherited members
			if (!entityState.hasOwnProperty(stateMember)) {
				continue;
			}

			// Set the state on this member
			entity[stateMember] = entityState[stateMember];

		}

	};

	////////////////////////////////////////////////////////////
	// Expose the things we want to expose
	////////////////////////////////////////////////////////////
	return {
		DestroyEntity: destroyEntity,
		DetectCollision: detectCollision,
		GetCurrentMap: getCurrentMap,
		GetMapState: getMapState,
		GetState: getState,
		Initialize: initialize,
		InitializeEntity: initializeEntity,
		LocateAndUpdateEntity: locateAndUpdateEntity,
		RunWorld: runWorld,
		SetPlayerEntityId: setPlayerEntityId
	};
};

////////////////////////////////////////////////////////////
// Debug logger object
////////////////////////////////////////////////////////////
var jeldaWorldRenderer = function() {

	////////////////////////////////////////////////////////////
	// Variables
	////////////////////////////////////////////////////////////
	var camera = {
			X: 0,
			Y: 0
		},
		engine;

	////////////////////////////////////////////////////////////
	// DrawFrame
	////////////////////////////////////////////////////////////
	var drawFrame = function() {

		// Clear the display.
		engine.graphics.ClearCanvas();

		// First, draw terrain (the map.)
		drawTerrain();

		// Now, draw entities.
		drawEntities();

		// TODO: Draw the UI

	};

	////////////////////////////////////////////////////////////
	// drawEntities
	////////////////////////////////////////////////////////////
	var drawEntities = function() {

		var entities = engine.worldManager.GetMapState().Entities,
			graphics = engine.graphics;

		// TODO: Clip offscreen entities

		// TODO: Sort renderable entities by y position, descending.

		// Iterate through all the entities
		for (var i = 0; i < entities.length; i++) {

			// If it's a renderable entity...
			if (typeof entities[i].Draw === 'function') {

				// Render it.
				entities[i].Draw(graphics, { X: entities[i].X - camera.X, Y: entities[i].Y - camera.Y });

			}

		}

	};

	////////////////////////////////////////////////////////////
	// drawTerrain
	////////////////////////////////////////////////////////////
	var drawTerrain = function() {

		// Get a reference to the map and all its associated assets.
		var map = engine.worldManager.GetCurrentMap(),
			graphics = engine.graphics,
			currentTile;

		/* This is ALL debuggery right now, though probably represents what'll happen at some point. */
		for (var x = 0; x < map.Dimensions.Width; x++) {
			for (var y = 0; y < map.Dimensions.Height; y++) {
				
				// Store off the current tile to make this more readable.
				currentTile = map.MapData[y][x];

				// Paint the tile.
				graphics.DrawImage(map.TileAssets[currentTile].ImageData, (TILE_SIZE * x) - camera.X, (TILE_SIZE * y) - camera.Y);

			}
		}

	};

	////////////////////////////////////////////////////////////
	// Initialize 
	////////////////////////////////////////////////////////////
	var initialize = function(e) {

		// Locate and remember the log element.
		engine = e;

		// Log that the logger was initialized.
		e.logger.LogEvent('World renderer initialized.');

		// Return that everything worked out!
		return true;

	};

	////////////////////////////////////////////////////////////
	// setCamera 
	////////////////////////////////////////////////////////////
	var setCamera = function(x, y) {

		camera = { X: x, Y: y };

	};

	////////////////////////////////////////////////////////////
	// Expose the things we want to expose
	////////////////////////////////////////////////////////////
	return {
		DrawFrame: drawFrame,
		Initialize: initialize,
		SetCamera: setCamera
	};

};

////////////////////////////////////////////////////////////
// The actual client application
////////////////////////////////////////////////////////////
var jeldaClient = (function() {

	////////////////////////////////////////////////////////////
	// Set up our engine object
	////////////////////////////////////////////////////////////
	var engine = {
		cache: new jeldaCache(),
		graphics: new jeldaGraphicsEngine(),
		input: new jeldaInput(),
		logger: new jeldaDebugLogger(),
		network: new jeldaNetworkConnection(),
		worldManager: new jeldaWorldManager(),
		worldRenderer: new jeldaWorldRenderer()
	};

	////////////////////////////////////////////////////////////
	// showLoading
	////////////////////////////////////////////////////////////
	var showLoadingMessage = function(loadingText) {

		var g = engine.graphics,
			/* Debuggery. This should be a neat modal window entity. */
			messageFont = '50px Arial',
			messageText = 'Now loading...',
			messageDimensions = g.MeasureText(messageText, messageFont),
			/* End debuggery. */
			stepTextFontSize = 20,
			stepTextDimensions = g.MeasureText(loadingText, messageFont, stepTextFontSize),
			viewportDimensions = g.GetDimensions(),
			msgX = viewportDimensions.width / 2 - messageDimensions.width / 2,
			msgY = viewportDimensions.height / 2 - 50 / 2,
			stepX = viewportDimensions.width / 2 - stepTextDimensions.width / 2;

		/* Debuggery. Again, this would be a dialog entity that would redraw in the draw loop. */
		g.ClearCanvas();

		// Draw some loading text
		g.DrawText(messageText, messageFont, '#FFFFFF', msgX, msgY, '#555', 2)

		// And draw the loading message.
		g.DrawText(loadingText, messageFont, '#DDDDDD', stepX, msgY + 50)

	};

	////////////////////////////////////////////////////////////
	// Return the initialization method
	////////////////////////////////////////////////////////////
	return function() {
	
		// First, initialize the logger.
		engine.logger.Initialize();

		// Now, initialize the graphics layer.
		if(!engine.graphics.Initialize(engine)) {
			engine.logger.LogEvent('Failed to initialize graphics context!');
			return;
		}

		// We can show something useful on the screen, so let's do it.
		showLoadingMessage('Starting things up...');

		// Get network things ready.
		if (!engine.network.Initialize(engine)) {
			engine.logger.logEvent('Failed to initialize network connection!');
			return;
		}

		// Get network things ready.
		if (!engine.input.Initialize(engine)) {
			engine.logger.logEvent('Failed to initialize network connection!');
			return;
		}

		// Initialize the cache, as it needs to be ready for the world manager to function.
		if (!engine.cache.Initialize(engine)) {
			engine.logger.logEvent('Failed to initialize cache!');
			return;
		}

		// We can show something useful on the screen, so let's do it.
		showLoadingMessage('Initializing world...');

		// MASSIVE debuggery.
		var token = prompt('What name are you going to log in with?');

		// Time to initialize the world manager. This won't always happen here, but for now, it does.
		// We have to do this async, because it's going to rely on a lot of async caching.
		engine.worldManager.Initialize(engine, token, function(success) {
			
			// Oh no, an ERROR!
			if (!success) {
				engine.logger.logEvent('Failed to initialize world manager!')
				return;
			}

			// We can show something useful on the screen, so let's do it.
			showLoadingMessage('World loaded! Starting rendering engine...');

			// Initialize the renderer.
			if(!engine.worldRenderer.Initialize(engine)) {
				engine.logger.logEvent('Failed to initialize world renderer!')
				return;
			};

			// Kick off the game loop.
			engine.worldManager.RunWorld();

		});
	}

})();

////////////////////////////////////////////////////////////
// Initialize the app.
////////////////////////////////////////////////////////////
window.onload = function() {

	// Start up the client!
	document.client = new jeldaClient(); 
};