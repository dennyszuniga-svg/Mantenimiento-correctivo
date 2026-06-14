const form = document.getElementById('incidentForm');
const previewSection = document.getElementById('previewSection');
const statusMessage = document.getElementById('statusMessage');
const taskList = document.getElementById('taskList');

const fields = {
    fecha: document.getElementById('fecha'),
    hora: document.getElementById('hora'),
    incidente: document.getElementById('incidente'),
    solucion: document.getElementById('solucion'),
    observaciones: document.getElementById('observaciones'),
    conclusiones: document.getElementById('conclusiones')
};

const groups = {
    fecha: document.getElementById('fechaGroup'),
    hora: document.getElementById('horaGroup'),
    incidente: document.getElementById('incidenteGroup')
};

const preview = {
    fecha: document.getElementById('previewFecha'),
    incidente: document.getElementById('previewIncidente'),
    actividades: document.getElementById('previewActividades'),
    solucion: document.getElementById('previewSolucion'),
    observaciones: document.getElementById('previewObservaciones'),
    conclusiones: document.getElementById('previewConclusiones')
};

let nextTaskId = 1;
let tasks = [];

document.getElementById('btnLimpiar').addEventListener('click', resetForm);
document.getElementById('btnAgregarTarea').addEventListener('click', addTask);
document.getElementById('btnPrevisualizar').addEventListener('click', () => {
    if (renderPreview()) {
        previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});
document.getElementById('btnCopiar').addEventListener('click', copyReport);
document.getElementById('btnDescargar').addEventListener('click', downloadReport);

form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!renderPreview()) {
        return;
    }

    setStatus('Informe listo para imprimir.');
    window.print();
});

Object.entries(fields).forEach(([name, field]) => {
    field.addEventListener('input', () => {
        clearStatus();

        if (groups[name] && field.value.trim()) {
            setFieldError(name, false);
        }
    });
});

setDefaultDateTime();
createTask();
renderTasks();

function setDefaultDateTime() {
    const now = new Date();
    fields.fecha.value = formatInputDate(now);
    fields.hora.value = now.toTimeString().slice(0, 5);
}

function resetForm() {
    form.reset();
    setDefaultDateTime();
    Object.keys(groups).forEach((name) => setFieldError(name, false));
    tasks = [];
    nextTaskId = 1;
    createTask();
    renderTasks();
    previewSection.classList.remove('active');
    clearStatus();
}

function createTask(overrides = {}) {
    tasks.push({
        id: nextTaskId,
        done: false,
        description: '',
        photos: [],
        ...overrides
    });
    nextTaskId += 1;
}

function addTask() {
    const lastTask = tasks[tasks.length - 1];

    if (lastTask && !isTaskReadyForNext(lastTask)) {
        setStatus('Complete la tarea actual con detalle y al menos una foto antes de agregar otra.', true);
        return;
    }

    createTask();
    renderTasks();
    clearStatus();
}

function renderTasks() {
    taskList.innerHTML = tasks.map((task, index) => `
        <article class="task-card ${task.done ? 'active' : ''}" data-task-id="${task.id}">
            <div class="task-summary">
                <label class="task-check" for="taskDone${task.id}">
                    <input type="checkbox" id="taskDone${task.id}" data-action="toggle-task" ${task.done ? 'checked' : ''}>
                    <span>Tarea ${index + 1} realizada</span>
                </label>
                <span class="task-count">${task.photos.length} foto${task.photos.length === 1 ? '' : 's'}</span>
                ${tasks.length > 1 ? `<button type="button" class="btn btn-secondary task-remove" data-action="remove-task">Quitar</button>` : ''}
            </div>
            <div class="task-detail">
                <div>
                    <label for="taskDescription${task.id}">Detalle de la tarea</label>
                    <textarea
                        id="taskDescription${task.id}"
                        data-action="task-description"
                        placeholder="Describa lo que se realiz&oacute; en esta tarea."
                    ></textarea>
                </div>
                <div>
                    <label for="taskPhotos${task.id}">Fotos de evidencia</label>
                    <input type="file" id="taskPhotos${task.id}" data-action="task-photos" accept="image/jpeg,image/png,image/webp,image/gif" capture="environment" multiple>
                </div>
                <div class="photo-list" id="photoList${task.id}" aria-label="Fotos agregadas a la tarea ${index + 1}"></div>
            </div>
        </article>
    `).join('');

    tasks.forEach((task) => {
        const card = getTaskCard(task.id);
        card.querySelector('[data-action="task-description"]').value = task.description;
        renderPhotoList(task);
    });
}

taskList.addEventListener('change', async (event) => {
    const task = getTaskFromEvent(event);

    if (!task) {
        return;
    }

    if (event.target.dataset.action === 'toggle-task') {
        task.done = event.target.checked;
        renderTasks();
        clearStatus();
    }

    if (event.target.dataset.action === 'task-photos') {
        const photos = await readImageFiles([...event.target.files]);
        task.photos.push(...photos);
        const createdNextTask = ensureNextTaskIfReady(task);
        renderTasks();
        setStatus(createdNextTask
            ? 'Tarea completada. Se habilito la siguiente tarea.'
            : `${photos.length} foto${photos.length === 1 ? '' : 's'} agregada${photos.length === 1 ? '' : 's'} a la tarea.`
        );
    }
});

