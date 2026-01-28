from flask import Flask, request, jsonify
from flask_cors import CORS
from engine import engine
import time

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ready', 'templates': list(engine.templates.keys())})

@app.route('/register', methods=['POST'])
def register_medicine():
    data = request.json
    name = data.get('name', f"med_{int(time.time())}")
    image = data.get('image')

    if not image:
        return jsonify({'success': False, 'error': 'No image provided'}), 400

    success = engine.register(name, image)
    return jsonify({'success': success, 'name': name})

@app.route('/verify', methods=['POST'])
def verify_frame():
    data = request.json
    image = data.get('image')

    if not image:
        return jsonify({'success': False, 'error': 'No image provided'}), 400

    result = engine.verify(image)
    
    if result:
        return jsonify({
            'success': True,
            'match': result
        })
    
    return jsonify({'success': False, 'message': 'No match found'})

if __name__ == '__main__':
    app.run(port=5005, debug=True)
