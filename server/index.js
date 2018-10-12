const app = require('http').createServer();
const io = require('socket.io')(app);
const config = require('./config');
const mediasoup = require('mediasoup');
const port = config.server.port;

// Map of Room instances indexed by roomId.
const rooms = new Map();

app.listen(port, () => console.log(`MediaSoup server is listening on port ${port}!`));

// MediaSoup server
const mediaServer = mediasoup.Server({
  numWorkers: null, // Use as many CPUs as available.
  logLevel: config.mediasoup.logLevel,
  logTags: config.mediasoup.logTags,
  rtcIPv4: config.mediasoup.rtcIPv4,
  rtcIPv6: config.mediasoup.rtcIPv6,
  rtcAnnouncedIPv4: config.mediasoup.rtcAnnouncedIPv4,
  rtcAnnouncedIPv6: config.mediasoup.rtcAnnouncedIPv6,
  rtcMinPort: config.mediasoup.rtcMinPort,
  rtcMaxPort: config.mediasoup.rtcMaxPort
});

// Handle socket connection and its messages
io.on('connection', (socket) => {
  console.log('New socket connection:', socket.handshake.query);

  // Used for mediaSoup room
  let room = null;
  // Used for mediaSoup peer
  let mediaPeer = null;
  const { roomId, peerName } = socket.handshake.query;

  if (rooms.has(roomId)) {
    room = rooms.get(roomId);
  } else {
    room = mediaServer.Room(config.mediasoup.mediaCodecs);
    rooms.set(roomId, room);
    room.on('close', () => {
      rooms.delete(roomId);
    });
  }

  socket.on('mediasoup-request', (request, cb) => {
    switch (request.method) {

      case 'queryRoom':
        room.receiveRequest(request)
          .then((response) => cb(null, response))
          .catch((error) => cb(error.toString()));
        break;

      case 'join':
        room.receiveRequest(request)
          .then((response) => {
            // Get the newly created mediasoup Peer
            mediaPeer = room.getPeerByName(peerName);

            handleMediaPeer(mediaPeer);

            // Send response back
            cb(null, response);
          })
          .catch((error) => cb(error.toString()));
        break;

      default:
        if (mediaPeer) {
          mediaPeer.receiveRequest(request)
            .then((response) => cb(null, response))
            .catch((error) => cb(error.toString()));
        }
    }

  });

  socket.on('mediasoup-notification', (notification) => {
    console.debug('Got notification from client peer', notification);

    // NOTE: mediasoup-client just sends notifications with target 'peer'
    if (!mediaPeer) {
      console.error('Cannot handle mediaSoup notification, no mediaSoup Peer');
      return;
    }

    mediaPeer.receiveNotification(notification);
  });

  // Invokes when connection lost on a client side
  socket.on('disconnect', () => {
    if (mediaPeer) {
      mediaPeer.close();
    }
  });

  /**
   * Handles all mediaPeer events
   *
   * @param mediaPeer
   */
  const handleMediaPeer = (mediaPeer) => {
    mediaPeer.on('notify', (notification) => {
      console.log('New notification for mediaPeer received:', notification);
      socket.emit('mediasoup-notification', notification);
    });

    mediaPeer.on('newtransport', (transport) => {
      console.log('New mediaPeer transport:', transport.direction);
      transport.on('close', (originator) => {
        console.log('Transport closed from originator:', originator);
      });
    });

    mediaPeer.on('newproducer', (producer) => {
      console.log('New mediaPeer producer:', producer.kind);
      producer.on('close', (originator) => {
        console.log('Producer closed from originator:', originator);
      });
    });

    mediaPeer.on('newconsumer', (consumer) => {
      console.log('New mediaPeer consumer:', consumer.kind);
      consumer.on('close', (originator) => {
        console.log('Consumer closed from originator', originator);
      });
    });

    // Also handle already existing Consumers.
    mediaPeer.consumers.forEach((consumer) => {
      console.log('mediaPeer existing consumer:', consumer.kind);
      consumer.on('close', (originator) => {
        console.log('Existing consumer closed from originator', originator);
      });
    });
  }

});
