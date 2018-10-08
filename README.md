MediaSoup sample
================
Since there are some users (including me) complaining about complexity of MediaSoup video conferencing module and lack of small/simple examples, I decided to create a bare minimum example of how can it be used in order to get people understand it better and allow its faster adoption by community.  
This example contains of two independent parts: **frontend** and **server** and implements **many-to-many** video conferencing:

Frontend
--------
It's a minimal GUI that helps to understand better the client side of mediaSoup. It uses socket.io for communication. The reason I chose it over plain websockets is the latter doesn't support message acknowledgement which would result in extra lines of code (which in turn might create additional complexity).  
Frontend also uses a minimal express server just to handle static files.

Server
------
A singe file (index.js) that does everything.

Usage
-----
First run the server:
```
cd server
npm start
```
It will start listening on **8080** port. It also handles socket.io connection from frontend side.  
Now, you may run a frontend side, which will allow requests on **3000** port:
```
cd frontend
npm start
```
Once that done, you can create/join rooms. Just open in your browser:
`http://localhost:3000/?roomId=room1&peerName=Alice`  
And in another tab:
`http://localhost:3000/?roomId=room1&peerName=Bob`  
It should create video elements in both tabs with remote peers.


Note
----
I was trying to simplify everything as much as I could, so there are no ssl support, nor additional libraries. It's plain javascript. For the sake of simplicity I also omit some events handling (for example, there are no handler on frontend, when some peer leaves a room (video element will stay on html page)). Also, since I was in rush, I might miss something. I also didn't test much.

