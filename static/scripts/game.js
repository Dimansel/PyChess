var sid; //game session id
var ws; //web socket
var gc; //grid canvas
var activeCell = null;
var affected = [];
var checked;
var last_move;
var rows = 10;
var w; //are you white or black?
var turn; //true - your turn, false - opponent's turn
var started = false;
var loaded_history;
var history_index;

function adjustDivSizes(cs) {
	var draw_offer = document.getElementById("draw_offer");
	draw_offer.style.width = cs*8 + "px";
	var fs = 5*cs/12 + "px";
	draw_offer.style['font-size'] = fs;
	var btns = document.getElementsByClassName("draw_btn");
	for (btn of btns)
		btn.style['font-size'] = fs;
}

function makeInactive() {
	for (c of affected) {
		c.makeInactive();
	}
	affected = [];
	activeCell = null;
}

function onCellClick(cx, cy, gc) {
	var cell = gc.getCell(cx, cy);
	if (activeCell == cell) makeInactive();
	else if (cell.figure != null && cell.figure.w == w) {
		makeInactive();
		activeCell = cell;
		var msg = {action: "get_paths", cx: cx, cy: cy};
		ws.send(JSON.stringify(msg));
	}
	else if (affected.indexOf(cell) >= 0 && turn) {
		if (sid != null) {
			var msg = {action: "make_move", from: [activeCell.cx-1, activeCell.cy-1], to: [cx, cy]};
			ws.send(JSON.stringify(msg));
		}
	}
}

function getCellSize() {
	var body = document.body;
	var html = document.documentElement;
	var width = Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth);
	return Math.trunc(0.45*width/rows);
}

window.onresize = function() {
	var cellSize = getCellSize();
	adjustDivSizes(cellSize);
	gc.canvas.width = cellSize*rows;
	gc.canvas.height = cellSize*rows;
	gc.resize(cellSize);
}

function initCanvas() {
	var cellSize = getCellSize();
	adjustDivSizes(cellSize);
	var canvas = document.getElementById("grid");
	canvas.width = cellSize*rows;
	canvas.height = cellSize*rows;
	
	gc = new GridCanvas(canvas, rows, rows, cellSize, onCellClick);
	canvas.onclick = function(e) {
		gc.onclick(e);
	}
	gc.bg = "#996633";
	gc.even_bg = "#CC9966";
	gc.drawGrid();
}

function startGame() {
	started = true;
	gc.setBigFigures(0, false);
	gc.setBigFigures(7, true);
	for (var i = 0; i < 8; i++) {
		gc.setFigure(5, false, i, 1);
		gc.setFigure(5, true, i, 6);
	}
	for (var i = 0; i < 8; i++) {
		for (var j = 2; j < 6; j++) {
			gc.getCell(i, j).removeFigure();
		}
	}
}

function setName(id, name) {
	var field = document.getElementById(id);
	field.textContent = name;
}

function setLeftPanelContent(status) {
	var lside_0 = document.getElementById("lside_0");
	var lside_1 = document.getElementById("lside_1");
	var offer_draw = document.getElementById("offer_draw");
	if (status == 1) {
		lside_0.style.display = "none";
		lside_2.style.display = "none";
		lside_1.style.display = "";
		offer_draw.style.display = "";
		var gsid = document.getElementById("gsid");
		gsid.textContent = sid;
		setName("oname", "");
		setName("uname", document.getElementById("name").value);
	} else if (status == 0) {
		lside_0.style.display = "";
		lside_2.style.display = "none";
		lside_1.style.display = "none";
		offer_draw.style.display = "none";
	} else if (status == 2) {
		lside_0.style.display = "none";
		lside_2.style.display = "";
		lside_1.style.display = "none";
	}
}

function setStatus(type, text, color, weight = "") {
	var status = document.getElementById(type + "_status");
	status.textContent = text;
	status.style.color = color;
	status.style.fontWeight = weight;
}

function remLastMove() {
	if (last_move != null) {
		last_move[0].toggleLastMove(false);
		last_move[1].toggleLastMove(false);
		sessionStorage.removeItem("lm_from");
		sessionStorage.removeItem("lm_to");
	}
}

