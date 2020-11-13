module.exports=(config)->
	fs=require "fs"
	http=require "http"
	server=http.createServer()
	io=require("socket.io")(server)
	express=require 'express'
	app=express();
	mineflayer = require 'mineflayer'
	Chunk = require("prismarine-chunk")("1.16.1")
	vec3=require "vec3"
	Convert = require 'ansi-to-html'
	convert = new Convert()

	sf={}
	port=config["express-port"]

	socketInfo={}

	app.use express.static(__dirname + "/client/")
	app.use (req, res, next) ->
		res.set 'Cache-Control', 'no-store'
		next()
	app.get "/websocket/",(req,res)->
		res.send String(config["websocket-port"])
	app.get "/host/",(req,res)->
		res.send String(config["host"])
	app.listen port

	server.listen config["websocket-port"]

	io.sockets.on "connection", (socket)->
		socket.on "initClient",(data)->
			console.log "[+] "+data.nick

			socketInfo[socket.id]=data

			socketInfo[socket.id].bot=mineflayer.createBot {
				host: config.realServer.ip
				port: config.realServer.port
				username: socketInfo[socket.id].nick
				version: "1.16.3"
			}

			socketInfo[socket.id].bot._client.on "map_chunk",(packet)->
				cell=new Chunk()
				cell.load packet.chunkData,packet.bitMap,false,true
				io.to(socket.id).emit "mapChunk", cell.sections,packet.x,packet.z,packet.biomes
				return

			socketInfo[socket.id].bot.on 'chat',(username, message)->
				if username is socketInfo[socket.id].bot.username
					return
				return

			socketInfo[socket.id].bot.on 'move',()->
				try
					io.to(socket.id).emit "move",socketInfo[socket.id].bot.entity.position
				return
			socketInfo[socket.id].bot.on 'health',()->
				try
					io.to(socket.id).emit "hp",socketInfo[socket.id].bot.health
					io.to(socket.id).emit "food",socketInfo[socket.id].bot.food
				return
			socketInfo[socket.id].bot.on 'spawn',()->
				try
					io.to(socket.id).emit "spawn"
				return
			socketInfo[socket.id].bot.on 'message',(msg)->
				try
					io.to(socket.id).emit "msg",convert.toHtml(msg.toAnsi());
				return
			socketInfo[socket.id].bot.on 'experience',()->
				try
					io.to(socket.id).emit "xp",socketInfo[socket.id].bot.experience
				return
			socketInfo[socket.id].bot.on 'blockUpdate',(oldb,newb)->
				io.to(socket.id).emit "blockUpdate",[newb.position.x,newb.position.y,newb.position.z,newb.stateId]
				return
			return
		socket.on "move",(state,toggle)->
			try
				socketInfo[socket.id].bot.setControlState(state,toggle)
			return
		socket.on "rotate",(data)->
			try
				socketInfo[socket.id].bot.look data...
			return
		socket.on "disconnect", ->
			#end bot session
			try
				console.log "[-] "+socketInfo[socket.id].nick
				socketInfo[socket.id].bot.end()
				#delete socketinfo
				delete socketInfo[socket.id]
			return