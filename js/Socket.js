Socket = (function() {
	var _sockets = {},	// variabile che alla fine conterrà tutti i socket
		_socketsConfig = {	// ogni oggetto qui dentro contiene la configurazione necessaria per creare un WebSocket e renderlo trasparente poi all'esterno
			draw: {		// questo sarà il nome con cui tutta l'app chiamerà questo specifico socket
				url: Config.sockets.draw,	// parametro url preso dall'oggetto di config con tutti i parametri dell'app
				onmessage: function(e) {
					// codice da eseguire su onMessage del socket Draw
					// non solo obbligatorie queste 4 funzioni handler per tutti i socket.
					// se presenti, verranno attaccate al all'oggetto WebSocket che verrà creato.
					// per il socket Draw, sarà il codice di visualizzazione dei disegni ricevuti.
				},
				onopen: function(e) {
				
				},
				onerror: function(e) {
					console.log("porcamadonna");	// questa riga è la più importante
				},
				onclose: function(e) {
				
				}
			},
			user: {
			
			}
		},
		init = function() {		// in init di questo modulo Socket creo effettivamente tutti i socket descritti in _socketsConfig
			var _S = function() {};		// questo sarà l'oggetto che conterrà un singolo webSocket
			_S.prototype.send = function(data) {	// customizzo il metodo send dei webSocket. se la connessione deve ancora avvenire, richiamo il vero send su onOpen. se no lo faccio immediatamente
				// e metto questo metodo in prototype cosi ogni viene creato in memoria una sola volta e sarà condiviso tra tutte le istanze dell'oggetto
				(typeof data === "object") && (data = JSON.stringify(data));
				if (this.obj.readyState === 0) {
					this.obj.onopen = function() {
						this.obj.send(data);
						this.obj.onopen = undefined;
					}.bind(this);
				} else {
					this.obj.send(data);
				}
			}
			for (socketName in _socketsConfig) {
				var socket = _socketsConfig[socketName],
					url = socket.url,
					_s = new _S();	// qui istanzio un nuovo oggetto per il nuovo socket che sto creando
				if (url) {
					_s.url = url;
					try {
						_s.obj = new WebSocket(url);	// e metto il vero webSocket dentro socket.obj, cosi dall'esterno gli altri moduli non potranno 
						// toccare il vero oggetto webSocket e far danni. Mentre i metodi qui definiti potranno accedervi con this.obj
						for (key in socket) {
							if (key.indexOf('on') === 0 && typeof socket[key] === "function") {
								_s.obj[key] = socket[key];	// attacco ogni metodo definito nella config del mio socket al vero oggetto webSocket.
							}
						}
						_s.good = true;
						_sockets[socketName] = _s;	// salvo questo nuovo oggetto socket in locale dentro a questo modulo
					} catch (error) {
						_S.good = false;
						utils.logError(error);
					}
				}
			}
			_socketsConfig = undefined;
		},
		get = function(name) {	// dall'esterno gli altri moduli dovranno richiamare il metodo get del modulo Socket passando il nome del socket che vogliono
			var _socket = _sockets[name];
			if (_socket && _socket.good) {
				return _socket;
			} else {
				utils.logError([label['errorSocket'], name],join(''));
				return false;
			}
		};
	return {
		init	: init,
		get		: get
	}
})(),