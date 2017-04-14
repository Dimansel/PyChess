import sqlite3, json

DB_PATH = 'data/history.db'

def dump_session(session):
    conn = sqlite3.connect(DB_PATH)
    curs = conn.cursor()
    curs.execute('INSERT INTO games (sid, moves) VALUES (?, ?)', [session.sid, json.dumps(session.moves)])
    conn.commit()
    conn.close()

#TODO: handle non existing session id
def load_history(sid):
    conn = sqlite3.connect(DB_PATH)
    curs = conn.cursor()
    curs.execute('SELECT moves FROM games WHERE sid = ?', [sid])
    moves = json.loads(curs.fetchall()[0][0])
    conn.close()
    return moves