import socketio
import sys

sio = socketio.Client()

@sio.event
def connect():
    print("Connected to server")
    sio.disconnect()

@sio.event
def connect_error(data):
    print("Connection failed:", data)

if __name__ == "__main__":
    try:
        sio.connect('http://127.0.0.1:5000')
    except Exception as e:
        print("Error:", e)
        sys.exit(1)