taskList.addEventListener('input', (event) => {
    const task = getTaskFromEvent(event);

    if (task && event.target.dataset.action === 'task-description') {
        task.description = event.target.value;
        if (ensureNextTaskIfReady(task)) {
            renderTasks();
            return;
        }
        clearStatus();
    }
});

taskList.addEventListener('click', (event) => {
    const task = getTaskFromEvent(event);

    if (!task) {
        return;
    }

    if (event.target.dataset.action === 'remove-task') {
        tasks = tasks.filter((item) => item.id !== task.id);
        renderTasks();
        clearStatus();
    }

    if (event.target.dataset.action === 'remove-photo') {
        const photoId = Number(event.target.dataset.photoId);
        task.photos = task.photos.filter((photo) => photo.id !== photoId);
        renderTasks();
        clearStatus();
    }
});

function getTaskFromEvent(event) {
    const card = event.target.closest('.task-card');

    if (!card) {
        return null;
    }

    return tasks.find((task) => task.id === Number(card.dataset.taskId));
}

function ensureNextTaskIfReady(task) {
    const isLastTask = tasks[tasks.length - 1]?.id === task.id;

    if (isLastTask && isTaskReadyForNext(task)) {
        createTask();
        setStatus('Tarea completada. Se habilito la siguiente tarea.');
        return true;
    }

    return false;
}

function isTaskReadyForNext(task) {
    return task.done && Boolean(task.description.trim()) && task.photos.length > 0;
}

function getTaskCard(taskId) {
    return taskList.querySelector(`[data-task-id="${taskId}"]`);
}

function renderPhotoList(task) {
    const photoList = document.getElementById(`photoList${task.id}`);

    photoList.innerHTML = '';

    task.photos.forEach((photo) => {
        const item = document.createElement('figure');
        const image = document.createElement('img');
        const meta = document.createElement('figcaption');
        const name = document.createElement('span');
        const remove = document.createElement('button');

        item.className = 'photo-thumb';
        image.src = photo.dataUrl;
        image.alt = photo.name;
        meta.className = 'photo-meta';
        name.textContent = photo.name;
        remove.type = 'button';
        remove.className = 'photo-remove';
        remove.dataset.action = 'remove-photo';
        remove.dataset.photoId = String(photo.id);
        remove.textContent = 'Quitar';

        meta.append(name, remove);
        item.append(image, meta);
        photoList.append(item);
    });
}

function readImageFiles(files) {
    const imageFiles = files.filter((file) => (
        ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)
    ));

    return Promise.all(imageFiles.map((file) => new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            resolve({
                id: Date.now() + Math.floor(Math.random() * 100000),
                name: file.name,
                dataUrl: reader.result
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    })));
}

function renderPreview() {
    const report = getReportData();

    if (!validateReport(report)) {
        return false;
    }

    preview.fecha.textContent = `${formatDisplayDate(report.fecha)} - ${report.hora}`;
    preview.incidente.textContent = report.incidente;
    renderReportTasks(report.actividades);
    preview.solucion.textContent = report.solucion || 'No especificado';
    preview.observaciones.textContent = report.observaciones || 'No especificado';
    preview.conclusiones.textContent = report.conclusiones || 'No especificado';

    previewSection.classList.add('active');
    setStatus('Vista previa actualizada.');
    return true;
}

function renderReportTasks(activityTasks) {
    preview.actividades.innerHTML = '';

    if (!activityTasks.length) {
        preview.actividades.textContent = 'No especificado';
        return;
    }

    activityTasks.forEach((task, index) => {
        const article = document.createElement('article');
        const title = document.createElement('h4');
        const description = document.createElement('p');
        const photoList = document.createElement('div');

        article.className = 'report-task';
        title.textContent = `Tarea ${index + 1}`;
        description.textContent = task.description || 'Sin detalle registrado.';
        photoList.className = 'report-photo-list';

        task.photos.forEach((photo, photoIndex) => {
            const figure = document.createElement('figure');
            const image = document.createElement('img');
            const caption = document.createElement('figcaption');

            figure.className = 'report-photo';
            image.src = photo.dataUrl;
            image.alt = `Foto ${photoIndex + 1} de tarea ${index + 1}`;
            caption.className = 'photo-meta';
            caption.textContent = photo.name;

            figure.append(image, caption);
            photoList.append(figure);
        });

        article.append(title, description);

        if (task.photos.length) {
            article.append(photoList);
        }

        preview.actividades.append(article);
    });
}

function getReportData() {
    return {
        ...Object.fromEntries(
            Object.entries(fields).map(([name, field]) => [name, field.value.trim()])
        ),
        actividades: getCompletedTasks()
    };
}

function getCompletedTasks() {
    return tasks
        .filter((task) => task.done && (task.description.trim() || task.photos.length))
        .map((task) => ({
            description: task.description.trim(),
            photos: task.photos
        }));
}

