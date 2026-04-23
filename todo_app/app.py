# Name: Naman
# Assignment 4 - Flask-Powered Dynamic To-Do List Application
# Course: Web Programming with Python & JavaScript Lab (SEC035)

from flask import Flask, render_template, request, jsonify, abort
from datetime import datetime

app = Flask(__name__)

# In-memory task store
tasks = []
next_id = 1


# Route: Render the main To-Do page
@app.route('/')
def index():
    return render_template('index.html')


# Route: Get all tasks (supports ?status=active|completed filter)
@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    status = request.args.get('status')
    if status == 'active':
        filtered = [t for t in tasks if not t['completed']]
    elif status == 'completed':
        filtered = [t for t in tasks if t['completed']]
    else:
        filtered = tasks
    return jsonify(filtered), 200


# Route: Create a new task
@app.route('/api/tasks', methods=['POST'])
def create_task():
    global next_id
    data = request.get_json()

    # Validate title is not empty
    if not data or not data.get('title', '').strip():
        return jsonify({'error': 'Title is required'}), 400

    # Validate priority
    priority = data.get('priority', 'medium')
    if priority not in ['low', 'medium', 'high']:
        priority = 'medium'

    task = {
        'id': next_id,
        'title': data['title'].strip(),
        'description': data.get('description', '').strip(),
        'priority': priority,
        'completed': False,
        'created_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    tasks.append(task)
    next_id += 1
    return jsonify(task), 201


# Route: Update a task by ID
@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = next((t for t in tasks if t['id'] == task_id), None)
    if not task:
        abort(404)

    data = request.get_json()
    if 'title' in data and data['title'].strip():
        task['title'] = data['title'].strip()
    if 'description' in data:
        task['description'] = data['description'].strip()
    if 'priority' in data and data['priority'] in ['low', 'medium', 'high']:
        task['priority'] = data['priority']
    if 'completed' in data:
        task['completed'] = bool(data['completed'])

    return jsonify(task), 200


# Route: Toggle the completed status of a task
@app.route('/api/tasks/<int:task_id>/toggle', methods=['PATCH'])
def toggle_task(task_id):
    task = next((t for t in tasks if t['id'] == task_id), None)
    if not task:
        abort(404)
    task['completed'] = not task['completed']
    return jsonify(task), 200


# Route: Delete a task by ID
@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    global tasks
    task = next((t for t in tasks if t['id'] == task_id), None)
    if not task:
        abort(404)
    tasks = [t for t in tasks if t['id'] != task_id]
    return '', 204


if __name__ == '__main__':
    app.run(debug=True)
