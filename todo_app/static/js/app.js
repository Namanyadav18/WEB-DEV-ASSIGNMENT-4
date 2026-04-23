// Name: Naman
// Assignment 4 - Flask To-Do App JavaScript
// All Fetch calls use async/await with try/catch

let currentFilter = 'all';

// ─── On page load, fetch and render all tasks ───────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
});

// ─── Load tasks from Flask API and render them ───────────────────────────────
async function loadTasks() {
    const url = currentFilter === 'all' ? '/api/tasks' : `/api/tasks?status=${currentFilter}`;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to load tasks');
        const tasks = await res.json();
        renderTasks(tasks);
        updateCounter();
    } catch (err) {
        showFetchError('Could not load tasks: ' + err.message);
    }
}

// ─── Render task array into the DOM ──────────────────────────────────────────
function renderTasks(tasks) {
    const container = document.getElementById('task-list');
    if (tasks.length === 0) {
        container.innerHTML = `<p class="empty-state">No tasks yet! Add your first task above.</p>`;
        return;
    }
    container.innerHTML = tasks.map(task => createTaskCard(task)).join('');

    // Trigger fade-in animation for each card
    container.querySelectorAll('.task-card').forEach(card => {
        card.classList.add('fade-in');
    });
}

// ─── Build HTML string for a single task card ────────────────────────────────
function createTaskCard(task) {
    const completedClass = task.completed ? 'completed' : '';
    const checkedAttr    = task.completed ? 'checked' : '';
    return `
    <div class="task-card ${completedClass} priority-border-${task.priority}" data-id="${task.id}" id="card-${task.id}">
        <div class="card-header">
            <div class="card-left">
                <input type="checkbox" class="task-checkbox" ${checkedAttr}
                    onchange="toggleTask(${task.id})">
                <span class="task-title">${escapeHtml(task.title)}</span>
                <span class="badge priority-${task.priority}">${task.priority}</span>
            </div>
            <div class="card-actions">
                <button class="btn-edit" onclick="editTask(${task.id})">✏️ Edit</button>
                <button class="btn-delete" onclick="deleteTask(${task.id})">🗑️ Delete</button>
            </div>
        </div>
        ${task.description ? `<p class="task-desc">${escapeHtml(task.description)}</p>` : ''}
        <small class="task-date">Created: ${task.created_at}</small>
    </div>`;
}

// ─── Add a new task via POST ──────────────────────────────────────────────────
async function addTask() {
    const titleInput = document.getElementById('task-title');
    const descInput  = document.getElementById('task-description');
    const prioInput  = document.getElementById('task-priority');
    const errorSpan  = document.getElementById('title-error');

    // Client-side validation
    if (!titleInput.value.trim()) {
        errorSpan.style.display = 'block';
        titleInput.focus();
        return;
    }
    errorSpan.style.display = 'none';

    try {
        const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title:       titleInput.value.trim(),
                description: descInput.value.trim(),
                priority:    prioInput.value
            })
        });
        if (!res.ok) throw new Error('Failed to add task');

        // Clear inputs on success
        titleInput.value = '';
        descInput.value  = '';
        prioInput.value  = 'medium';
        await loadTasks();
    } catch (err) {
        showFetchError('Could not add task: ' + err.message);
    }
}

// ─── Delete a task via DELETE ─────────────────────────────────────────────────
async function deleteTask(id) {
    try {
        const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
        if (res.status !== 204) throw new Error('Failed to delete task');

        // Slide-out animation then remove from DOM
        const card = document.getElementById(`card-${id}`);
        if (card) {
            card.classList.add('slide-out');
            card.addEventListener('transitionend', () => card.remove());
        }
        await updateCounter();
    } catch (err) {
        showFetchError('Could not delete task: ' + err.message);
    }
}

// ─── Toggle task completion via PATCH ────────────────────────────────────────
async function toggleTask(id) {
    try {
        const res = await fetch(`/api/tasks/${id}/toggle`, { method: 'PATCH' });
        if (!res.ok) throw new Error('Failed to toggle task');
        const task = await res.json();

        // Update card class and title style in DOM
        const card = document.getElementById(`card-${id}`);
        if (card) {
            card.classList.toggle('completed', task.completed);
        }
        await updateCounter();
    } catch (err) {
        showFetchError('Could not toggle task: ' + err.message);
    }
}

// ─── Inline edit a task ───────────────────────────────────────────────────────
async function editTask(id) {
    // Fetch current task data
    let task;
    try {
        const res = await fetch('/api/tasks');
        if (!res.ok) throw new Error();
        const tasks = await res.json();
        task = tasks.find(t => t.id === id);
    } catch {
        showFetchError('Could not load task for editing.');
        return;
    }

    const card = document.getElementById(`card-${id}`);
    card.innerHTML = `
        <div class="edit-mode">
            <input type="text" class="edit-title" value="${escapeHtml(task.title)}" id="edit-title-${id}">
            <textarea class="edit-desc" id="edit-desc-${id}" rows="2">${escapeHtml(task.description)}</textarea>
            <select class="edit-priority" id="edit-prio-${id}">
                <option value="low"    ${task.priority==='low'    ? 'selected':''}>🟢 Low</option>
                <option value="medium" ${task.priority==='medium' ? 'selected':''}>🟠 Medium</option>
                <option value="high"   ${task.priority==='high'   ? 'selected':''}>🔴 High</option>
            </select>
            <div class="edit-actions">
                <button class="btn-save"   onclick="saveTask(${id})">💾 Save</button>
                <button class="btn-cancel" onclick="loadTasks()">✖ Cancel</button>
            </div>
        </div>`;
}

// ─── Save edited task via PUT ─────────────────────────────────────────────────
async function saveTask(id) {
    const title = document.getElementById(`edit-title-${id}`).value.trim();
    const desc  = document.getElementById(`edit-desc-${id}`).value.trim();
    const prio  = document.getElementById(`edit-prio-${id}`).value;

    if (!title) {
        alert('Title cannot be empty!');
        return;
    }

    try {
        const res = await fetch(`/api/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description: desc, priority: prio })
        });
        if (!res.ok) throw new Error('Failed to save task');
        await loadTasks();
    } catch (err) {
        showFetchError('Could not save task: ' + err.message);
    }
}

// ─── Filter tasks by status ───────────────────────────────────────────────────
async function filterTasks(status) {
    currentFilter = status;

    // Highlight active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === status);
    });

    await loadTasks();
}

// ─── Update task counters in the counter bar ──────────────────────────────────
async function updateCounter() {
    try {
        const res = await fetch('/api/tasks');
        if (!res.ok) throw new Error();
        const tasks = await res.json();
        const total     = tasks.length;
        const completed = tasks.filter(t => t.completed).length;
        const active    = total - completed;

        document.getElementById('count-total').textContent     = total;
        document.getElementById('count-active').textContent    = active;
        document.getElementById('count-completed').textContent = completed;
        document.getElementById('nav-counter').textContent     = `${total} task${total !== 1 ? 's' : ''}`;
    } catch {
        // silently ignore counter errors
    }
}

// ─── Show a user-visible fetch error message ──────────────────────────────────
function showFetchError(msg) {
    const el = document.getElementById('fetch-error');
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ─── Escape HTML to prevent XSS ──────────────────────────────────────────────
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
