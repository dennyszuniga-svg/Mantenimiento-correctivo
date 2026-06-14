const LOGO_SRC = 'assets/urbapark-logo.png';
const PUBLIC_LOGO_SRC = 'https://dennyszuniga-svg.github.io/Mantenimiento-correctivo/assets/urbapark-logo.png';

const form = document.getElementById('incidentForm');
const previewSection = document.getElementById('previewSection');
const statusMessage = document.getElementById('statusMessage');
const taskList = document.getElementById('taskList');

const fields = {
    personal: document.getElementById('personal'),
    sede: document.getElementById('sede'),
    equipo: document.getElementById('equipo'),
    tipoMantenimiento: document.getElementById('tipoMantenimiento'),
    estadoInicial: document.getElementById('estadoInicial'),
    estadoInicialOtro: document.getElementById('estadoInicialOtro'),
    horaInicio: document.getElementById('horaInicio'),
    horaFinal: document.getElementById('horaFinal'),
    incidente: document.getElementById('incidente'),
    solucion: document.getElementById('solucion'),
    observaciones: document.getElementById('observaciones'),
    conclusiones: document.getElementById('conclusiones')
};

const groups = {
    personal: document.getElementById('personalGroup'),
    sede: document.getElementById('sedeGroup'),
    equipo: document.getElementById('equipoGroup'),
    tipoMantenimiento: document.getElementById('tipoMantenimientoGroup'),
    estadoInicial: document.getElementById('estadoInicialGroup'),
    estadoInicialOtro: document.getElementById('estadoInicialOtroGroup'),
    horaInicio: document.getElementById('horaInicioGroup'),
    horaFinal: document.getElementById('horaFinalGroup'),
    incidente: document.getElementById('incidenteGroup'),
    solucion: document.getElementById('solucionGroup'),
    conclusiones: document.getElementById('conclusionesGroup'),
    actividades: document.getElementById('activityTasksGroup')
};

const preview = {
    fechaGuardado: document.getElementById('previewFechaGuardado'),
    datosGenerales: document.getElementById('previewDatosGenerales'),
    incidente: document.getElementById('previewIncidente'),
    actividades: document.getElementById('previewActividades'),
    solucion: document.getElementById('previewSolucion'),
    observaciones: document.getElementById('previewObservaciones'),
    conclusiones: document.getElementById('previewConclusiones')
};

let nextTaskId = 1;
let tasks = [];
let lastGeneratedAt = null;

document.getElementById('btnLimpiar').addEventListener('click', resetForm);
document.getElementById('btnPrevisualizar').addEventListener('click', () => {
    if (renderPreview()) {
        previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});
document.getElementById('btnCopiar').addEventListener('click', copyReport);
document.getElementById('btnDescargar').addEventListener('click', downloadReport);

form.addEventListener('submit', (event) => {
    event.preventDefault();
    lastGeneratedAt = new Date();

    if (!renderPreview()) {
        lastGeneratedAt = null;
        return;
    }

    setStatus('Informe listo para imprimir.');
    window.print();
});

fields.estadoInicial.addEventListener('change', () => {
    updateEstadoInicialOtroVisibility();
    clearStatus();
});

Object.entries(fields).forEach(([name, field]) => {
    field.addEventListener('input', () => {
        clearStatus();

        if (groups[name] && field.value.trim()) {
            setFieldError(name, false);
        }
    });
});

setDefaultTimes();
createTask();
renderTasks();
updateEstadoInicialOtroVisibility();

function setDefaultTimes() {
    const now = new Date();
    fields.horaInicio.value = now.toTimeString().slice(0, 5);
}

function resetForm() {
    form.reset();
    setDefaultTimes();
    Object.keys(groups).forEach((name) => setFieldError(name, false));
    groups.actividades.classList.remove('error');
    tasks = [];
    nextTaskId = 1;
    lastGeneratedAt = null;
    createTask();
    renderTasks();
    updateEstadoInicialOtroVisibility();
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
                    <label for="taskPhotos${task.id}">Evidencia fotogr&aacute;fica</label>
                    <label class="camera-button" for="taskPhotos${task.id}">Tomar foto</label>
                    <input
                        class="camera-input"
                        type="file"
                        id="taskPhotos${task.id}"
                        data-action="task-photos"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        capture="environment"
                        multiple
                    >
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
        renderTasks();
        setStatus(`${photos.length} foto${photos.length === 1 ? '' : 's'} agregada${photos.length === 1 ? '' : 's'}. Agregue el subtitulo de cada foto.`);
    }
});