function setLastMove(from, to) {
	remLastMove();
	from.toggleLastMove(true);
	to.toggleLastMove(true);
	last_move = [from, to];
	sessionStorage.setItem("lm_from", [from.cx, from.cy]);
	sessionStorage.setItem("lm_to", [to.cx, to.cy]);
}

function reset() {
	started = false;
	setLeftPanelContent(0);
	setStatus("game", "Inactive...", "#FF0000");
	document.getElementById("sid_in").value = "";
	gc.clearBoard();
	makeInactive();
}

function checkSessionStorage() {
	sid = sessionStorage.getItem("sid");
	uname = sessionStorage.getItem("uname");
	if (sid != null && name != null) {
		var msg = {action: "conn_to", name: uname, sid: sid};
		ws.send(JSON.stringify(msg));
	}
}

function setTurn(t) {
	turn = t;
	span = document.getElementById("turn");
	span.textContent = t ? "your" : "opponent's";
	span.style.color = t ? "#006F00" : "#F00";
}

function fade(element) {
    var op = 1;  // initial opacity
    var timer = setInterval(function () {
        if (op <= 0.1){
            clearInterval(timer);
            element.style.display = 'none';
        }
        element.style.opacity = op;
        element.style.filter = 'alpha(opacity=' + op * 100 + ")";
        op -= op * 0.1;
    }, 50);
}

function unfade(element) {
    var op = 0.1;  // initial opacity
    element.style.display = 'block';
    var timer = setInterval(function () {
        if (op >= 1){
            clearInterval(timer);
        }
        element.style.opacity = op;
        element.style.filter = 'alpha(opacity=' + op * 100 + ")";
        op += op * 0.1;
    }, 10);
}

function onConnect() {
	console.log("Connected!");
	setStatus("conn", "Connected to the server!", "#006F00");

	document.getElementById("connect_rnd").onclick = function() {
		var uname = document.getElementById("name").value;
		var msg = {action: "conn_rnd", name: uname};
		ws.send(JSON.stringify(msg));
	}

	document.getElementById("wait").onclick = function() {
		var uname = document.getElementById("name").value;
		var msg = {action: "wait_for", name: uname};
		ws.send(JSON.stringify(msg));
	}

	document.getElementById("conn_to").onclick = function() {
		var sid_in = document.getElementById("sid_in").value;
		var uname = document.getElementById("name").value;
		var msg = {action: "conn_to", name: uname, sid: sid_in};
		ws.send(JSON.stringify(msg));
	}

	document.getElementById("conn_past").onclick = function() {
		var sid_in = document.getElementById("sid_in").value;
		var msg = {action: "load_past_game", sid: sid_in};
		ws.send(JSON.stringify(msg));
	}

	document.getElementById("quit").onclick = function() {
		var msg = {action: "quit"};
		ws.send(JSON.stringify(msg));
		reset();
		sessionStorage.removeItem("sid");
		sessionStorage.removeItem("uname");
	}

	document.getElementById("quit_h").onclick = function() {
		reset();
		loaded_history = null;
		document.getElementById("moves_count").textContent = 0;
		document.getElementById("move_index").textContent = 0;
	}

	document.getElementById("prev").onclick = function() {
		if (loaded_history != null && history_index > 0) {
			var from = loaded_history[history_index-1][0];
			var to = loaded_history[history_index-1][1];
			
			if (checked != null) {
				checked.toggleCheck(false);
				checked = null;
			}
			gc.moveFigure(to[0], to[1], from[0], from[1]);

			var killed = loaded_history[history_index-1][3];
			if (killed != null) {
				gc.setFigure(killed[0], killed[1], to[0], to[1]);
			}

			history_index -= 1;
			if (history_index == 0)
				remLastMove();
			else {
				var from_ = loaded_history[history_index-1][0];
				var to_ = loaded_history[history_index-1][1];
				setLastMove(gc.getCell(from_[0], from_[1]), gc.getCell(to_[0], to_[1]));

				var check = loaded_history[history_index-1][2];
				if (check != null) {
					var cell = gc.getCell(check[0], check[1]);
					cell.toggleCheck(true);
					checked = cell;
				}
			}
			document.getElementById("move_index").textContent = history_index;
		}
	}

	document.getElementById("next").onclick = function() {
		if (loaded_history != null && history_index < loaded_history.length) {
			var from = loaded_history[history_index][0];
			var to = loaded_history[history_index][1];
			var check = loaded_history[history_index][2];
			if (checked != null) {
				checked.toggleCheck(false);
				checked = null;
			}
			if (check != null) {
				var cell = gc.getCell(check[0], check[1]);
				cell.toggleCheck(true);
				checked = cell;
			}
			gc.moveFigure(from[0], from[1], to[0], to[1]);
			history_index += 1;
			setLastMove(gc.getCell(from[0], from[1]), gc.getCell(to[0], to[1]));
			document.getElementById("move_index").textContent = history_index;
		}
	}

	document.getElementById("offer_draw").onclick = function() {
		var msg = {action: "offer_draw"};
		ws.send(JSON.stringify(msg));
	}

	document.getElementById("accept_draw").onclick = function() {
		var msg = {action: "offer_response", status: "accept"};
		ws.send(JSON.stringify(msg));
	}

	document.getElementById("deny_draw").onclick = function() {
		var msg = {action: "offer_response", status: "deny"};
		ws.send(JSON.stringify(msg));
	}

	checkSessionStorage();
}

