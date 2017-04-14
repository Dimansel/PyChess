from tornado import websocket, web, ioloop
from random import randint
import chessio, time, json, hashlib, re
from chess import *

sessions = {}
clients = {}

class GameSession:
    def __init__(self, sid, rnd):
        self.sid = sid
        self.rnd = rnd
        self.turn = 0
        self.unames = [None, None]
        self.users = [None, None]
        self._active = True
        self.draw_offered = False
        self.board = Board()
        self.moves = []

    @property
    def active(self):
        return self._active

    @active.setter
    def active(self, value):
        if not self._active and not value:
            return
        self._active = value
        if not value and self.moves:
            chessio.dump_session(self)

    def get_euser(self):
        if self.users[0]:
            return self.users[0]
        elif self.users[1]:
            return self.users[1]

    def get_euname(self):
        if self.users[0]:
            return self.unames[0]
        elif self.users[1]:
            return self.unames[1]

    def get_opposite(self, user):
        i = self.users.index(user)
        return self.users[1-i]

    def append_user(self, user, uname):
        if self.users[0] == None:
            self.users[0] = user
            self.unames[0] = uname
        elif self.users[1] == None:
            self.users[1] = user
            self.unames[1] = uname

    def remove_user(self, user):
        i = self.users.index(user)
        self.users[i] = None
        self.unames[i] = None

    def __len__(self):
        l = 0
        if self.users[0]: l += 1
        if self.users[1]: l += 1
        return l

    def get_w(self):
        if self.users[0] == None:
            return True
        elif self.users[1] == None:
            return False

    def add_move(self, move):
        self.moves.append(move)

class WrongMessageException(Exception):
    pass

class IndexHandler(web.RequestHandler):
    def get(self):
        self.render("index.html")