taskList.addEventListener('input', (event) => {
    const task = getTaskFromEvent(event);

    if (!task) {
        return;
    }

    if (event.target.dataset.action === 'task-description') {
        task.description = event.target.value;
        clearStatus();
    }

    if (event.target.dataset.action === 'photo-caption') {
        const photo = task.photos.find((item) => item.id === Number(event.target.dataset.photoId));

        if (photo) {
            photo.caption = event.target.value;
            if (ensureNextTaskIfReady(task)) {
                renderTasks();
            }
            clearStatus();
        }
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

    if (isLastTask && isTaskComplete(task)) {
        createTask();
        setStatus('Tarea completada. Se habilito la siguiente tarea.');
        return true;
    }

    return false;
}

function isTaskComplete(task) {
    return task.done
        && Boolean(task.description.trim())
        && task.photos.length > 0
        && task.photos.every((photo) => photo.caption.trim());
}

function isTaskStarted(task) {
    return task.done || Boolean(task.description.trim()) || task.photos.length > 0;
}

function getTaskCard(taskId) {
    return taskList.querySelector(`[data-task-id="${taskId}"]`);
}

function renderPhotoList(task) {
    const photoList = document.getElementById(`photoList${task.id}`);

    photoList.innerHTML = '';

    task.photos.forEach((photo, index) => {
        const item = document.createElement('figure');
        const image = document.createElement('img');
        const body = document.createElement('figcaption');
        const meta = document.createElement('div');
        const name = document.createElement('span');
        const remove = document.createElement('button');
        const caption = document.createElement('input');

        item.className = 'photo-thumb';
        image.src = photo.dataUrl;
        image.alt = photo.caption || `Foto ${index + 1}`;
        body.className = 'photo-body';
        meta.className = 'photo-meta';
        name.textContent = photo.name;
        remove.type = 'button';
        remove.className = 'photo-remove';
        remove.dataset.action = 'remove-photo';
        remove.dataset.photoId = String(photo.id);
        remove.textContent = 'Quitar';
        caption.type = 'text';
        caption.placeholder = 'Subtitulo obligatorio de la foto';
        caption.value = photo.caption;
        caption.dataset.action = 'photo-caption';
        caption.dataset.photoId = String(photo.id);
        caption.setAttribute('aria-label', `Subtitulo de foto ${index + 1}`);

        meta.append(name, remove);
        body.append(meta, caption);
        item.append(image, body);
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
                caption: '',
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

    preview.fechaGuardado.textContent = report.fechaGuardado
        ? `Fecha de guardado: ${formatDateTime(report.fechaGuardado)}`
        : 'Fecha de guardado: se registrara al guardar el informe';
    renderGeneralDetails(report);
    preview.incidente.textContent = report.incidente;
    renderReportTasks(report.actividades);
    preview.solucion.textContent = report.solucion;
    preview.observaciones.textContent = report.observaciones || 'No especificado';
    preview.conclusiones.textContent = report.conclusiones;

    previewSection.classList.add('active');
    setStatus('Vista previa actualizada. El informe ya puede guardarse.');
    return true;
}

function renderGeneralDetails(report) {
    const items = getGeneralDetailItems(report);
    preview.datosGenerales.innerHTML = '';

    items.forEach(([label, value]) => {
        const wrapper = document.createElement('div');
        const term = document.createElement('dt');
        const detail = document.createElement('dd');

        term.textContent = label;
        detail.textContent = value;
        wrapper.append(term, detail);
        preview.datosGenerales.append(wrapper);
    });
}

function getGeneralDetailItems(report) {
    return [
        ['Personal', report.personal],
        ['Sede', report.sede],
        ['Equipo', report.equipo],
        ['Tipo de mantenimiento', report.tipoMantenimiento],
        ['Estado inicial', report.estadoInicialTexto],
        ['Hora de inicio', report.horaInicio],
        ['Hora final', report.horaFinal]
    ];
}

function renderReportTasks(activityTasks) {
    preview.actividades.innerHTML = '';

    activityTasks.forEach((task, index) => {
        const article = document.createElement('article');
        const title = document.createElement('h4');
        const description = document.createElement('p');
        const photoList = document.createElement('div');

        article.className = 'report-task';
        title.textContent = `Tarea ${index + 1}`;
        description.textContent = task.description;
        photoList.className = 'report-photo-list';

        task.photos.forEach((photo, photoIndex) => {
            const figure = document.createElement('figure');
            const image = document.createElement('img');
            const caption = document.createElement('figcaption');

            figure.className = 'report-photo';
            image.src = photo.dataUrl;
            image.alt = `Foto ${photoIndex + 1} de tarea ${index + 1}`;
            caption.textContent = photo.caption;

            figure.append(image, caption);
            photoList.append(figure);
        });

        article.append(title, description, photoList);
        preview.actividades.append(article);
    });
}

function getReportData() {
    const fechaGuardado = lastGeneratedAt;
    const estadoInicialTexto = fields.estadoInicial.value === 'Otro'
        ? `Otro: ${fields.estadoInicialOtro.value.trim()}`
        : fields.estadoInicial.value.trim();

    return {
        ...Object.fromEntries(
            Object.entries(fields).map(([name, field]) => [name, field.value.trim()])
        ),
        estadoInicialTexto,
        fechaGuardado,
        actividades: getCompletedTasks()
    };
}

function getCompletedTasks() {
    return tasks
        .filter((task) => isTaskComplete(task))
        .map((task) => ({
            description: task.description.trim(),
            photos: task.photos.map((photo) => ({
                name: photo.name,
                caption: photo.caption.trim(),
                dataUrl: photo.dataUrl
            }))
        }));
}

function validateReport(report) {
    const requiredFields = [
        'personal',
        'sede',
        'equipo',
        'tipoMantenimiento',
        'estadoInicial',
        'horaInicio',
        'horaFinal',
        'incidente',
        'solucion',
        'conclusiones'
    ];
    let isValid = true;

    requiredFields.forEach((name) => {
        const hasValue = Boolean(report[name]);
        setFieldError(name, !hasValue);
        isValid = isValid && hasValue;
    });

    const needsEstadoOtro = report.estadoInicial === 'Otro';
    setFieldError('estadoInicialOtro', needsEstadoOtro && !report.estadoInicialOtro);
    isValid = isValid && (!needsEstadoOtro || Boolean(report.estadoInicialOtro));

    const taskValidation = validateTasks();
    isValid = isValid && taskValidation.isValid;

    if (!isValid) {
        const firstInvalid = requiredFields.find((name) => !report[name])
            || (needsEstadoOtro && !report.estadoInicialOtro ? 'estadoInicialOtro' : null);

        if (firstInvalid) {
            fields[firstInvalid].focus();
        }

        setStatus(taskValidation.message || 'Complete todos los campos obligatorios para guardar el informe.', true);
        return false;
    }

    return true;
}

function validateTasks() {
    const startedTasks = tasks.filter(isTaskStarted);
    const completedTasks = tasks.filter(isTaskComplete);

    taskList.querySelectorAll('.task-card').forEach((card) => card.classList.remove('error'));
    groups.actividades.classList.toggle('error', completedTasks.length === 0);

    if (!completedTasks.length) {
        return {
            isValid: false,
            message: 'Complete al menos una tarea con check, detalle, foto y subtitulo.'
        };
    }

    const incompleteTask = startedTasks.find((task) => !isTaskComplete(task));

    if (incompleteTask) {
        const card = getTaskCard(incompleteTask.id);

        if (card) {
            card.classList.add('error');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        return {
            isValid: false,
            message: 'Hay una tarea iniciada incompleta. Agregue detalle, foto y subtitulo, o quite esa tarea.'
        };
    }

    return { isValid: true, message: '' };
}

function setFieldError(name, hasError) {
    if (!groups[name] || !fields[name]) {
        return;
    }

    groups[name].classList.toggle('error', hasError);
    fields[name].setAttribute('aria-invalid', String(hasError));
}

function buildReportText() {
    const report = getReportData();

    if (!validateReport(report)) {
        return '';
    }

    return [
        'INFORME TECNICO DE INTERVENCION - URBAPARK',
        '',
        `Fecha de guardado: ${report.fechaGuardado ? formatDateTime(report.fechaGuardado) : 'Pendiente hasta guardar informe'}`,
        ...getGeneralDetailItems(report).flatMap(([label, value]) => [`${label}: ${value}`]),
        '',
        'INFORME DEL INCIDENTE / REQUERIMIENTO',
        report.incidente,
        '',
        'ACTIVIDADES REALIZADAS',
        formatActivityTasksAsText(report.actividades),
        '',
        'SOLUCION REALIZADA',
        report.solucion,
        '',
        'OBSERVACIONES',
        report.observaciones || 'No especificado',
        '',
        'CONCLUSIONES',
        report.conclusiones
    ].join('\n');
}

function formatActivityTasksAsText(activityTasks) {
    return activityTasks.map((task, index) => [
        `Tarea ${index + 1}:`,
        task.description,
        ...task.photos.map((photo, photoIndex) => `Foto ${photoIndex + 1}: ${photo.caption}`)
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
    lastGeneratedAt = new Date();
    const report = getReportData();

    if (!validateReport(report)) {
        lastGeneratedAt = null;
        return;
    }

    renderPreview();

    const fileName = `informe-urbapark-${formatFileDate(report.fechaGuardado)}.html`;
    const blob = new Blob([buildReportHtml(report)], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);

    setStatus('Informe guardado en HTML con logo, colores y fotos incluidas.');
}

function buildReportHtml(report) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Informe tecnico de intervencion UrbaPark</title>
    <style>
        body { color: #1f2a2e; font-family: Arial, sans-serif; margin: 32px; }
        .header { align-items: center; border-bottom: 5px solid #f15a24; display: flex; gap: 24px; padding-bottom: 18px; }
        .header img { max-width: 220px; width: 32%; }
        h1 { color: #179bd7; margin: 0 0 6px; }
        h2 { border-bottom: 1px solid #d8e5eb; color: #0b74a9; font-size: 16px; margin-top: 28px; padding-bottom: 6px; text-transform: uppercase; }
        p { line-height: 1.55; white-space: pre-wrap; }
        .details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 18px; }
        .details div { background: #f4f8fb; border-left: 3px solid #179bd7; padding: 10px 12px; }
        dt { color: #62727b; font-size: 12px; font-weight: 700; text-transform: uppercase; }
        dd { font-weight: 700; margin: 4px 0 0; }
        .task { border: 1px solid #d8e5eb; border-left: 4px solid #f15a24; border-radius: 6px; margin: 12px 0; padding: 14px; break-inside: avoid; }
        .photos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
        figure { border: 1px solid #d8e5eb; border-radius: 6px; margin: 0; overflow: hidden; break-inside: avoid; }
        img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
        figcaption { color: #1f2a2e; font-size: 13px; font-weight: 700; padding: 8px 9px; }
    </style>
</head>
<body>
    <section class="header">
        <img src="${PUBLIC_LOGO_SRC}" alt="UrbaPark">
        <div>
            <h1>Informe tecnico de intervencion</h1>
            <p>Fecha de guardado: ${escapeHtml(formatDateTime(report.fechaGuardado))}</p>
        </div>
    </section>
    <section class="details">
        ${getGeneralDetailItems(report).map(([label, value]) => `
            <div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>
        `).join('')}
    </section>
    <h2>Informe del incidente / requerimiento</h2>
    <p>${escapeHtml(report.incidente)}</p>
    <h2>Actividades realizadas</h2>
    ${buildActivityTasksHtml(report.actividades)}
    <h2>Solucion realizada</h2>
    <p>${escapeHtml(report.solucion)}</p>
    <h2>Observaciones</h2>
    <p>${escapeHtml(report.observaciones || 'No especificado')}</p>
    <h2>Conclusiones</h2>
    <p>${escapeHtml(report.conclusiones)}</p>
</body>
</html>`;
}

function buildActivityTasksHtml(activityTasks) {
    return activityTasks.map((task, index) => `
        <section class="task">
            <h3>Tarea ${index + 1}</h3>
            <p>${escapeHtml(task.description)}</p>
            <div class="photos">
                ${task.photos.map((photo, photoIndex) => `
                    <figure>
                        <img src="${photo.dataUrl}" alt="Foto ${photoIndex + 1} de tarea ${index + 1}">
                        <figcaption>${escapeHtml(photo.caption)}</figcaption>
                    </figure>
                `).join('')}
            </div>
        </section>
    `).join('');
}

function updateEstadoInicialOtroVisibility() {
    const isOther = fields.estadoInicial.value === 'Otro';

    groups.estadoInicialOtro.classList.toggle('active', isOther);

    if (!isOther) {
        fields.estadoInicialOtro.value = '';
        setFieldError('estadoInicialOtro', false);
    }
}

function formatDateTime(date) {
    return new Intl.DateTimeFormat('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function formatFileDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}-${hour}${minute}`;
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
