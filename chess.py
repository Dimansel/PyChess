import copy

DIRS = [[1, [[0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1]]],
        [0, [[0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1]]],
        [0, [[0, -1], [-1, 0], [0, 1], [1, 0]]],
        [0, [[-1, -1], [-1, 1], [1, 1], [1, -1]]],
        [1, [[-2, -1], [-2, 1], [2, -1], [2, 1], [1, 2], [-1, 2], [1, -2], [-1, -2]]]]

class Cell:
    def __init__(self):
        self.figure = -1
        self.w = None
        self.checked = False

class Board:
    def __init__(self):
        self.grid = [[Cell() for i in range(8)] for j in range(8)]
        self.start_game()

    def set_figure(self, i, cx, cy, w):
        self.grid[cy][cx].figure = i
        self.grid[cy][cx].w = w

    def set_big_figures(self, cy, w):
        self.set_figure(2, 0, cy, w)
        self.set_figure(4, 1, cy, w)
        self.set_figure(3, 2, cy, w)
        self.set_figure(1, 3, cy, w)
        self.set_figure(0, 4, cy, w)
        self.set_figure(3, 5, cy, w)
        self.set_figure(4, 6, cy, w)
        self.set_figure(2, 7, cy, w)
    
    def start_game(self):
        self.set_big_figures(0, False)
        self.set_big_figures(7, True)
        for i in range(8):
            self.set_figure(5, i, 1, False)
            self.set_figure(5, i, 6, True)
        for i in range(8):
            for j in range(2, 6):
                self.set_figure(-1, i, j, None)

    def move_figure(self, cx0, cy0, cx1, cy1):
        cell0 = self.grid[cy0][cx0]
        self.set_figure(cell0.figure, cx1, cy1, cell0.w)
        self.set_figure(-1, cx0, cy0, None)
        king1 = self.is_under_attack(self.grid, True)
        king2 = self.is_under_attack(self.grid, False)
        ck1 = self.get_king_pos(self.grid, True)
        ck2 = self.get_king_pos(self.grid, False)
        ck1 = self.grid[ck1[1]][ck1[0]]
        ck2 = self.grid[ck2[1]][ck2[0]]
        nomoves1 = self.is_no_moves(True)
        nomoves2 = self.is_no_moves(False)
        if not king1:
            ck1.checked = False
        if not king2:
            ck2.checked = False
        if king1:
            ck1.checked = True
            if nomoves1:
                return ("checkmate", True) + king1
            return ("check", True) + king1
        elif king2:
            ck2.checked = True
            if nomoves2:
                return ("checkmate", False) + king2
            return ("check", False) + king2
        elif nomoves1 or nomoves2:
            return ("stalemate",)

    def is_no_moves(self, w):
        for i in range(8):
            for j in range(8):
                cell = self.grid[i][j]
                if cell.w == w:
                    paths = self.get_paths(self.grid, j, i)
                    if len(paths) > 1:
                        return False
        return True

    def get_king_pos(self, grid, w):
        for a in range(8):
            for b in range(8):
                cell = grid[b][a]
                if cell.figure == 0 and cell.w == w:
                        return (a, b)

    def is_under_attack(self, grid, w):
        my_king = self.get_king_pos(grid, w)
        for a in range(8):
            for b in range(8):
                cell = grid[b][a]
                if cell.w != w:
                    if my_king in self.get_paths(grid, a, b, True):
                        return my_king
        return False

    def append_to(self, cells, cx0, cy0, cx1, cy1, w, rec):
        if rec:
            cells.append((cx1, cy1))
        else:
            ngrid = copy.deepcopy(self.grid)
            cell1 = ngrid[cy1][cx1]
            cell0 = ngrid[cy0][cx0]
            cell1.figure = cell0.figure
            cell1.w = cell0.w
            cell0.figure = -1
            if not self.is_under_attack(ngrid, w):
                cells.append((cx1, cy1))

    def get_paths(self, grid, cx, cy, rec = False):
        cell = grid[cy][cx]
        i = cell.figure
        w = cell.w
        if i == -1:
            return []
        cells = [(cx, cy)]
        if i == 5:
            dy1 = -1 if cell.w else 1
            if cy+dy1 >= 0 and cy+dy1 < 8:
                if grid[cy+dy1][cx].figure == -1:
                    self.append_to(cells, cx, cy, cx, cy+dy1, w, rec)
                    if ((cell.w and cy == 6) or (not cell.w and cy == 1)) and grid[cy+dy1*2][cx].figure == -1:
                        self.append_to(cells, cx, cy, cx, cy+dy1*2, w, rec)
                if cx+1 < 8:
                    d = grid[cy+dy1][cx+1]
                    if d.figure != -1 and d.w != w:
                        self.append_to(cells, cx, cy, cx+1, cy+dy1, w, rec)
                if cx-1 >= 0:
                    d = grid[cy+dy1][cx-1]
                    if d.figure != -1 and d.w != w:
                        self.append_to(cells, cx, cy, cx-1, cy+dy1, w, rec)
        else:
            strict = DIRS[i][0]
            direcions = DIRS[i][1]
            if strict:
                for d in direcions:
                    if cx+d[0] >= 0 and cx+d[0] < 8 and cy+d[1] >= 0 and cy+d[1] < 8:
                        c = grid[cy+d[1]][cx+d[0]]
                        if c.figure != -1 and c.w == w:
                            continue
                        self.append_to(cells, cx, cy, cx+d[0], cy+d[1], w, rec)
            else:
                for vec in direcions:
                    m = 1
                    while True:
                        d = [vec[0]*m, vec[1]*m]
                        if cx+d[0] >= 0 and cx+d[0] < 8 and cy+d[1] >= 0 and cy+d[1] < 8:
                            c = grid[cy+d[1]][cx+d[0]]
                            if c.figure != -1:
                                if c.w != w:
                                    self.append_to(cells, cx, cy, cx+d[0], cy+d[1], w, rec)
                                break
                            self.append_to(cells, cx, cy, cx+d[0], cy+d[1], w, rec)
                        else:
                            break
                        m += 1
        return cells

    def is_move_valid(self, f, t, w):
        if self.grid[f[1]][f[0]].w != w or f == t:
            return False
        paths = self.get_paths(self.grid, f[0], f[1])
        if (t[0], t[1]) not in paths:
            return False
        return True

    def pre_serialize(self):
        sl = []
        for row in self.grid:
            sl.append([])
            for cell in row:
                sl[-1].append([cell.figure, cell.w, cell.checked])
        return sl

    def print(self):
        for i in range(8):
            for j in range(8):
                val = self.grid[i][j].figure
                if val == -1:
                    print("_", end='')
                else:
                    print(val, end='')
            print()