function onMessage(ev) {
	var response = JSON.parse(ev.data);
	if (response.action == "disconnect") {
		setStatus("game", "Your opponent has disconnected. Waiting for reconnection...", "#CF0");
	} else if (response.action == "quit") {
		setStatus("game", "Your opponent has left the game. You win!", "#006F00", "bold");
	} else if (response.action == "conn_rnd") {
		if (response.status == "connected") {
			sid = response.sid;
			sessionStorage.setItem("sid", sid);
			sessionStorage.setItem("uname", document.getElementById("name").value);
			setLeftPanelContent(1);
			started = true;
			gc.post_deserialize(response.board);
			w = response.w;
			setTurn(response.turn);
			setName("oname", response.name);
			setStatus("game", "Ingame", "#006F00");
		} else if (response.status == "wait") {
			sid = response.sid;
			sessionStorage.setItem("sid", sid);
			sessionStorage.setItem("uname", document.getElementById("name").value);
			setLeftPanelContent(1);
			w = true;
			setTurn(true);
			setStatus("game", "Waiting for opponent...", "#CF0");
		} else if (response.status == "inv_uname") {
			alert("Your name contains invalid characters!");
		}
	} else if (response.action == "wait_for") {
		if (response.status == "ok") {
			sid = response.sid;
			sessionStorage.setItem("sid", sid);
			sessionStorage.setItem("uname", document.getElementById("name").value);
			setLeftPanelContent(1);
			w = true;
			setTurn(true);
			setStatus("game", "Waiting for opponent...", "#CF0");
		} else if (response.status == "inv_uname") {
			alert("Your name contains invalid characters!");
		}
	} else if (response.action == "conn_to") {
		if (response.status == "ok") {
			sid = response.sid;
			sessionStorage.setItem("sid", sid);
			if (sessionStorage.getItem("uname") == null)
				sessionStorage.setItem("uname", document.getElementById("name").value);
			else
				document.getElementById("name").value = sessionStorage.getItem("uname");
			setLeftPanelContent(1);
			started = true;
			var chk = gc.post_deserialize(response.board);
			w = response.w;
			setTurn(response.turn);
			checked = chk;
			setName("oname", response.name);
			setStatus("game", "Ingame", "#006F00");
			from = sessionStorage.getItem("lm_from");
			to = sessionStorage.getItem("lm_to");
			if (from != null && to != null) {
				from = from.split(",").map(function(n) {return parseInt(n)-1});
				to = to.split(",").map(function(n) {return parseInt(n)-1});
				from = gc.getCell(from[0], from[1]);
				to = gc.getCell(to[0], to[1]);
				setLastMove(from, to);
			}
		} else if (sessionStorage.getItem("sid") != null) {
			sessionStorage.removeItem("sid");
			sessionStorage.removeItem("uname");
			remLastMove();
		} else if (response.status == "inv_uname") {
			alert("Your name contains invalid characters!");
		} else if (response.status == "not_found") {
			alert("Game with given session ID not found...");
		} else if (response.status == "busy") {
			alert("This game is busy...");
		}
	} else if (response.action == "peer_conn") {
		if (!started) startGame();
		setName("oname", response.name);
		setStatus("game", "Ingame", "#006F00");
	} else if (response.action == "get_paths") {
		var paths = response.paths;
		for (path of paths) {
			var c = gc.getCell(path[0], path[1]);
			c.makeActive("#520FFF");
			affected.push(c);
		}
	} else if (response.action == "make_move") {
		var cx0 = response.from[0];
		var cy0 = response.from[1];
		var cx1 = response.to[0];
		var cy1 = response.to[1];
		var cell0 = gc.getCell(cx0, cy0);
		var cell1 = gc.getCell(cx1, cy1);
		setLastMove(cell0, cell1);
		if (cell1 == activeCell) makeInactive();
		if (cell0.figure.w == w) {
			setTurn(false);
			makeInactive();
		} else setTurn(true);
		gc.moveFigure(cx0, cy0, cx1, cy1);
		if (response.status == "stalemate") {
			setStatus("game", "Stalemate", "#FF0", "bold");
			makeInactive();
		} else if (response.status == "check" || response.status == "checkmate") {
			var victim = response.victim;
			var cell = gc.getCell(victim[0], victim[1]);
			cell.toggleCheck(true);
			checked = cell;
			if (response.winner != null) {
				if (response.winner == w) {
					setStatus("game", "You win!", "#006F00", "bold");
					makeInactive();
				} else if (response.winner != w) {
					setStatus("game", "You lose!", "#F00", "bold");
					makeInactive();
				}
			}
		} else if (checked != null) {
			checked.toggleCheck(false);
			checked = null;
		}
	} else if (response.action == "offer_draw") {
		document.getElementById("draw_offer").style.display = "";
	} else if (response.action == "offer_sent") {
		var offer_notification = document.getElementById("offer_notification");
		offer_notification.textContent = "Waiting for opponent's response";
		offer_notification.style.display = "";
		offer_notification.style.color = "#000";
		offer_notification.style.opacity = '100';
	} else if (response.action == "offer_response") {
		if (response.status == "deny") {
			var offer_notification = document.getElementById("offer_notification");
			offer_notification.textContent = "Your opponent has denied your offer";
			offer_notification.style.display = "";
			offer_notification.style.color = "#F00";
			offer_notification.style.opacity = '100';
			setTimeout(function() {fade(offer_notification)}, 3000);
		} else if (response.status == "accept") {
			var offer_notification = document.getElementById("offer_notification");
			offer_notification.textContent = "Your opponent has accepted your offer";
			offer_notification.style.display = "";
			offer_notification.style.color = "#006F00";
			offer_notification.style.opacity = '100';
			setTimeout(function() {fade(offer_notification)}, 3000);
			setStatus("game", "Draw", "#FF0", "bold");
		}
	} else if (response.action == "offer_received") {
		if (response.status == "accept")
			setStatus("game", "Draw", "#FF0", "bold");
		document.getElementById("draw_offer").style.display = "none";
	} else if (response.action == "load_past_game") {
		if (response.status == "ok") {
			setLeftPanelContent(2);
			setStatus("game", "This is the past game", "#000", "bold");
			document.getElementById("wsid").textContent = document.getElementById("sid_in").value;
			document.getElementById("moves_count").textContent = response.moves.length;
			loaded_history = response.moves;
			history_index = 0;
			startGame();
		} else if (response.status == "failed") {
			alert("Game with given session ID not found...");
		}
	}
}

function onDisconnect(ev) {
	reset();
	console.log("Disconnected...");
	console.log(ev);
	setStatus("conn", "Disconnected from the server...", "#FF0000");
	setStatus("game", "Inactive...", "#FF0000");
}

function onError(ev) {
	reset();
	console.log(ev);
	setStatus("conn", "Can't connect to the server...", "#FF0000");
	setStatus("game", "Inactive...", "#FF0000");
}

window.onload = function() {
	initCanvas();
	var host = window.location.host;
	ws = new WebSocket('ws://' + host + '/ws');

	ws.onopen = onConnect;
	ws.onmessage = onMessage;
	ws.onclose = onDisconnect;
	ws.onerror = onError;
}
