var App = (function() {
	var DOCUMENT = document,
		_body = DOCUMENT.body,
		WINDOW = window,
		_$dark,
		_$spinner,
		XX, YY, XX2, YY2, DXX, DYY,
		MATH = Math,
		round = function(n, d) {
            var m = d ? MATH.pow(10, d) : 1;
            return MATH.round(n * m) / m;
        },
		random = function(n) {
			return MATH.random() * n | 0;
		},
		toHex = function(n) {
			n = n.toString(16);
			return (n.length === 1 ? "0" + n : n);
		},
		orderNumberUp = function(a, b) { return a - b; },
		orderNumberDown = function(a, b) { return b - a; },
		orderStringDown = function(a,b) {
			if (a < b) return +1;
			if (a > b) return -1;
			return 0;
		},
		preventDefault = function(e) {
			e.preventDefault();
		},
		requestAnimationFrame = WINDOW.requestAnimationFrame || WINDOW.mozRequestAnimationFrame || WINDOW.webkitRequestAnimationFrame || function(callback){setTimeout(callback, 25)},
		PI = MATH.PI,
		PI2 = 2 * PI,
		EmptyFN = function() {},
		_mouseWheelEvent,
		
	Config = (function() {
		return {
			debug : true,
			socketUrl : "http://46.252.150.61:5000",
			workers : {
				blur :		"file blur.js",
				scarica :	"file scarica.js"
			}
		}
	})(),
	
	Info = (function() {
		var get_len = function(len) {
			return 'ita'; 	// TODO da implementare per filtrare le lingue non supportate, e restituire il formato a 3 caratteri
		};
		return {
			name 		: "Social.Art",
			version 	: "0.5",
			lenguage	: get_len(WINDOW.navigator.language),
			macOS		: navigator.platform.toUpperCase().indexOf('MAC') !== -1,
			firefox		: /Firefox/i.test(navigator.userAgent)
		}
	})(),
	
	label = (function(len) {
		var _labels = {};
		_labels['ita'] = {
			'closePrevent'				: 'Salva una bozza prima di uscire!',
			"Dimensione"				: "Dimensione",
			"Matita"					: "Matita",
			"Pennello"					: "Pennello",
			"Gomma"						: "Gomma",
			"Ottimizza"					: "Ottimizza",
			"Anteprima"					: "Anteprima",
			"Colori"					: "Colori",
			"Casuale"					: "Casuale",
			"SalvaBozza"				: "Salva Bozza",
			"Ripristina"				: "Ripristina",
			"FoglioQuadretti"			: "Foglio a Quadretti",
			"FoglioBianco"				: "Foglio Bianco",
			"FoglioRighe"				: "Foglio a Righe",
			"Esporta"					: "Esporta",
			"Svuota"					: "Svuota",
			"Chiudi"					: "Chiudi",
			"Pausa"						: "Pausa",
			"NienteDaEsportare"			: "Niente da esportare",
			"Pennello"					: "Pennello",
			"Gomma"						: "Gomma",
			"salvoDisegno"				: " Salvo disegno...",
			"nothingToSave"				: "Niente da salvare",
			"editorSaveError"			: "Oooops :( Ora non &egrave; possibile salvare. Riprova pi&ugrave; tardi",
			"socketError"				: "Errore di connessione nel Socket",
			"editorSaveConfirm"			: "Dopo aver salvato non potrai più modificare il disegno. Confermi?"
		};
		_labels['eng'] = {
		
		};
		var _lingua = _labels[len] || {};
		return _lingua;
	})(Info.lenguage),
	
	utils = (function() {
		var _checkError = (function _checkError() {
			var _function, errorMsg,
			setFunc = function(func) {
				_function = func;
				return this;
			},
			setError = function(error) {
				errorMsg = error;
				return this;
			},
			exec = function(params) {
				try {
					return _function(params);
				} catch(error) {
					if (Config.debug) {
						var msg = errorMsg + "[" + error.code + " - " + error.message + "] {" + JSON.stringify(params) + "}";
						logError(msg);
					}
					return false;
				}
			};
			return {
				exec 		: exec,
				setFunc 	: setFunc,
				setError	: setError
			}
		})(),
		checkError = function(func, error, params) {
			return _checkError.setFunc(func).setError(error).exec(params);
		},
		isEmpty = function(value) {
			return ((typeof value == 'undefined' || value === null || value === '' || value === false || value === [] || value === {} || value === NaN || value === undefined) ? true : false);
		},
		areEmpty = function(obj) {
			var res = false;
			if (obj instanceof Array) {
				var i = obj.length;
				if (i === 0) return true;
				for (;i--;)
					if (isEmpty(obj[i])) return true;
				return false;
			} else 
				return isEmpty(obj);
		},
		getRemoteData = function(url, params) {
			// chiamata AJAX (magari jquery) con paramsin post che restituisce un oggetto de-jsonato, o false
		},
		cancelEvent = function(e) {
			e.preventDefault();
		},
		enableElement = function(el) {
			el.addClass("enabled").removeClass("disabled");
		},
		disableElement = function(el) {
			el.addClass("disabled").removeClass("enabled");
		},
		logError = function(msg) {
			console.log(msg);
			// qui possiamo anche tentare una chiamata ajax per inviarci _msg per le statistiche sugli errori,
		},
		setSpinner = function(state, overlay) {
			if (state) {
				_$spinner.stop().fadeIn("fast");
				overlay && _$dark.stop().fadeIn("fast");
			} else {
				_$spinner.stop().fadeOut("fast");
				_$dark.stop().fadeOut("fast");
			}
		};
		return {
			CK				: checkError,
			isEmpty			: isEmpty,
			areEmpty		: areEmpty,
			getRemoteData	: getRemoteData,
			cancelEvent		: cancelEvent,
			enableElement	: enableElement,
			disableElement	: disableElement,
			setSpinner		: setSpinner
		}
	})(),
	
	Socket = (function() {
		var _socket = {},
			_onError = function() {
				
			}
			init = function() {
				var url = Config.socketUrl;
				_socket = {
					url: url,
					io: io(url)
				},
				_buffer = [],
				_onConnect = function() {
					var data;
					for (var i = _buffer.length; i--; ) {
						data = _buffer.pop();
						_socket.io.emit(data[0], data[1]);
					}
				};
				_socket.io.on("error", function() {
					console.log(label['socketError']);
				});
				_socket.io.on("disconnect", function() {
					console.log("socket disconnect");
				});
				_socket.io.on("reconnect", function() {
					_onConnect();
				});
				_socket.io.on("connect", function() {
					console.log("Socket Connect OK");
					_onConnect();
				});
				_socket.io.on("dashboard drag", Dashboard.onSocketMessage);
				_socket.io.on("editor save", Editor.onSocketMessage);
			},
			emit = function(event, data) {
				(typeof data === "object") && (data = JSON.stringify(data));
				if (_socket.io.connected) {
					_socket.io.emit(event, data);
				} else {
					_buffer.push([event, data]);
				}
			};
		return {
			init:	init,
			emit:	emit
		};
	})(),
	
	Worker = (function() {
		var _list = {},
		create = function(file) {
			
		},
		close = function(file) {
			
		},
		one = function(file) {
			
		},
		oneOrNew = function(file) {
			// queste 2 funzioni che sono uguali in più moduli le possiamo aggiungere col metodo oggetto.method preso dal libro, cosi le scriviamo una volta sola
		};
		return {
			create		: function(file) { return utils.CK(create,	"Error: Worker not created. ",	file) },
			close		: function(file) { return utils.CK(close,		"Error: Worker not closed. ",	file) },
			one			: one,
			oneOrNew	: oneOrNew
		}
	})(),
	
	Dashboard = (function() {
		var _dom, _imageGroup = {}, _$buttonModify, _zoomLabel, _$zoomLabelDoms, _$coordsLabel, _$allDom, 
		_draggable = true, _isMouseDown = false, _zoomable = true, _isLoading = false, _timeoutForSpinner = false,
		_zoomScaleLevelsDown = [ 1, 0.88, 0.7744, 0.681472, 0.59969536, 0.5277319168, 0.464404086783, 0.408675596397, 0.359634524806, 0.316478381829, 0.278500976009, 0.245080858888, 0.215671155822, 0.189790617123, 0.167015743068, 0.146973853900, 0.129336991432, 0.113816552460, 0.100158566165, 0.088139538225 ],
		_zoomScaleLevelsUp = [ 1, 1.136363636364, 1.291322314050, 1.467411720511, 1.667513318762, 1.894901498594, 2.153297157493, 2.446928588060, 2.780600668250, 3.159773486648, 3.590651689372, 4.080286010650, 4.636688648466, 5.268964373257, 5.987459515065, 6.803931267119, 7.731740076272, 8.786068268491, 9.984168486921, 11.34564600787 ],
		_mouseX, _mouseY, _currentX, _currentY, _zoom = 1, _decimals = 0, _socketCallsInProgress = 0, _animationZoom = false,
		_zoomScale = 0.12, _zoom = 1, _zoomMax = 20, _deltaZoomMax = 2, _deltaZoom = 0, _deltaDragMax = 200, _deltaDragX = 0, _deltaDragY = 0, // per ricalcolare le immagini visibili o no durante il drag
		
		_cache = (function() {
			var _list = {},
				_ids = [],
				_maxCacheSize = 100,	// forse sarebbe cool parametrizzare questo in base alle prestazioni locali
			_updateIds = function() {
				_ids = Object.keys(_list);
			},
			add = function(id, data) {
				// se la cache html5 può fare al caso nostro, salviamo data in cache, e id nella lista cosi sappiamo cosa abbiamo e cosa no
				// altrimenti mettiamo entrambi nel dizionario _list
				if (_list[id]) return;
				_list[id] = data;
				_updateIds();
			},
			get = function(id) {
				return _list[id] || false;
			},
			set = function(id, data) {
				del(id);
				add(id, data);
			},
			del = function(id) {
				_list[id] = undefined;
				delete _list[id];
				_updateIds();
			},
			log = function() {
				console.log(_list);
			},
			ids = function() {
				return _ids;
			},
			length = function() {
				return _ids.length;
			},
			exist = function(id) {
				return _ids.indexOf(id) >= 0;
			},
			clean = function(force) {	// magari anche un metodo che controlli quanto abbiamo in cache e se necessario la liberi
				if (force || _ids.length > _maxCacheSize) {
					
				}
			},
			allInv = function() {
				for (var i = _ids.length; i--; ) {
					_list[_ids[i]].isVisible = false;
				}
			};
			return {
				get				: get,
				set				: set,
				add				: add,
				del				: del,
				log				: log,
				ids				: ids,
				length			: length,
				exist			: exist,
				clean			: clean,
				setAllInvisible	: allInv
			};
		})(),
		_imagesVisibleIds = [],
		_initDomGroup = function() {
			if (_imageGroup.tag) {
				_dom.removeChild(_imageGroup.tag);
				_imageGroup.origin = _imageGroup.tag = null;
				_imageGroup.pxx = _imageGroup.pxy = 0;
			}
			var g = DOCUMENT.createElementNS("http://www.w3.org/2000/svg", "g");
			var origin = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
			g.setAttribute('id', 'imageGroup');
			origin.setAttributeNS(null, 'x', 0);
	        origin.setAttributeNS(null, 'y', 0);
	        origin.setAttributeNS(null, 'height', '1');
	        origin.setAttributeNS(null, 'width', '1');
	        origin.setAttributeNS(null, 'fill', '#FFF');
	        g.appendChild(origin);
			_dom.appendChild(g);
			_imageGroup.tag = g;
			_imageGroup.origin = origin;
		},
		_initDom = function() {
			_dom = DOCUMENT.querySelector("#dashboard");
			_zoomLabel = DOCUMENT.querySelector("#zoomLabel");
			_$zoomLabelDoms = $("#zoomLabel, #zoomLabelCont");
			_initDomGroup();
			_imageGroup.matrix = _imageGroup.tag.getCTM();
			_$buttonModify = $("#showEditor");
			_$allDom = $("#showEditor, #zoomLabel, #zoomLabelCont");
			_$buttonModify.css({display: "block"});
			if (Config.debug) {
				$("#dashboardCoords").css("display", "block");
				_$coordsLabel = $("#dashboardCoords span");
				_$allDom = $("#showEditor, #zoomLabel, #zoomLabelCont");
				_updateCoordsLabel(_currentX, _currentY);
			}
		},
		_updateCoordsLabel = Config.debug ? function(x, y) {
			_$coordsLabel.html(["(", x, ", ", y, ")"].join(''));
		} : function(){},
		_updateCurrentCoords = function(x, y) {
			_currentX = x;
			_currentY = y;
			_updateCoordsLabel(x, y);
		},
		_animZoom = function() {
			if (_zoom === 1) {
				Editor.show();
				_animationZoom = false;
			} else {
				_zoomTo(_zoom - 1, XX2, YY2, true);
				requestAnimationFrame(_animZoom);
			}
		},
		_buttonModifyClick = function() {
			if (!_animationZoom) {
				_animationZoom = true;
				_animZoom();
			}
		},
		_isVisible = function(img) {	// OK - la zona "visibile" è quella attualmente a video, più una schermata per ogni lato, come sorta di 'cache'
			var z = _imageGroup.matrix.a,
				deltaCoordX = 1.5 * XX / z,
				deltaCoordY = 1.5 * YY / z;
			return ((img.x + img.w > _currentX - deltaCoordX) &&	// left
				(img.y - img.h < _currentY + deltaCoordY) &&	   // top
				(img.x < _currentX + deltaCoordX) &&			  // right
				(img.y > _currentY - deltaCoordY));				 // bottom
			//return (img.pxx + img.pxw > -XX && img.pxy + img.pxh > -YY && img.pxx < DXX && img.pxy < DYY);
		},
		_updateGroupOrigin = function() {
			//_imageGroup.pxx = round(_imageGroup.pxx + (zx - _imageGroup.pxx) * (1 - z), _decimals);
			//_imageGroup.pxy = round(_imageGroup.pxy + (zy - _imageGroup.pxy) * (1 - z), _decimals);
			var _groupRect = _imageGroup.origin.getBoundingClientRect();
			_imageGroup.pxx = round(_groupRect.left, _decimals);
			_imageGroup.pxy = round(_groupRect.top, _decimals);
		},
		_updateCache = function() {
			var _ids = _cache.ids();
			for (var i = _ids.length; i--; ) {
				var _img = _cache.get(_ids[i]),
					rect = _img.data.getBoundingClientRect();
				_img.pxx = round(rect.left, _decimals);
				_img.pxy = round(rect.top, _decimals);
				_img.pxw = round(rect.width, _decimals);
				_img.pxh = round(rect.height, _decimals);
				_img.isVisible = _isVisible(_img);
				(_imagesVisibleIds.indexOf(_img.id) >= 0) && (!_img.isVisible) && _removeDraw(_img.id, false);
				_cache.set(_img.id, _img);
			}
		},
		/* _updateCacheForZoom = function(z, zx, zy) {	// OK
			var _ids = _cache.ids();
			for (var i = _ids.length; i--; ) {
				var _img = _cache.get(_ids[i]);
				//_img.pxx = _img.pxx + _deltaDragX;
				//_img.pxx = round(_img.pxx + (zx - _img.pxx) * (1 - z), _decimals);
				//_img.pxy = _img.pxy + _deltaDragY;
				//_img.pxy = round(_img.pxy + (zy - _img.pxy) * (1 - z), _decimals);
				//_img.pxw = round(_img.pxw * z, _decimals);
				//_img.pxh = round(_img.pxh * z, _decimals);
				_img.isVisible = _isVisible(_img);
				(_imagesVisibleIds.indexOf(_img.id) >= 0) && (!_img.isVisible) && _removeDraw(_img.id, false);
				_cache.set(_img.id, _img);
			}
			_deltaDragX = _deltaDragY = 0;
		}, */
		_zoomTo = function(level, x, y, animated) {	// "OK"
			// posso provare a correggere gli arrotondamenti facendo i calcoli fissando un numero di decimali
			if (level === _zoom || level > _zoomMax || level < 1) return;
			var refreshCache = (level === 1 || animated !== true),
				deltaZoomLevel = level - _zoom,
				newp = _dom.createSVGPoint(),
				//_zz = (deltaZoomLevel > 0) ? MATH.pow(1 - _zoomScale, -deltaZoomLevel) : MATH.pow(1 / (1 - _zoomScale), deltaZoomLevel),
				//_z = (deltaZoomLevel > 0) ? MATH.pow(1 - _zoomScale, deltaZoomLevel) : MATH.pow(1 / (1 - _zoomScale), -deltaZoomLevel),
				_scaleLevelIndex = MATH.abs(deltaZoomLevel),
				_zz = (deltaZoomLevel > 0) ? _zoomScaleLevelsUp[_scaleLevelIndex] : _zoomScaleLevelsDown[_scaleLevelIndex],
				_z = (deltaZoomLevel > 0) ? _zoomScaleLevelsDown[_scaleLevelIndex] : _zoomScaleLevelsUp[_scaleLevelIndex],
				_currentScale = 1 / _imageGroup.matrix.a,
				_currentScaleAndZoom = _currentScale * round(_zz - 1, 12);
			_zoom = level;
			_deltaZoom = _deltaZoom + MATH.max(deltaZoomLevel, 0);
			newp.x = x;
			newp.y = y;
			newp = newp.matrixTransform(_imageGroup.tag.getScreenCTM().inverse());
			newp.x = round(newp.x);
			newp.y = round(newp.y);
			_imageGroup.matrix = _imageGroup.matrix.translate(-(newp.x * (_z-1)), -(newp.y * (_z-1)));
			_imageGroup.matrix.a = _imageGroup.matrix.d = _zoomScaleLevelsDown[_zoom - 1];
			_imageGroup.updateMatrix();
			var _newCoordX = round(_currentX + ((XX2 - x) * _currentScaleAndZoom), _decimals),
				_newCoordY = round(_currentY - ((YY2 - y) * _currentScaleAndZoom), _decimals);
			_updateCurrentCoords(_newCoordX, _newCoordY);
			_updateGroupOrigin();
			//_updateCacheForZoom(_z, x, y);
			refreshCache && (_deltaZoom > _deltaZoomMax) && _fillScreen(); 	// dopo lo zoom e l'aggiornamento delle imm, scarico e visualizzo le nuove. necessario solo se sto rimpicciolendo la schermata.
			_zoomLabel.textContent = [round(100 - (95 / _zoomMax) * (level - 1)), "%"].join('');
		},
		/* _updateCacheForDrag = function(dx, dy) {	// OK
			var _ids = _cache.ids();
			for (var i = _ids.length; i--; ) {
				var _img = _cache.get(_ids[i]);
				//_img.pxx = _img.pxx + dx;
				//_img.pxy = _img.pxy + dy;
				_img.isVisible = _isVisible(_img);
				(_imagesVisibleIds.indexOf(_img.id) >= 0) && (!_img.isVisible) && _removeDraw(_img.id, false);
				_cache.set(_img.id, _img);
			}
		}, */
		_drag = function(dx, dy, forceLoad) {	// OK. dx dy sono le differenze in px, non in coordinate (bisogna tenere conto dello zoom)
			if (dx === 0 && dy === 0) return;
			var scale = _imageGroup.matrix.a,
				_deltaX = round(dx / scale, _decimals),
				_deltaY = round(dy / scale, _decimals);
			_deltaDragX = _deltaDragX + dx;
			_deltaDragY = _deltaDragY + dy;
			_imageGroup.matrix = _imageGroup.matrix.translate(_deltaX, _deltaY);
			_imageGroup.updateMatrix();
			var _newCoordX = round(_currentX - _deltaX, _decimals),
				_newCoordY = round(_currentY + _deltaY, _decimals);
			_updateCurrentCoords(_newCoordX, _newCoordY);
			_updateGroupOrigin();
			//_updateCacheForDrag(dx, dy);
			(forceLoad || MATH.abs(_deltaDragX) > _deltaDragMax || MATH.abs(_deltaDragY) > _deltaDragMax) && _fillScreen();
		},
		onSocketMessage = function(data) {
			if (["end", "none", "error"].indexOf(data) >= 0) {
				_socketCallsInProgress--;
				if (_socketCallsInProgress === 0) {
					_isLoading = false;
					utils.setSpinner(false);
				}
			} else {
				_addDraws(JSON.parse(data));
			}
		},
		_addDraws = function(draws) {	// aggiunge uno ad uno i disegni ricevuti dal socket
			//console.log("disegni ricevuti: " + draws.length);
			var draw,
				scale = _imageGroup.matrix.a;
			for (var i = 0, l = draws.length; i < l; i++) {
				draw = draws[i];
				if (_cache.exist(draw.id)) continue;	// questo controllo dovrebbe essere inutile, ma meglio evitarsi il lavoro di aggiungere un disegno per sbaglio				
				//draw.pxx = round((draw.x - _currentX) * scale + XX2, 1);
				//draw.pxy = round((_currentY - draw.y) * scale + YY2, 1);
				addDraw(draw);
				_imageGroup.matrix = _imageGroup.tag.getCTM();
				_imageGroup.matrix = _imageGroup.matrix.translate(0, 0);
				_imageGroup.updateMatrix();
			}
		},
		addDraw = function(draw, replace) {	// OK	aggiunge e salva un disegno passato dall editor o dal socket
			//console.log(draw);
			if (!draw || !draw.id) return false;
			var _drawExist = _cache.exist(draw.id),
				scale = _imageGroup.matrix.a;
			if (!_drawExist || replace) {
				//draw.pxw = round(draw.w * scale, _decimals);
				//draw.pxh = round(draw.h * scale, _decimals);
				_drawExist && _removeDraw(draw.id, true);
				var _newDraw = DOCUMENT.createElementNS("http://www.w3.org/2000/svg", "image");
				_newDraw.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", draw.base64);
				//_newDraw.setAttribute('x', round((draw.pxx - _imageGroup.pxx) / scale, _decimals));
				//_newDraw.setAttribute('y', round((draw.pxy - _imageGroup.pxy) / scale, _decimals));
				_newDraw.setAttribute('x', round(((draw.x - _currentX) * scale + XX2 - _imageGroup.pxx) / scale, _decimals));
				_newDraw.setAttribute('y', round(((_currentY - draw.y) * scale + YY2 - _imageGroup.pxy) / scale, _decimals));
				_newDraw.setAttribute('width', draw.w);
				_newDraw.setAttribute('height', draw.h);
				_newDraw.id = draw.id;
				draw.base64 = undefined;
				delete draw.minX;
				delete draw.minY;
				delete draw.maxX;
				delete draw.maxY;
				delete draw.coordX;
				delete draw.coordY;
				delete draw.base64;
				draw.data = _newDraw;
				_appendDraw(draw);
				_newDraw = draw = undefined;
			}
		    return true;
		},
		_removeDraw = function(id, del) {	// OK
			//console.log("rimuovo:" + id);
			(del || false) && _cache.del(id);
			_imagesVisibleIds.splice(_imagesVisibleIds.indexOf(id), 1);
			var _oldDraw = DOCUMENT.getElementById(id);
			_oldDraw && _imageGroup.tag.removeChild(_oldDraw);
		},
		_appendDraw = function(draw) {	// aggiunge alla dashboard un svg image già elaborato 
			if (!draw || !draw.id) return false;
			if (_imagesVisibleIds.indexOf(draw.id) === -1) {
				//console.log(["aggiungo", draw]);
				_imagesVisibleIds.push(draw.id);
				_imagesVisibleIds = _imagesVisibleIds.sort(orderStringDown);
				var index = _imagesVisibleIds.indexOf(draw.id) + 1;
				if (index < _imagesVisibleIds.length) {
					_imageGroup.tag.insertBefore(draw.data, DOCUMENT.getElementById(_imagesVisibleIds[index]));
				} else {
					_imageGroup.tag.appendChild(draw.data);
				}
				draw.isVisible = true;
				_cache.add(draw.id, draw);
			}
		},
		_getVisibleArea = function() {	// OK - in coordinate assolute
			// TODO - per adesso cambio qui la dimensione dell'area da scaricare per scaricare tutto in un colpo,
			//			ma in futuro sarà meglio fare prima la chiamata per la schermata a video e poi un'altra chiamata per la zona intorno
			var z = _imageGroup.matrix.a,
				deltaCoordX = 1.5 * XX / z,
				deltaCoordY = 1.5 * YY / z;
			return {
				minX : _currentX - deltaCoordX,
				maxX : _currentX + deltaCoordX,
				minY : _currentY - deltaCoordY,
				maxY : _currentY + deltaCoordY,
				x : _currentX,
				y : _currentY
			}
		},
		_findInCache = function() {
			var _ids = _cache.ids().filter(function(i) {return _imagesVisibleIds.indexOf(i) < 0}),
				_draw;
			for (var i = _ids.length; i--; ) {
				_draw = _cache.get(_ids[i]);
				(_isVisible(_draw)) && _appendDraw(_draw);
			}
		},
		_callSocketFor = function(area, notIds) { // OK
			_socketCallsInProgress++;
			if (!_isLoading) {
				_isLoading = true;
				if (_timeoutForSpinner === false) {
					_timeoutForSpinner = true;
					setTimeout(function() {
						_isLoading && utils.setSpinner(true);
						_timeoutForSpinner = false;
					}, 100);
				}
			}
			Socket.emit("dashboard drag", {
				"area": area,
				"ids": notIds
			});
		},
		_fillScreen = function() {	// OK
			// 1 - aggiorna le coordinate in px delle immagini in cache (e rimuove quelle non piu visibili)
			_deltaDragX = _deltaDragY = _deltaZoom = 0;
			_updateCache();
			// 2° calcola la porzione da mostrare in base alle coordinate correnti, zoom e dimensioni schermo
			var _area = _getVisibleArea();
			// 3° visualizza subito quello che c'è già in cache
			_findInCache();
			// 4° avvia trasferimenti di ciò che non è in cache e che deve comparire
			_callSocketFor(_area, _cache.ids());
		},
		goToXY = function(x, y) {	// OK
			// calcolo la differenza in px invece che coord, e chiamo _drag. se si inseriscono coordinate poco distanti dalle attuali, forzo l'aggiornamento e il caricamento delle nuove
			if (utils.areEmpty([x, y])) return;
			var dx = round((x - _currentX) * _imageGroup.matrix.a),
				dy = round((y - _currentY) * _imageGroup.matrix.a);
			_updateCurrentCoords(x, y);
			_imagesVisibleIds = [];
			_cache.setAllInvisible();
			_initDomGroup();
			//_updateCacheForDrag(dx, dy);
			_fillScreen();
		}, 
		goToDraw = function(id) {	// TODO
			// precarica (se necessario) il disegno e poi va alle sue coordinate. in questo modo sono sicuro che sarà visualizzato per primo (importante visto che è stato richiesto specificamente)
			if (utils.isEmpty(id)) return;
			if (_cache.exist(id)) {
				var draw = _cache.get(id);
			} else {
				// TODO: prendo via socket il disegno passando l'id,
				var draw = {
					id	: id,
					x	: 0,
					y	: 0,
					w	: 0,
					h	: 0,
					data: {}
				};
				_cache.set(id, draw);
			}
			goToXY(draw.x + draw.w / 2, draw.y + draw.h / 2);
		},
		_mousedown = function(e) {
			if (e.button !== 0) return false;
			var p = _dom.createSVGPoint();
			_isMouseDown = true;
			_dom.classList.add('dragging');
			_mouseX = e.pageX;
			_mouseY = e.pageY;
			_imageGroup.matrix = _imageGroup.tag.getCTM();
			p.x = e.pageX;
			p.y = e.pageY;
			_imageGroup.state = p.matrixTransform(_imageGroup.matrix);
		},
		__mousemove = function() {
			_drag(this[0], this[1], false);
			_mouseX = this[2];	// questo init lo metto qui perché se ci sono dei mousemove che vanno persi nell'attesa di requestAnimationFrame, i delta cords non vanno persi
			_mouseY = this[3];
			_draggable = true;
		},
		_mousemove = function(e) {
			if (_isMouseDown && _draggable) {
				var dx = e.pageX - _mouseX,
					dy = e.pageY - _mouseY;
				_draggable = false;
				requestAnimationFrame(__mousemove.bind([dx, dy, e.pageX, e.pageY]));
			}
		},
		_click = function(e) {
			// se ho cliccato su un disegno lo evidenzio, con bordo proporzionale allo zoom corrente
			if (e.target.id === "dashboard") {
				_cache.log();
			}
		},
		_mouseend = function() {
			_mouseX = 0;
			_mouseY = 0;
			_isMouseDown = false;
			_dom.classList.remove('dragging');
		},
		_mouseup = function(e) {
			if (e.button !== 0) return false;
			_mouseend();
		},
		_mouseout = function(e) {
			_mouseend();
		},
		_mouseover = function(e) {
			if (e.target.id === "dashboard") {
				_mouseX = e.pageX;
				_mouseY = e.pageY;
			}
		},
		__mouseWheel = function() {
			_zoomTo(this[0] > 0 ? _zoom - 1 : _zoom + 1, this[1], this[2]);
			_zoomable = true;
		},
		_mouseWheel = function (e) {	// TODO: Test browser
			if (e.preventDefault)
				e.preventDefault();
			e.returnValue = false;
			var _delta = e.wheelDelta ? e.wheelDeltaY : -e.detail;	// delta negativo --> scroll verso il basso --> le immagini si rimpiccioliscono e la lavagna si ingrandisce --> zoom + 1
			if (_zoomable && !_isMouseDown) {
				_zoomable = false;
				requestAnimationFrame(__mouseWheel.bind([_delta, e.clientX, e.clientY]));
			}
		},
		_keyDown = function(e) {
			if (e.keyCode === 37) _drag(-1, 0);
			if (e.keyCode === 38) _drag(0, -1);
			if (e.keyCode === 39) _drag(1, 0);
			if (e.keyCode === 40) _drag(0, 1);
		},
		_addEvents = function() {
			_dom.addEventListener('click',			_click,		true);
			_dom.addEventListener('mousedown',		_mousedown,	true);
			_dom.addEventListener('mousemove', 		_mousemove,	true);
			_dom.addEventListener('mouseup',		_mouseup,	true);
			//_dom.addEventListener('mouseout',		_mouseout,	true);
			_dom.addEventListener('mouseover',		_mouseover,	true);
			_dom.addEventListener(_mouseWheelEvent, _mouseWheel,true);
			Config.debug && DOCUMENT.addEventListener("keydown", _keyDown, false);
			_$buttonModify.bind("mousedown", _buttonModifyClick);
		},
		_removeEvents = function() {
			_dom.removeEventListener('click',			_click,		true);
			_dom.removeEventListener('mousedown',		_mousedown,	true);
			_dom.removeEventListener('mousemove', 		_mousemove,	true);
			_dom.removeEventListener('mouseup',			_mouseup,	true);
			//_dom.removeEventListener('mouseout',		_mouseout,	true);
			_dom.removeEventListener('mouseover',		_mouseover,	true);
			_dom.removeEventListener(_mouseWheelEvent, 	_mouseWheel,true);
			Config.debug && DOCUMENT.removeEventListener("keydown", _keyDown, false);
			_$buttonModify.unbind("mousedown", _buttonModifyClick);
		},
		overshadow = function() {	// mette in secondo piano e blocca la dashboard per mostrare l'editor
			_draggable = _zoomable = false;
			_removeEvents();
			_$allDom.fadeOut("fast");
		},
		foreground = function() {	// riporta in primo piano la dashboard e la rende funzionante
			_draggable = _zoomable = true;
			_addEvents();
			_$allDom.fadeIn("fast");
		},
		getCoords = function() {
			return {
				x: round(_currentX),
				y: round(_currentY)
			};
		},
		onResize = function () {	// TODO
			// calcolo coordinate, punto in centro pagina, aggiungo o rimuovo disegni
			// i disegni non devono spostarsi rispetto allo schermo, ma le coordinate correnti devono essere calcolate al centro della finestra
		},
		TESTdrawRect = function(x, y) {
			var rect = DOCUMENT.createElementNS("http://www.w3.org/2000/svg", 'rect');
	        rect.setAttributeNS(null, 'x', x);
	        rect.setAttributeNS(null, 'y', y);
	        rect.setAttributeNS(null, 'height', '10');
	        rect.setAttributeNS(null, 'width', '10');
	        _imageGroup.tag.appendChild(rect);
		},
		init = function() {
			//scelgo a che posizione aprire la lavagna
			_imageGroup.updateMatrix = function() {
				var matrix = _imageGroup.matrix;
				_imageGroup.tag.setAttribute("transform", "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + round(matrix.e, 4) + "," + round(matrix.f, 4) + ")");
			};
			_initDom();
			_addEvents();
			goToXY(0, 0);
		};
		_mouseX = _mouseY = _currentX = _currentY = 0;
		return {
			overshadow		: overshadow,
			foreground		: foreground,
			goToXY			: goToXY,
			goToDraw		: goToDraw,
			addDraw			: addDraw,
			getCoords		: getCoords,
			onSocketMessage	: onSocketMessage,
			onResize		: onResize,
			init			: init
		};
	})(),
	
	Editor = (function() {
		var _dom, _$dom, _context, _$allDom, _$allDomContainer, _$allMenuTool, _$brushTool, _$pencilTool, _$eraserTool, _$pickerTool, _$editorUndo, _$editorRedo, _$editorHide,
		_$ptions, _$pickerToolPreview, _$pickerToolColor, _$pickerToolColor2, _$randomColorButton, _$editorSave, _$sizeToolContainer, _$grayscaleContainer, _$grayscalePointer,
		_$editorShowOptions, _$optionDraft, _$optionRestore, _$optionSquare, _$optionExport, _$optionClear, _$closeButtons,
		_minX, _minY, _maxX, _maxY, _oldX, _oldY, _mouseX = 0, _mouseY = 0, _numUndoStep = 31, _currentStep = 0, _oldMidX, _oldMidY, _$sizeToolPreview, _$sizeToolLabel,
		_isInit, _isMouseDown, _isPressedShift, _restored = false, _randomColor = true, _overlay = false, _grayscaleIsScrolling = false, _isSaving = false,
		_draft = {}, _step = [], _toolSelected = 0, _editorMenuActions = [], _editorMenuActionsLength = 0, _savedDraw = {},
		_color, _size, _pencilSize = 2, _pencilColor = "", _pencilColorID = 12, _brushSize = 50, _eraserSize = 50, _brushColor, _maxToolSize = 200,
		_grayscaleColors = ["#FFF", "#EEE", "#DDD", "#CCC", "#BBB", "#AAA", "#999", "#888", "#777", "#666", "#555", "#444", "#333", "#222", "#111", "#000"], 
		_enableElement = utils.enableElement,
		_disableElement = utils.disableElement,
		_labelAnnulla = label["Annulla"],
		_labelRipeti = label["Ripeti"],
		__init = function() {
			_dom = DOCUMENT.querySelector("#editor");
			_context = _dom.getContext("2d");
			_$dom = $("#editor");
			_$options = $("#editorOptions");
			_$pickerToolPreview = $("#pickerToolPreview");
			_$pickerToolColor = $("#pickerToolColor");
			_$pickerToolColor2 = $("#pickerToolColor2");
			_$allDomContainer = $("#editorContainer");
			_$allDom = $("#editorMenu, #editor, #editorSmallTool");
			_optionsSizeX = _$options.width();
			_optionsSizeY = _$options.height();
			_dom.width = XX;
			_dom.height = YY;
			_editorMenuActions = [_hide, _selectBrush, _selectPencil, _selectEraser, _selectPicker, _selectRandomColor, _undo, _redo, _save, _showOptions];
			_editorMenuActionsLength = _editorMenuActions.length;
			_$brushTool = $("#editorMenu1");
			_$pencilTool = $("#editorMenu2");
			_$eraserTool = $("#editorMenu3");
			_$pickerTool = $("#editorMenu4");
			_$randomColorButton = $("#editorMenu5");
			_$editorUndo = $("#editorMenu6");
			_$editorRedo = $("#editorMenu7");
			_$editorSave = $("#editorMenu8");
			_$editorShowOptions = $("#editorMenu9");
			_$editorHide = $("#editorMenu0");
			_$allMenuTool = $("#editorMenu1, #editorMenu2, #editorMenu3, #editorMenu4");
			_$optionDraft = $("#optionDraft").html(label['SalvaBozza']);
			_$optionRestore = $("#optionRestore").html(label['Ripristina']);
			_$optionSquare = $("#optionSquare").html(label['FoglioQuadretti']);
			_$optionExport = $("#optionExport").html(label['Esporta']);
			_$optionClear = $("#optionClear").html(label['Svuota']);
			_disableElement(_$optionRestore);
			_$sizeToolPreview = $("#sizeToolPreview");
			$("#toolSize a").html(label['Dimensione']);
			_$closeButtons = $("#closeOptions");
			_$sizeToolLabel = $("#sizeToolLabel");
			_$sizeToolContainer = $("#sizeToolContainer");
			_$grayscaleContainer = $("#pencilGrayscaleCont");
			_$grayscalePointer = $("#grayscalePointer");
		},
		_init = function() {
			if (!_isInit) {
				_isInit = true;
				__init();
				_saveStep();
				_initGrayscale();
				_colorPicker.init();
				_onResize();
				_brushColor = _getColor();
				_selectBrush();
			}
		},
		_addEvents = function() {
			_dom.addEventListener('mouseup', _mouseend,	true);
			_dom.addEventListener('mousedown', _mousedown,	true);
			DOCUMENT.addEventListener('mousemove', _mousemove,	true);
			DOCUMENT.addEventListener('mouseout', 	_mouseend,	true);
			DOCUMENT.addEventListener("keydown", _keyDown, false);
			DOCUMENT.addEventListener("keyup", _keyUp, false);
			_$dark.bind("click", _darkClick);
			_$brushTool.bind("mousedown", _editorMenuActions[1]);
			_$pencilTool.bind("mousedown", _editorMenuActions[2]);
			_$eraserTool.bind("mousedown", _editorMenuActions[3]);
			_$pickerTool.bind("mousedown", _editorMenuActions[4]);
			_$randomColorButton.bind("mousedown", _editorMenuActions[5]);
			_$editorUndo.bind("mousedown", _editorMenuActions[6]);
			_$editorRedo.bind("mousedown", _editorMenuActions[7]);
			_$editorSave.bind("mousedown", _editorMenuActions[8]);
			_$editorShowOptions.bind("mousedown", _editorMenuActions[9]);
			_$editorHide.bind("mousedown", _editorMenuActions[0]);
			_$optionDraft.bind("click", _draft);
			_$optionRestore.bind("click", _restore);
			_$optionSquare.bind("click", _toggleBackground);
			_$optionExport.bind("click", _export);
			_$optionClear.bind("click", clear);
			_$closeButtons.bind("click", _hideOptions);
			_colorPicker.addEvents();
			//WINDOW.onbeforeunload = function() { return label['closePrevent']; };
			WINDOW.addEventListener("resize", _onResize, true);
			_dom.addEventListener(_mouseWheelEvent, _mouseWheel, true);
			_$sizeToolContainer[0].addEventListener(_mouseWheelEvent, _mouseWheel, true);
		},
		_removeEvents = function() {
			_dom.removeEventListener('mouseup',	_mouseend);
			_dom.removeEventListener('mousedown', _mousedown);
			DOCUMENT.removeEventListener('mousemove', 	_mousemove);
			DOCUMENT.removeEventListener('mouseout', 	_mouseend);
			DOCUMENT.removeEventListener("keydown", _keyDown, false);
			DOCUMENT.removeEventListener("keyup", 	_keyUp, false);
			_$dark.unbind("click", _darkClick);
			_$brushTool.unbind("mousedown", _editorMenuActions[1]);
			_$pencilTool.unbind("mousedown", _editorMenuActions[2]);
			_$eraserTool.unbind("mousedown", _editorMenuActions[3]);
			_$pickerTool.unbind("mousedown", _editorMenuActions[4]);
			_$randomColorButton.unbind("mousedown", _editorMenuActions[5]);
			_$editorUndo.unbind("mousedown", _editorMenuActions[6]);
			_$editorRedo.unbind("mousedown", _editorMenuActions[7]);
			_$editorSave.unbind("mousedown", _editorMenuActions[8]);
			_$editorShowOptions.unbind("mousedown", _editorMenuActions[9]);
			_$editorHide.bind("mousedown", _editorMenuActions[0]);
			_$optionDraft.unbind("click", _draft);
			_$optionRestore.unbind("click", _restore);
			_$optionSquare.unbind("click", _toggleBackground);
			_$optionExport.unbind("click", _export);
			_$optionClear.unbind("click", clear);
			_$closeButtons.unbind("click", _hideOptions);
			_colorPicker.removeEvents();
			WINDOW.onbeforeunload = undefined;
			WINDOW.removeEventListener("resize", _onResize);
			_dom.removeEventListener(_mouseWheelEvent, _mouseWheel, true);
			_$sizeToolContainer[0].addEventListener(_mouseWheelEvent, _mouseWheel, true);
		},
		_initGrayscale = function() {
			var length = _grayscaleColors.length;
			for (var i = 0; i < length; i++) {
				var div = $('<div>');
				div.css('background-color', _grayscaleColors[i]);
				_$grayscaleContainer.append(div);
			}
			_pencilColor = _grayscaleColors[_pencilColorID];
			_$grayscalePointer.css({
				'top':			_pencilColorID * 20 + 2 + 'px',
				'border-color':	["transparent transparent transparent ", _pencilColor].join('')
			});
		},
		_saveLayer = function() {
			return {
				data : _minX === -1 ? _context.getImageData(-1, -1, -1, -1) : _context.getImageData(_minX, _minY, _maxX - _minX, _maxY - _minY),
				minX : _minX,
				minY : _minY,
				maxX : _maxX,
				maxY : _maxY,
				oldX : _oldX,
				oldY : _oldY
			}
		},
		_saveStep = function() {
			if (_currentStep !== 0) {
				_step.splice(0, _currentStep);
				_currentStep = 0;
			}
			_step.splice(0, 0, _saveLayer());
			if (_step.length > _numUndoStep)
				_step.splice(_numUndoStep, _step.length);
			if (_step.length > 1)
				_enableElement(_$editorUndo);
			else
				_disableElement(_$editorUndo);
			_disableElement(_$editorRedo);
		},
		_restoreStep = function(step) {
			_context.putImageData(step.data, step.minX, step.minY);
			_minX = step.minX;
			_minY = step.minY;
			_maxX = step.maxX;
			_maxY = step.maxY;
			_oldX = step.oldX;
			_oldY = step.oldY
		},
		_line = function(X, Y) {
			_context.beginPath();
			_context.moveTo(_oldX, _oldY);
			_context.lineWidth = _size;
			_context.strokeStyle = _color;
			_context.lineJoin = "round";
			_context.lineCap = "round";
        	_context.lineTo(X, Y);
      		_context.stroke();
		},
		_circle = function(X, Y) {
			_context.beginPath();
			_context.fillStyle = _color;
    	    _context.arc(X, Y, _size / 2, 0, PI2, true);
	        _context.fill();
		},
		_checkCoord = function(X, Y) {
			if (_toolSelected === 0 || _toolSelected === 1) {
				var offset = _size / 2;
				if (_minX === -1 || _minX > (X - offset)) _minX = X - offset;
				if (_minY === -1 || _minY > (Y - offset)) _minY = Y - offset;
				if (_maxX === -1 || _maxX < (X + offset)) _maxX = X + offset;
				if (_maxY === -1 || _maxY < (Y + offset)) _maxY = Y + offset;
				if (_minX < 0) _minX = 0;
				if (_minY < 0) _minY = 0;
				if (_maxX > XX) _maxX = XX;
				if (_maxY > YY) _maxY = YY;
			}
			_oldX = X;
			_oldY = Y;
		},
		_selectBrush = function() {
			if (_toolSelected !== 0) {
				_toolSelected = 0; 			// PENNELLO
				_$dom.removeClass("usePencil useEraser usePicker").addClass("useBrush");
				_$allMenuTool.removeClass("selected");
				_$brushTool.addClass("selected");
				_context.globalCompositeOperation = 'source-over';
				_$pickerToolPreview.hide();
				_$sizeToolContainer.hide();
			}
			_size = _brushSize;
			_color = _brushColor;
			_getColor();
		},
		_selectPencil = function() {
			if (_toolSelected !== 1) {
				_toolSelected = 1;			// MATITA
				_$dom.removeClass("useBrush useEraser usePicker").addClass("usePencil");
				_$allMenuTool.removeClass("selected");
				_$pencilTool.addClass("selected");
				_context.globalCompositeOperation = 'source-over';
				_$pickerToolPreview.hide();
				_$sizeToolContainer.hide();
			}
			_color = _pencilColor;
			_size = _pencilSize;
		},
		_selectEraser = function() {
			if (_toolSelected !== 2) {
				_toolSelected = 2;			// GOMMA
				_$dom.removeClass("usePencil useBrush usePicker").addClass("useEraser");
				_$allMenuTool.removeClass("selected");
				_$eraserTool.addClass("selected");
				_context.globalCompositeOperation = 'destination-out';
				_$pickerToolPreview.hide();
				_$sizeToolContainer.hide();
			}
			_size = _eraserSize;
		},
		_selectPicker = function() {
			if (_toolSelected !== 3) {
				_toolSelected = 3;			// PIPETTA
				_$dom.removeClass("usePencil useEraser useBrush").addClass("usePicker");
				_$allMenuTool.removeClass("selected");
				_$pickerTool.addClass("selected");
				_$pickerToolColor2.css("background-color", _randomColor ? "white" : _color);
				_$pickerToolPreview.show();
				_$sizeToolContainer.hide();
			}
			_color = _brushColor;
		},
		_selectRandomColor = function() {
			if (!_randomColor) {
				if (_toolSelected === 3)
					_selectBrush();
				_randomColor = true;
				_$randomColorButton.addClass("selected");
			}
			_getColor();
		},
		_updatePickerTool = function() {
			var px = _context.getImageData(_mouseX, _mouseY, 1, 1).data, __color = px[3] === 0 ? "white" : "rgb(" + px[0] + "," + px[1] + "," + px[2] + ")";
			_$pickerToolColor.css("background-color", __color);
			if (_isMouseDown && px[3] > 0) {
				_brushColor = __color;
				_$randomColorButton.removeClass("selected");
				_$pickerToolColor2.css("background-color", __color);
				_randomColor = false;
				_colorPicker.setColor(__color);
			}
		},
		_darkClick = function() {
			(_isSaving === false) && _hideOptions();
		},
		__keyDown = Info.macOS ? 
			function(e) {
				return e.metaKey;
			} :
			function (e) {
				return e.ctrlKey;
			},
		_keyDown = function(e) {
			//console.log("editor: " + e.keyCode);
			var keyCode = e.keyCode;
			if (keyCode === 27) {
				e.preventDefault();
				e.stopPropagation();
			}
			if (_overlay) {
				if (keyCode === 27 || keyCode === 57)	// esc o pulsante 9
					_hideOptions();
			} else {
				if (keyCode >= 48 && keyCode <= (48 + _editorMenuActionsLength) && !_isPressedShift) {
					_editorMenuActions[keyCode - 48]();
					return;
				}
				if (__keyDown(e))
					if (keyCode === 90) {
						if (e.shiftKey)
							_redo();
						else
							_undo();
						e.preventDefault();
						return;
					} else if (keyCode === 83) {
						_draft();
						e.preventDefault();
						return;
					} 
				if (e.shiftKey) {
					_isPressedShift = true;
					e.preventDefault();
				}
			}
		},
		_keyUp = function(e) {
			e.preventDefault();
			if (e.keyCode === 16)
				_isPressedShift = false;
		},
		_mousedown = function(e) {
			var x = e.clientX, y = e.clientY;
			_$sizeToolContainer.hide();
			_$grayscaleContainer.hide();
			if (e.button === 0 && !_overlay) {
				_isMouseDown = true;
				if (_toolSelected === 3)
					_updatePickerTool();
				else {
					if (_isPressedShift && _oldX !== -1)
						_line(x, y);
					_checkCoord(x, y);
					_circle(x, y);
					_context.beginPath();
					//con le seguenti due righe si può creare una specie di pennello
					//_context.shadowBlur = 3;
					//_context.shadowColor = _color;
					_context.lineWidth = _size;
					_context.strokeStyle = _color;
					_context.lineJoin = "round";
					_context.lineCap = "round";
					_oldMidX = _mouseX;
					_oldMidY = _mouseY;
					_restored = false;	
				}
			}
			return false;
		},
		_mousemove = function(e) {
			_mouseX = e.clientX;
			_mouseY = e.clientY;
			if (_overlay) return;
			if (_toolSelected === 3)
				_updatePickerTool();
			else if (_isMouseDown) {
				var midX = _oldX + _mouseX >> 1,
					midY = _oldY + _mouseY >> 1;
				_context.beginPath();
				_context.moveTo(midX, midY);
				_context.quadraticCurveTo(_oldX, _oldY, _oldMidX, _oldMidY);
				_context.stroke();
				_oldX = _mouseX;
				_oldY = _mouseY;
				_oldMidX = midX;
				_oldMidY = midY;
				_checkCoord(_mouseX, _mouseY);
				_restored = false;
			}
		},
		_mouseend = function(e) {
			if (!_isMouseDown) return;
			_isMouseDown = false;
			if (_toolSelected === 3) return;
			(_toolSelected === 0) && _getColor();
			_mouseX = e.clientX;
			_mouseY = e.clientY;
			if (_mouseX !== _oldX) {
				var midX = _oldX + _mouseX >> 1,
					midY = _oldY + _mouseY >> 1;
				_context.beginPath();
				_context.moveTo(_oldMidX, _oldMidY);
				_context.quadraticCurveTo(_oldX, _oldY, _mouseX, _mouseY);
				_context.stroke();
			}
			_saveStep();
		},
		_getMouseWheelDelta = function(deltaY) {
			var delta = MATH.round(deltaY / 20, 0);
			if (delta === 0)
				delta = deltaY < 0 ? -1 : 1;
			else if (delta < 0) {
				delta = MATH.min(delta, -1);
				delta = MATH.max(delta, -15);
			} else {
				delta = MATH.max(delta, 1);
				delta = MATH.min(delta, 15);
			}
			return delta;
		},
		_mouseWheel = function(e) {
			if (_isMouseDown || [0, 1, 2].indexOf(_toolSelected) === -1) return;
			var wheelY = Info.firefox ? -e.detail : e.wheelDeltaY;
			if (_toolSelected === 1) { // matita, quindi color picker a scrollbar
				_$grayscaleContainer.show();
				_grayscaleScroll(_getMouseWheelDelta(wheelY));
			} else {	// pennello o gomma, quindi size picker a cerchio
				var size = _toolSelected === 0 ? _brushSize : _eraserSize;
				if ((wheelY > 0 && size < _maxToolSize) || (wheelY < 0 && size > 1))
					_setToolSize(_toolSelected, size + _getMouseWheelDelta(wheelY));
				_$sizeToolContainer.show();
			}
		},
		__grayscaleScroll = function() {
			_grayscaleIsScrolling = false;
		},
		_grayscaleScroll = function(y) {
			if (_grayscaleIsScrolling) return;
			_grayscaleIsScrolling = true;
			if (y < 0)
				_pencilColorID = MATH.min(_pencilColorID + 1, 15);
			else 
				_pencilColorID = MATH.max(_pencilColorID - 1, 0);
			_color = _pencilColor = _grayscaleColors[_pencilColorID];
			_$grayscalePointer.css({
				'top':			_pencilColorID * 20 + 2 + 'px',
				'border-color':	["transparent transparent transparent ", _pencilColor].join('')
			});
			setTimeout(__grayscaleScroll, 100);
		},
		_setToolSize = function(tool, size) {
			// setta un valore per il picker del tool passato -> 0: brush, 2: eraser
			size = MATH.min(size, 200);
			size = MATH.max(size, 1);
			if (tool === 0) {
				_size = _brushSize = size;
			} else if (tool === 2) {
				_size = _eraserSize = size;
			} else return;
			var sizepx = [size, 'px'].join(''),
				size2 = ['-', size / 2, 'px'].join('');
			_$sizeToolLabel.html(sizepx);
			_$sizeToolPreview.css({
				width:				sizepx,
				height:				sizepx,
				'margin-top':		size2,
				'margin-left':		size2,
				'background-color':	(tool === 0 && !_randomColor ? _color : "white")
			});
		},
		_getColor = function() {
			if (_randomColor && _toolSelected === 0) {
				_color = "rgb(" + random(255) + ", " + random(255) + ", " + random(255) + ")";
				_colorPicker.setColor(_color);
			}
			return _color;
		},
		_clear = function() {
			_context.clearRect(0, 0, XX, YY);
			_minX = _minY = _maxX = _maxY = _oldX = _oldY = -1;
			_restored = false;
		},
		_toggleBackground = function() {
			if (_$dom.hasClass("squares")) {
				_$dom.removeClass("squares").addClass("lines");
				$("#optionSquare").html(label['FoglioBianco']);
			} else if (_$dom.hasClass("lines")) {
				_$dom.removeClass("lines");
				$("#optionSquare").html(label['FoglioQuadretti']);
			} else {
				_$dom.addClass("squares");
				$("#optionSquare").html(label['FoglioRighe']);
			}
		},
		_showOptions = function() {
			_overlay = true;
			_$dark.addClass("cursorX");
			_$dark.stop().fadeIn("fast");
			_$options.stop().fadeIn("fast");
			_$pickerToolPreview.fadeOut("fast");
			_$sizeToolContainer.fadeOut("fast");
		},
		_hideOptions = function() {
			_overlay = false;
			_$options.stop().fadeOut("fast");
			_$dark.stop().fadeOut("fast");
			_$sizeToolContainer.fadeOut("fast");
			if (_toolSelected === 3) {
				_$pickerToolColor2.css("background-color", _randomColor ? "white" : _color);
				_$pickerToolPreview.fadeIn("fast");
			}
		},
		_undo = function(e) {
			var step = _step[_currentStep + 1];
			if (step) {
				var _tot = _step.length - _currentStep - 2;
				_currentStep = _currentStep + 1;
				_clear();
				_restoreStep(step);
				if (!_tot)
					_disableElement(_$editorUndo);
				_enableElement(_$editorRedo);
				_restored = false;
			}
		},
		_redo = function() {
			if (_currentStep > 0) {
				_currentStep -= 1;
				var step = _step[_currentStep];
				_clear();
				_restoreStep(step);
				_enableElement(_$editorUndo);
				if (_currentStep <= 0)
					_disableElement(_$editorRedo);
			}
		},
		show = function(x,y) {
			var _tot = _step.length - _currentStep - 1;
			if (!_isInit) 
				_init();
			_$dom.addClass('semiTransparent');
			Dashboard.overshadow();
			_addEvents();
			_$allDomContainer.show();
			_$allDom.fadeIn();
			_colorPicker.show();
			if (!_draft.data)
				_disableElement($("#editorRestore"));
			if (_step.length - _currentStep <= 1)
				_disableElement(_$editorUndo);
			if (_currentStep === 0)
				_disableElement(_$editorRedo);
			(_toolSelected === 0) && _getColor();
		},
		_hide = function() {
			if (_maxX > 0 && _maxY > 0 && !_draft.data)     
				_draft();
			_hideOptions();
			_colorPicker.hide();
			_$allDom.fadeOut(function() {_$allDomContainer.hide()});
			_removeEvents();
			Dashboard.foreground();
		},
		_draft = function() {
			if (_maxX !== -1 || _maxY !== -1) {
				_draft = _saveLayer();
				_enableElement($("#optionRestore"));
			}
		},
		_restore = function() {
			if (_draft.minX && !_restored) {
				_clear();
				_context.putImageData(_draft.data, _draft.minX, _draft.minY);
				_minX = _draft.minX;
				_minY = _draft.minY;
				_maxX = _draft.maxX;
				_maxY = _draft.maxY;
				_oldX = _draft.oldX;
				_oldY = _draft.oldY;
				_saveStep();
				_restored = true;
				//_disableElement($("#optionRestore"));
				//_draft = {};
			}
		},
		onSocketMessage = function(data) {	// OK - qui riceviamo le risposte ai salvataggi
			utils.setSpinner(false);
			_isSaving = false;
			data = JSON.parse(data);
			if (data.ok) {
				var _draw = {
					base64	: _savedDraw.base64,
					x		: _savedDraw.x,
					y		: _savedDraw.y,
					w		: _savedDraw.w,
					h		: _savedDraw.h,
					//pxx	: _savedDraw.pxx,
					//pxy	: _savedDraw.pxy,
					id		: data.id
				};
				Dashboard.addDraw(_draw, true);
				_savedDraw = undefined;
				_clear();
				_step = [];
				_currentStep = 0;
				_saveStep();
				_draft = {};
				_$dom.removeClass('semiTransparent');
				_hide();
			} else {
				Messages.error(label["editorSaveError"]);
			}
		},
		_saveToServer = function(draw) {
			var data = {
				x		: draw.x,
				y		: draw.y,
				w		: draw.w,
				h		: draw.h,
				maxX	: draw.x + draw.w,
				maxY	: draw.y + draw.h,
				base64	: draw.base64
			};
			Socket.emit("editor save", data);
		},
		_save = function() {	// TODO : CREDO OK
			if (_maxX === -1 || _maxY === -1) {
				Messages.alert(label["nothingToSave"]);
			} else {
				if (Messages.confirm(label['editorSaveConfirm'])) {
					_isSaving = true;
					_$dark.removeClass("cursorX");
					utils.setSpinner(true, true);
					_savedDraw = _saveLayer();
					var _coords = Dashboard.getCoords(),
						_tempCanvas = document.createElement("canvas");
					_tempCanvas.width = _savedDraw.data.width;
					_tempCanvas.height = _savedDraw.data.height;
					_tempCanvas.getContext("2d").putImageData(_savedDraw.data, 0, 0);
					_savedDraw.data = undefined;
					delete _savedDraw.oldX;
					delete _savedDraw.oldY;
					_savedDraw.base64 = _tempCanvas.toDataURL("image/png");
					//_savedDraw.pxx = _savedDraw.minX;
					//_savedDraw.pxy = _savedDraw.minY;
					_savedDraw.w = _savedDraw.maxX - _savedDraw.minX;
					_savedDraw.h = _savedDraw.maxY - _savedDraw.minY;
					_savedDraw.x = _savedDraw.minX - XX2 + _coords.x;	// coordinate del px in alto a sx rispetto alle coordinate correnti della lavagna
					_savedDraw.y = _coords.y + (YY2 - _savedDraw.minY);
					_saveToServer(_savedDraw);
				}
			}
		},
		_export = function() {
			if (_maxX === -1 || _maxY === -1)
				Messages.warning(label["NienteDaEsportare"]);
			else {
				var canvas = DOCUMENT.createElement("canvas");
				canvas.width = _maxX - _minX;
				canvas.height = _maxY - _minY;
				canvas.getContext("2d").putImageData(_context.getImageData(_minX, _minY, _maxX, _maxY), 0, 0);
				WINDOW.open(canvas.toDataURL("image/png"), "_blank");
			}
		},
		clear = function(force) {
			if (Messages.confirm("Sei sicuro?")) {
				_clear();
				_step = [];
				_currentStep = 0;
				//_draft = {};
				_saveStep();
				_disableElement($("#editorUndo, #editorRedo"));
				//_$editorUndo.html(_labelAnnulla);
			}
		},
		_onResize = function() {
			_$options.css({
				'top':  (YY > _optionsSizeY ? ((YY - _optionsSizeY) / 3) : 0) + "px", 
				'left': (XX > _optionsSizeX ? ((XX - _optionsSizeX) / 2) : 0) + "px"
			});
		},
		setColor = function(rgb) {
			if (rgb) {
				_brushColor = _color= rgb;
				_randomColor = false;
				_$randomColorButton.removeClass("selected");
			} else {
				_randomColor = true;
				_getColor();
				_brushColor = _color;
			}
			_selectBrush();
		},
		_colorPicker = (function() {	// sottomodulo di editor per gestire il color-picker
			var _$container, _$dom, _context, _dom, _imagePicker = new Image(), _imageSelector = new Image(), _$preview,
			_isMouseDown = false, _lastColors = [], _numOldColors = 10, _$oldColors = [], _$oldColorsDiv, width = 143, height = 90,
			_mouseX, _mouseY, _oldX, _oldY, _color = false, _newColor = true, _moreColors = false,
			init = function() {
				_dom = DOCUMENT.querySelector("#colorPicker");
				_dom.width = width;
				_dom.height = height;
				_context = _dom.getContext("2d");
				_$dom = $("#colorPicker");
				_$container = $("#colorPickerCont");
				_$preview = $("#colorPreview");
				_imagePicker.onload = function() {
					_context.drawImage(_imagePicker, 0, 0, width, height);
					_imagePicker.onload = undefined;
				}
				_imagePicker.src = "img/colors.png";
				_imageSelector.src = "img/selector.png";
				for (var i = 0; i < _numOldColors; i++) 
					_$oldColors[i] = $("#oldColor" + i);
				_$oldColorsDiv = $("#oldColorsCont > div");
			},
			addEvents = function() {
				DOCUMENT.addEventListener('mouseup',	_mouseup,	true);
				_dom.addEventListener('mousedown',		_mousedown,	true);
				_dom.addEventListener('mousemove', 		_mousemove,	true);
				_dom.addEventListener('mouseout', 		_mouseout,	true);
				_$oldColorsDiv.bind("click", _oldColorClick);
			},
			removeEvents = function() {
				DOCUMENT.removeEventListener('mouseup',	_mouseup,	true);
				_dom.removeEventListener('mousedown',	_mousedown,	true);
				_dom.removeEventListener('mousemove', 	_mousemove,	true);
				_dom.removeEventListener('mouseout', 	_mouseout,	true);
				_$oldColorsDiv.unbind("click", _oldColorClick);
			},
			_update = function() {
				var px, __color;
				_context.drawImage(_imagePicker, 0, 0, width, height);
				px = _context.getImageData(_mouseX, _mouseY, 1, 1).data;
				__color = "rgb(" + px[0] + "," + px[1] + "," + px[2] + ")";
				_$preview.css("backgroundColor", __color);
				_context.drawImage(_imageSelector, _oldX - 5, _oldY - 5);
				if (_isMouseDown) {
					_color = __color;
					if (_newColor) {
						_newColor = false;
						_lastColors = [_color].concat(_lastColors);
						var len = _lastColors.length;
						if (len > _numOldColors)
							_lastColors.splice(len - 1, 1);
					}
					_lastColors[0] = _color;
					Editor.setColor(_color);
				}
			},
			_updatePoint = function(e) {
				_mouseX = e.offsetX;
				_mouseY = e.offsetY;
			},
			_updateOldPoint = function() {
				_oldX = _mouseX;
				_oldY = _mouseY;
			},
			_mousedown = function(e) {
				_isMouseDown = true;
				_updatePoint(e);
				_updateOldPoint();
				_update();
			},
			_mousemove = function(e) {
				_updatePoint(e);
				if (_isMouseDown)
					_updateOldPoint();
				_update();
			},
			_mouseup = function() {
				if (_isMouseDown) {
					_isMouseDown = false;
					_updateOldPoint();
					_update();
				}
			},
			_mouseout = function() {
				_$preview.css("backgroundColor", _color ? _color : "#FFF");
			},
			_oldColorClick = function() {
				if (this.id.slice(-1) < _lastColors.length) {
					_oldX = _oldY = -10;
					_color = $(this).css("backgroundColor");
					_context.drawImage(_imagePicker, 0, 0, width, height);
					_$preview.css("backgroundColor", _color);
					Editor.setColor(_color);
				}
			},
			show = function() {
				_$container.fadeIn();
				if (!_newColor) {
					_newColor = true;
					for (var i = 0, len = _lastColors.length; i < len; i++)
						_$oldColors[i].css("backgroundColor", _lastColors[i]);
				}
			},
			hide = function() {
				_$container.fadeOut();
			},
			setColor = function(color) {
				_color = color;
				_context.drawImage(_imagePicker, 0, 0, width, height);
				_$preview.css("backgroundColor", color);
				_oldX = _oldY = -10;
			},
			getColor = function() {
				return _color;
			};
			// auto-init del sottomodulo _colorPicker
			_mouseX = _mouseY = 0;
			_oldX = _oldY = -10;
			return {
				init:			init,
				show: 			show,
				hide:			hide,
				addEvents:		addEvents,
				removeEvents:	removeEvents,
				setColor:		setColor,
				getColor:		getColor
			}
		})();
		
		// auto-init del modulo Editor
		_minX = _minY = _maxX = _maxY = _oldX = _oldY = -1;
		_isInit = _isMouseDown = _isPressedShift = false;
		return {
			show			: show,
			setColor		: setColor,
			onSocketMessage	: onSocketMessage /*,
			hide	: hide,
			save	: function(data) { return utils.CK(save,	"Error: editor cannot save. ",	data) },
			*/
		} 
	})(),
	
	Overlay = (function() {
		// rappresenta l'elemento che finisce sopra la lavagna per mostrare le ricerche, utenti, pagine ecc.
		// gli altri moduli lo possono richiamare e riempire
		var _dom = DOCUMENT.querySelector("#overlay"),
		_isVisible = false,
		_html = "",
		_appear = function(html) {
			// fa comparire l'overlay già al centro con effetto fade
			_isVisible = true;
			_html = html;
			return true;
		},
		_reappear = function() {
			if (_html > "") {
				// fa comparire l'overlay dal basso per mostrare quello che già conteneva in _html
				_isVisible = true;
				return true;
			} else
				return false;
		},
		show = function(html) {
			if (html)
				return _appear(html);	// se voglio visualizzare qualcosa di nuovo, basta passare l'html e quello già presente viene ignorato
			else if (_html > "")
				return _reappear(); 	// se lo richiamo semplicemente con .show() provo a rimostrare quello di prima
			else
				return false;			// se non ho passato niente, e non avevo niente, non faccio niente. per aprire pagina news base si farà App.News.show();
		},
		hide = function() {
			// fa scomparire verso il basso senza svuotare contenuto
			_isVisible = false;
		},
		close = function() {
			// se si preme sulla X in alto dx, fa scomparire con effetto fade, poi viene svuotato.
			_html = "";
			_isVisible = false;
		};
		return {
			show	: show,
			hide	: hide,
			close	: close
		}
	})(),
	
	News = (function() {
		// modulo che renderizza la pagina a quadrettoni delle news / risultati ricerca per tag, data, paese, classifica
		var _template = "",
		_render = function(params, VisEffettoFigo) {
			// riempie _template coi parametri
			// se VisEffettoFigo è true si aggiunge il js per muovere i quadrettoni con effetto comparsa da dx
			var result = _template;
			return result;
		},
		show = function(query) {
			var params = {			// deve contenere l'identificativo di connessione, e tutto il necessario
				query	: query	// se query è vuota, il lato server restituirà la pagina default con nuove news
			};
			var result = utils.getRemoteData(Config.services.news, params);
			if (utils.isEmpty(result))
				Messages.error(label["ConnectionError"]);
			else {
				var html = _render(result, utils.isEmpty(query));
				Overlay.show(html);
			}
		};
		return {
			show	: show
		}
	})(),
	
	UserPage = (function() {
		// elemento che renderizza le pagine degli utenti
		var _render = function(params) {
			// contiene template html e lo riempie coi parametri
			var template = "bla bla bla ";
			return template;
		},
		show = function(idUser) {
			var params = {			// deve contenere l'identificativo di connessione, e tutto il necessario
				idUser	: idUser
			};
			var result = utils.getRemoteData(Config.services.news, params);
			if (utils.isEmpty(result))
				Messages.error(label["ConnectionError"]);
			else {
				var html = _render(result);
				Overlay.show(html);
			}
		};
		return {
			show	: show
		}
	})();	
	
	CurrentUser = (function() {
		// dati di sessione e utente, pagina modifica dati utente, ecc
	})(),
	
	Messages = (function() {
		// overlay per i messaggi agli utenti: caricamento, errore, salvataggio ecc
		var _dom = DOCUMENT.querySelector("#messages"),
		_template = "",
		_btnTemplate,
		_render = function(image, msg, buttons) {
			// inserisce le variabili dentro ai template
			var result = "";
			return result;
		},
		_show = function(html) {
			// oscura lo sfondo e fa comparire l'elemento dom
			_dom.innerHTML(html);
			return true;
		},
		error = function(msg) {
			var image = '<img src="" class="">';		// logo di errore
			var buttons = { 'OK': Messages._close };
			//_show(_render(image, msg, buttons));
		},
		loading = function(msg) {
			//_show(_render(image, msg, buttons));
		},
		remove = function() {
			// rimuove il messages, usato per far terminare il loading 
		},
		info = function(msg) {
			var image = '<img src="" class="">';		// logo info
			var buttons = { 'Annulla': Messages._close };
			//_show(_render(image, msg, buttons));
		},
		_close = function() {
			// fa scomparire l'elemento e toglie overlay scuro
			return true;
		}, 
		warning = function(msg) {
			// pensata come piccolo messaggio in un angolo dello schermo che scompare da solo e non richiede interazione
			WINDOW.alert(msg);
		},
		confirm = function(msg) {
			// in realtà creeremo una finestra ad hoc gestita con show, close, hide
			return WINDOW.confirm(msg);
		},
		alert = function(msg) {
			WINDOW.alert(msg);
		},
		custom = function(msg, buttons) {
		
		};
		return {
			error	: error,
			loading	: loading,
			info	: info,
			confirm	: confirm,
			alert	: alert,
			custom	: custom,
			warning	: warning,
			remove	: remove
		}
	})(),
	
	Init = function() {
		// qui ci sarà il driver lato client che legge l'url corrente e si inizializza e crea la pagina di conseguenza
		var _onResize = function() {
			XX = WINDOW.innerWidth;
			YY = WINDOW.innerHeight;
			XX2 = XX / 2;
			YY2 = YY / 2;
			DXX = 2 * XX;
			DYY = 2 * YY;
		};
		_onResize();
		_$dark = $('#darkOverlay');
		_$spinner = $('#spinner');
		_mouseWheelEvent = Info.firefox ? "DOMMouseScroll" : "mousewheel";
		WINDOW.addEventListener("resize", _onResize, true);
		DOCUMENT.body.addEventListener("mousedown", preventDefault, true);
		DOCUMENT.body.addEventListener("mousemove", preventDefault, true);
		DOCUMENT.body.addEventListener("mouseup", 	 preventDefault, true);
		DOCUMENT.body.addEventListener("mouseout",  preventDefault, true);
		var requestUrl = DOCUMENT.location.href;
		Socket.init();
		if (true) {	// url corrente corrispondente ad home
			Dashboard.init();
		}
	};
	
	return {	// moduli pubblici di App
		Init		: Init,
		Config		: Config,
		Info		: Info,
		Socket		: Socket,
		Worker		: Worker,
		Dashboard	: Dashboard,
		Editor		: Editor,
		Messages	: Messages,
		Overlay		: Overlay,
		News		: News,
		UserPage	: UserPage,
		CurrentUser	: CurrentUser
	};
})();