class SocketHandler(websocket.WebSocketHandler):
    def check_origin(self, origin):
        return True

    def open(self):
        pass

    def on_close(self):
        self.quit_session('disconnect', False)

    def on_message(self, message):
        try:
            data = json.loads(message)
            action = data['action']
            if action == 'conn_rnd':
                if 'name' not in data:
                    return
                uname = data['name']
                if not self.is_valid(uname):
                    return self.invalid_name(action, 'inv_uname')
                for sid, session in sessions.items():
                    if len(session) == 1 and session.rnd:
                        session.rnd = False
                        self.connect_to_session(session, sid, uname, 'conn_rnd', 'connected')
                        return
                session = self.create_session(uname, True)
                msg = {"action": "conn_rnd", "status": "wait", "sid": session.sid}
                self.write_message(json.dumps(msg))
                clients[self] = session
            elif action == 'wait_for':
                if 'name' not in data:
                    return
                uname = data['name']
                if not self.is_valid(uname):
                    return self.invalid_name(action, 'inv_uname')
                session = self.create_session(uname, False)
                msg = {"action": "wait_for", "status": "ok", "sid": session.sid}
                self.write_message(json.dumps(msg))
                clients[self] = session
            elif action == 'conn_to':
                if 'sid' not in data or 'name' not in data:
                    return
                uname = data['name']
                if not self.is_valid(uname):
                    return self.invalid_name('conn_to', 'inv_uname')
                sid = data['sid']
                msg = {"action": "conn_to", "status": "not_found"}
                if sid not in sessions:
                    self.write_message(json.dumps(msg))
                    return
                session = sessions[sid]
                if not session.active:
                    self.write_message(json.dumps(msg))
                    return
                if len(session) == 1:
                    session.rnd = False
                    self.connect_to_session(session, sid, uname, 'conn_to', 'ok')
                else:
                    msg['status'] = 'busy'
                    self.write_message(json.dumps(msg))
            elif action == 'quit':
                self.quit_session('quit', True)
            elif action == 'get_paths':
                if self not in clients:
                    return
                if not clients[self].active:
                    return
                cx = data['cx']
                cy = data['cy']
                board = clients[self].board
                paths = board.get_paths(board.grid, cx, cy)
                msg = {"action": "get_paths", "paths": paths}
                self.write_message(json.dumps(msg))
            elif action == 'make_move':
                if self not in clients:
                    return
                session = clients[self]
                if len(session) != 2 or session.users[session.turn] != self or not session.active:
                    return
                f = data['from']
                t = data['to']
                if not session.board.is_move_valid(f, t, session.turn == 0):
                    return
                self.make_move(f, t, session)
            elif action == 'offer_draw':
                if self not in clients:
                    return
                session = clients[self]
                if len(session) != 2 or not session.active:
                    return
                session.draw_offered = True
                msg1 = {"action": "offer_draw"}
                session.get_opposite(self).write_message(json.dumps(msg1))
                msg2 = {"action": "offer_sent"}
                self.write_message(json.dumps(msg2))
            elif action == 'offer_response':
                if self not in clients:
                    return
                session = clients[self]
                if not session.draw_offered or not session.active:
                    return
                resp = data['status']
                msg1 = {"action": "offer_response", "status": resp}
                msg2 = {"action": "offer_received", "status": resp}
                if resp == 'accept' or resp == 'deny':
                    self.write_message(json.dumps(msg2))
                    session.get_opposite(self).write_message(json.dumps(msg1))
                    if resp == 'accept':
                        session.active = False
            elif action == 'load_past_game':
                if 'sid' not in data:
                    return
                moves = chessio.load_history(data['sid'])
                if moves:
                    msg = {"action": "load_past_game", "status": "ok", "moves": moves}
                    self.write_message(json.dumps(msg))
                else:
                    msg = {"action": "load_past_game", "status": "failed"}
                    self.write_message(json.dumps(msg))
            else:
                raise WrongMessageException()
        except WrongMessageException:
            print('[Chess Logger] Wrong message...')

    def quit_session(self, action, close):
        if self in clients:
            session = clients[self]
            session.remove_user(self)
            if len(session) == 1 and session.active:
                msg = {"action": action}
                session.get_euser().write_message(json.dumps(msg))
            if close:
                session.active = False
            if len(session) == 0:
                session.active = False
                del sessions[session.sid]
            del clients[self]

    def create_session(self, uname, rnd):
        sid = self.generate_sid(uname)
        session = GameSession(sid, rnd)
        sessions[sid] = session
        session.append_user(self, uname)
        return session

    def connect_to_session(self, session, sid, uname, action, status):
        euser = session.get_euser()
        euser.write_message(json.dumps({"action": "peer_conn", "name": uname}))
        msg = {"action": action, "status": status, "sid": sid, "w": session.get_w(), "name": session.get_euname()}
        msg['board'] = session.board.pre_serialize()
        msg['turn'] = 1 - session.turn == session.get_w()
        session.append_user(self, uname)
        self.write_message(json.dumps(msg))
        clients[self] = session

    def make_move(self, f, t, session):
        killed = None
        cell = session.board.grid[t[1]][t[0]]
        if cell.figure != -1:
            killed = [cell.figure, cell.w]
        resp = session.board.move_figure(f[0], f[1], t[0], t[1])
        check = None
        if resp and 'check' in resp[0]:
            check = [resp[2], resp[3]]
        session.add_move([f, t, check, killed])
        msg = {"action": "make_move", "from": f, "to": t}
        if resp:
            msg["status"] = resp[0]
            if resp[0] == "stalemate":
                session.active = False
            elif resp[0] == "check":
                msg["victim"] = [resp[2], resp[3]]
            elif resp[0] == "checkmate":
                msg["victim"] = [resp[2], resp[3]]
                msg["winner"] = 1 - resp[1]
                session.active = False
        msg = json.dumps(msg)
        session.turn = 1 - session.turn
        session.users[0].write_message(msg)
        session.users[1].write_message(msg)

    def invalid_name(self, a, status):
        msg = {"action": a, "status": status}
        self.write_message(json.dumps(msg))
        return

    def is_valid(self, username):
        if len(username) > 42:
            return False
        return re.fullmatch(r'\w+', username)

    def generate_sid(self, name):
        length = randint(10, 20)
        salt = ''
        for i in range(length):
            t = randint(0, 2)
            if t == 0:
                salt += chr(randint(48, 57))
            elif t == 1:
                salt += chr(randint(65, 90))
            else:
                salt += chr(randint(97, 122))
        return hashlib.sha1(bytes(name + salt + str(time.time()), encoding = 'utf-8')).hexdigest()

app = web.Application([
    (r'/', IndexHandler),
    (r'/ws', SocketHandler),
    (r'/(favicon.ico)', web.StaticFileHandler, {'path': 'static/images/'}),
    (r'/static/(.*)', web.StaticFileHandler, {'path': 'static/'})
])

if __name__ == '__main__':
    print(">>>> Chess Web Server <<<<")
    app.listen(8001)
    ioloop.IOLoop.instance().start()