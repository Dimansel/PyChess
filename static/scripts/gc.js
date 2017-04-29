var CHESS = ["α", "β", "γ", "δ", "ε", "ζ"];
var LETTERS = ["σ", "τ", "υ", "φ", "χ", "ψ", "ω", "ϊ"];
var DIGITS = ["λ", "μ", "ν", "ξ", "ο", "π", "ρ", "ς"];

function getFont(size) {
	return 1.5+Math.round(size) + "px gloria hallelujah cases";
}

function Figure(t, w) {
	this.t = t;
	this.w = w;
	this.c = w ? "#FFF" : "#000";
}

function Cell(ctx, cx, cy, x, y, size, bg) {
	this.ctx = ctx;
	this.cx = cx;
	this.cy = cy;
	this.x = x;
	this.y = y;
	this.size = size;
	this.bg = bg;
	this.lm_bg = "#508F00";
	this.check_bg = "#FF4800";
	this.check = false;
	this.figure = null;
	this.active = false;
	this.norect = false;
	this.last_move = false;
	this.border;

	this.draw = function() {
		if (!this.norect) {
			this.ctx.fillStyle = this.check ? this.check_bg : this.last_move ? this.lm_bg : this.bg;
			this.ctx.fillRect(this.x, this.y, this.size, this.size);
		}
		if (this.active) {
			this.ctx.lineWidth = "2";
			this.ctx.strokeStyle = this.active_color;
			this.ctx.strokeRect(this.x+2, this.y+2, this.size-4, this.size-4);
		}
		if (this.figure != null) {
			this.ctx.textBaseline = "alphabetic";
			var fw = this.ctx.measureText(this.figure.t).width;
			this.ctx.fillStyle = this.figure.c;
			this.ctx.fillText(this.figure.t, this.x + (this.size-fw)/2, this.y + this.size);
		}
		if (this.norect) {
			this.ctx.textBaseline = "alphabetic";
			var fw = this.ctx.measureText(this.border).width;
			this.ctx.fillStyle = "#000";
			this.ctx.fillText(this.border, this.x + (this.size-fw)/2, this.y + this.size);
		}
	}

	this.setFigure = function(f) {
		this.figure = f;
		this.draw();
	}

	this.removeFigure = function() {
		this.setFigure(null);
	}

	this.makeActive = function(clr) {
		this.active = true;
		this.active_color = clr;
		this.draw();
	}

	this.makeInactive = function () {
		this.active = false;
		this.draw();
	}

	this.toggleCheck = function (v) {
		this.check = v;
		this.draw();
	}

	this.toggleLastMove = function(v) {
		this.last_move = v;
		this.draw();
	}
}

function GridCanvas(canvas, rows, cols, cellSize, handler) {
	this.canvas = canvas;
	this.ctx = canvas.getContext("2d");
	this.rows = rows;
	this.cols = cols;
	this.cellSize = cellSize;
	this.handler = handler;
	this.grid = [];
	this.bg = "#FFF";
	this.even_bg = "#FFF";
	this.ctx.font = getFont(this.cellSize);

	this.drawGrid = function() {
		for (var i = 0; i < this.rows; i++) {
			this.grid.push([]);
			for (var j = 0; j < this.cols; j++) {
				var color = (i+j)%2 == 0 ? this.even_bg : this.bg;
				var cell = new Cell(this.ctx, j, i, j*this.cellSize, i*this.cellSize, this.cellSize, color);
				if (i == 0 || i == 9 || j == 0 || j == 9) {
					cell.norect = true;
					if (i == 0) {
						if (j == 0) cell.border = 'η';
						else if (j == 9) cell.border = 'ι';
						else cell.border = 'θ';

					} else if (j == 9) {
						if (i == 9) cell.border = 'ό';
						else cell.border = 'κ';
					} else if (i == 9) {
						if (j == 0) cell.border = 'ϋ';
						else cell.border = LETTERS[j-1];
					} else cell.border = DIGITS[8-i];
				}
				cell.draw();
				this.grid[i].push(cell);
			}
		}
	}

	this.onclick = function (event) {
    	var rect = this.canvas.getBoundingClientRect();
    	var x = event.clientX - rect.left - 2;
    	var y = event.clientY - rect.top - 2;
    	var cx = Math.trunc(x/this.cellSize)-1;
    	var cy = Math.trunc(y/this.cellSize)-1;
    	if (cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows)
    		this.handler(cx, cy, this);
	}

	this.resize = function(size) {
		this.cellSize = size;
		this.ctx.font = getFont(size);
		for (var i = 0; i < this.rows; i++) {
			for (var j = 0; j < this.cols; j++) {
				var cell = this.grid[i][j];
				cell.x = j*size;
				cell.y = i*size;
				cell.size = size;
				cell.draw();
			}
		}
	}

	this.getCell = function(cx, cy) {
		var c = this.grid[cy+1][cx+1];
		return c;
	}

	this.getKings = function() {
		var kings = [];
		for (var i = 1; i <= 8; i++) {
			for (var j = 1; j <= 8; j++) {
				var cell = this.grid[i][j];
				if (cell.figure != null && cell.figure.t == CHESS[0])
					kings.push(cell);
			}
		}
		return kings;
	}

	this.setFigure = function(i, w, cx, cy) {
		var cell = this.grid[cy+1][cx+1];
		cell.setFigure(new Figure(CHESS[i], w));
	}

	this.moveFigure = function(cx0, cy0, cx1, cy1) {
		var cell0 = this.grid[cy0+1][cx0+1];
		this.grid[cy1+1][cx1+1].setFigure(cell0.figure);
		cell0.removeFigure();
	}

	this.setBigFigures = function(cy, w) {
		this.setFigure(2, w, 0, cy);
		this.setFigure(4, w, 1, cy);
		this.setFigure(3, w, 2, cy);
		this.setFigure(1, w, 3, cy);
		this.setFigure(0, w, 4, cy);
		this.setFigure(3, w, 5, cy);
		this.setFigure(4, w, 6, cy);
		this.setFigure(2, w, 7, cy);
	}

	this.clearBoard = function() {
		for (var i = 1; i <= 8; i++) {
			for (var j = 1; j <= 8; j++) {
				this.grid[i][j].check = false;
				this.grid[i][j].last_move = false;
				this.grid[i][j].removeFigure();
			}
		}
	}

	this.post_deserialize = function(board) {
		var chk;
		for (var i = 1; i <= 8; i++) {
			for (var j = 1; j <= 8; j++) {
				var c = board[i-1][j-1];
				if (c[0] == -1) continue;
				this.grid[i][j].check = c[2];
				if (c[2]) chk = this.grid[i][j];
				this.grid[i][j].setFigure(new Figure(CHESS[c[0]], c[1]));
			}
		}
		return chk;
	}
}