function validateReport(report) {
    const requiredFields = ['fecha', 'hora', 'incidente'];
    let isValid = true;

    requiredFields.forEach((name) => {
        const hasValue = Boolean(report[name]);
        setFieldError(name, !hasValue);
        isValid = isValid && hasValue;
    });

    if (!isValid) {
        const firstInvalid = requiredFields.find((name) => !report[name]);
        fields[firstInvalid].focus();
        setStatus('Complete los campos obligatorios para continuar.', true);
    }

    return isValid;
}

function setFieldError(name, hasError) {
    groups[name].classList.toggle('error', hasError);
    fields[name].setAttribute('aria-invalid', String(hasError));
}

function buildReportText() {
    const report = getReportData();

    if (!validateReport(report)) {
        return '';
    }

    return [
        'INFORME TECNICO DE INCIDENTE',
        '',
        `Fecha y hora: ${formatDisplayDate(report.fecha)} - ${report.hora}`,
        '',
        'INFORME DEL INCIDENTE',
        report.incidente,
        '',
        'ACTIVIDADES REALIZADAS',
        formatActivityTasksAsText(report.actividades),
        '',
        'SOLUCION REALIZADA',
        report.solucion || 'No especificado',
        '',
        'OBSERVACIONES',
        report.observaciones || 'No especificado',
        '',
        'CONCLUSIONES',
        report.conclusiones || 'No especificado'
    ].join('\n');
}

function formatActivityTasksAsText(activityTasks) {
    if (!activityTasks.length) {
        return 'No especificado';
    }

    return activityTasks.map((task, index) => [
        `Tarea ${index + 1}:`,
        task.description || 'Sin detalle registrado.',
        `Fotos adjuntas: ${task.photos.length || 'Sin fotos'}`
    ].join('\n')).join('\n\n');
}

async function copyReport() {
    const text = buildReportText();

    if (!text) {
        return;
    }

    try {
        await navigator.clipboard.writeText(text);
        renderPreview();
        setStatus('Informe copiado al portapapeles. Las fotos quedan disponibles en la vista previa y descarga.');
    } catch (error) {
        setStatus('No se pudo copiar automaticamente. Use la vista previa para copiar el texto.', true);
    }
}

function downloadReport() {
    const report = getReportData();

    if (!validateReport(report)) {
        return;
    }

    renderPreview();

    const fileName = `informe-incidente-${fields.fecha.value || 'sin-fecha'}.html`;
    const blob = new Blob([buildReportHtml(report)], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);

    setStatus('Informe descargado en HTML con fotos incluidas.');
}

function buildReportHtml(report) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Informe tecnico de incidente</title>
    <style>
        body { color: #1f2a2e; font-family: Arial, sans-serif; margin: 32px; }
        h1 { color: #0d5360; margin-bottom: 4px; }
        h2 { border-bottom: 1px solid #d8e2df; color: #0d5360; font-size: 16px; margin-top: 28px; padding-bottom: 6px; text-transform: uppercase; }
        p { line-height: 1.55; white-space: pre-wrap; }
        .task { border: 1px solid #d8e2df; border-radius: 6px; margin: 12px 0; padding: 14px; break-inside: avoid; }
        .photos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
        figure { border: 1px solid #d8e2df; border-radius: 6px; margin: 0; overflow: hidden; }
        img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
        figcaption { color: #65737a; font-size: 12px; padding: 7px 8px; }
    </style>
</head>
<body>
    <h1>Informe tecnico de incidente</h1>
    <p>${escapeHtml(formatDisplayDate(report.fecha))} - ${escapeHtml(report.hora)}</p>
    <h2>Informe del incidente</h2>
    <p>${escapeHtml(report.incidente)}</p>
    <h2>Actividades realizadas</h2>
    ${buildActivityTasksHtml(report.actividades)}
    <h2>Solucion realizada</h2>
    <p>${escapeHtml(report.solucion || 'No especificado')}</p>
    <h2>Observaciones</h2>
    <p>${escapeHtml(report.observaciones || 'No especificado')}</p>
    <h2>Conclusiones</h2>
    <p>${escapeHtml(report.conclusiones || 'No especificado')}</p>
</body>
</html>`;
}

function buildActivityTasksHtml(activityTasks) {
    if (!activityTasks.length) {
        return '<p>No especificado</p>';
    }

    return activityTasks.map((task, index) => `
        <section class="task">
            <h3>Tarea ${index + 1}</h3>
            <p>${escapeHtml(task.description || 'Sin detalle registrado.')}</p>
            ${task.photos.length ? `
                <div class="photos">
                    ${task.photos.map((photo, photoIndex) => `
                        <figure>
                            <img src="${photo.dataUrl}" alt="Foto ${photoIndex + 1} de tarea ${index + 1}">
                            <figcaption>${escapeHtml(photo.name)}</figcaption>
                        </figure>
                    `).join('')}
                </div>
            ` : ''}
        </section>
    `).join('');
}

function formatInputDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    return new Intl.DateTimeFormat('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function setStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? 'var(--danger)' : 'var(--primary)';
}

function clearStatus() {
    statusMessage.textContent = '';
}
