const LOGO_SRC = 'assets/urbapark-logo.png';
const PUBLIC_LOGO_SRC = 'https://dennyszuniga-svg.github.io/Mantenimiento-correctivo/assets/urbapark-logo.png';
const DRAFT_KEY = 'urbapark-intervention-draft-v2';
const COUNTER_KEY = 'urbapark-report-counter';
const REPORT_PREFIX = `UP-${new Date().getFullYear()}`;

const form = document.getElementById('incidentForm');
const previewSection = document.getElementById('previewSection');
const statusMessage = document.getElementById('statusMessage');
const taskList = document.getElementById('taskList');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const reportNumberLabel = document.getElementById('reportNumberLabel');

const fields = {
    numeroInforme: document.getElementById('numeroInforme'),
    clienteArea: document.getElementById('clienteArea'),
    personal: document.getElementById('personal'),
    firmaTecnicoNombre: document.getElementById('firmaTecnicoNombre'),
    firmaSupervisorNombre: document.getElementById('firmaSupervisorNombre'),
    sede: document.getElementById('sede'),
    equipo: document.getElementById('equipo'),
    prioridad: document.getElementById('prioridad'),
    tipoMantenimiento: document.getElementById('tipoMantenimiento'),
    estadoInicial: document.getElementById('estadoInicial'),
    estadoInicialOtro: document.getElementById('estadoInicialOtro'),
    horaInicio: document.getElementById('horaInicio'),
    horaFinal: document.getElementById('horaFinal'),
    duracion: document.getElementById('duracion'),
    incidente: document.getElementById('incidente'),
    solucion: document.getElementById('solucion'),
    resultadoFinal: document.getElementById('resultadoFinal'),
    repuestos: document.getElementById('repuestos'),
    observaciones: document.getElementById('observaciones'),
    conclusiones: document.getElementById('conclusiones')
};

const groups = {
    clienteArea: document.getElementById('clienteAreaGroup'),
    personal: document.getElementById('personalGroup'),
    sede: document.getElementById('sedeGroup'),
    equipo: document.getElementById('equipoGroup'),
    prioridad: document.getElementById('prioridadGroup'),
    tipoMantenimiento: document.getElementById('tipoMantenimientoGroup'),
    estadoInicial: document.getElementById('estadoInicialGroup'),
    estadoInicialOtro: document.getElementById('estadoInicialOtroGroup'),
    horaInicio: document.getElementById('horaInicioGroup'),
    horaFinal: document.getElementById('horaFinalGroup'),
    incidente: document.getElementById('incidenteGroup'),
    solucion: document.getElementById('solucionGroup'),
    resultadoFinal: document.getElementById('resultadoFinalGroup'),
    conclusiones: document.getElementById('conclusionesGroup'),
    actividades: document.getElementById('activityTasksGroup'),
    firmaTecnico: document.getElementById('firmaTecnicoGroup'),
    firmaSupervisor: document.getElementById('firmaSupervisorGroup'),
    firmaSupervisorNombre: document.getElementById('firmaSupervisorGroup')
};

const preview = {
    fechaGuardado: document.getElementById('previewFechaGuardado'),
    datosGenerales: document.getElementById('previewDatosGenerales'),
    incidente: document.getElementById('previewIncidente'),
    actividades: document.getElementById('previewActividades'),
    solucion: document.getElementById('previewSolucion'),
    observaciones: document.getElementById('previewObservaciones'),
    conclusiones: document.getElementById('previewConclusiones'),
    firmas: document.getElementById('previewFirmas')
};

let nextTaskId = 1;
let tasks = [];
let reportSequence = 1;
let reportSaved = false;
let lastGeneratedAt = null;
let draftTimer = null;
let signaturePads = {};

initSignaturePads();
initForm();

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
    exportPdf();
});

Object.entries(fields).forEach(([name, field]) => {
    field.addEventListener('input', () => {
        if (groups[name] && field.value.trim()) {
            setFieldError(name, false);
        }

        syncSignatureNames();
        updateComputedFields();
        scheduleDraftSave();
    });
    field.addEventListener('change', () => {
        updateEstadoInicialOtroVisibility();
        syncSignatureNames();
        updateComputedFields();
        scheduleDraftSave();
    });
});

document.querySelectorAll('[data-clear-signature]').forEach((button) => {
    button.addEventListener('click', () => {
        const id = button.dataset.clearSignature;
        signaturePads[id].clear();
        if (id === 'firmaSupervisor') {
            fields.horaFinal.value = '';
            updateDuration();
        }
        setFieldError(id, false);
        scheduleDraftSave();
    });
});

taskList.addEventListener('change', async (event) => {
    const task = getTaskFromEvent(event);

    if (!task) {
        return;
    }

    if (event.target.dataset.action === 'toggle-task') {
        task.done = event.target.checked;
        renderTasks();
        updateProgress();
        scheduleDraftSave();
        clearStatus();
    }

    if (event.target.dataset.action === 'task-photos') {
        const photos = await readImageFiles([...event.target.files]);
        task.photos.push(...photos);
        renderTasks();
        updateProgress();
        scheduleDraftSave();
        setStatus(`${photos.length} foto${photos.length === 1 ? '' : 's'} agregada${photos.length === 1 ? '' : 's'}. Complete tipo y subtitulo.`);
    }

    if (event.target.dataset.action === 'photo-stage') {
        const photo = task.photos.find((item) => item.id === Number(event.target.dataset.photoId));

        if (photo) {
            photo.stage = event.target.value;
            if (ensureNextTaskIfReady(task)) {
                renderTasks();
            }
            updateProgress();
            scheduleDraftSave();
            clearStatus();
        }
    }
});

taskList.addEventListener('input', (event) => {
    const task = getTaskFromEvent(event);

    if (!task) {
        return;
    }

    if (event.target.dataset.action === 'task-description') {
        task.description = event.target.value;
        if (ensureNextTaskIfReady(task)) {
            renderTasks();
        }
    }

    if (event.target.dataset.action === 'photo-caption') {
        const photo = task.photos.find((item) => item.id === Number(event.target.dataset.photoId));

        if (photo) {
            photo.caption = event.target.value;
            if (ensureNextTaskIfReady(task)) {
                renderTasks();
            }
        }
    }

    updateProgress();
    scheduleDraftSave();
    clearStatus();
});

taskList.addEventListener('click', (event) => {
    const task = getTaskFromEvent(event);

    if (!task) {
        return;
    }

    if (event.target.dataset.action === 'remove-task') {
        tasks = tasks.filter((item) => item.id !== task.id);
        renderTasks();
    }

    if (event.target.dataset.action === 'remove-photo') {
        task.photos = task.photos.filter((photo) => photo.id !== Number(event.target.dataset.photoId));
        renderTasks();
    }

    updateProgress();
    scheduleDraftSave();
    clearStatus();
});

function initForm() {
    const draft = readDraft();

    if (draft) {
        applyDraft(draft);
    } else {
        startNewReport();
    }

    renderTasks();
    updateEstadoInicialOtroVisibility();
    syncSignatureNames();
    updateComputedFields();
}

function startNewReport() {
    reportSequence = getStoredCounter() + 1;
    reportSaved = false;
    fields.numeroInforme.value = formatReportNumber(reportSequence);
    reportNumberLabel.textContent = `Informe ${fields.numeroInforme.value}`;
    setDefaultTimes();
    syncSignatureNames();
    tasks = [];
    nextTaskId = 1;
    createTask();
    lastGeneratedAt = null;
}

function applyDraft(draft) {
    Object.entries(draft.fields || {}).forEach(([name, value]) => {
        if (fields[name]) {
            fields[name].value = value;
        }
    });
    reportSequence = draft.reportSequence || getStoredCounter() + 1;
    reportSaved = Boolean(draft.reportSaved);
    fields.numeroInforme.value = draft.reportNumber || formatReportNumber(reportSequence);
    reportNumberLabel.textContent = `Informe ${fields.numeroInforme.value}`;
    syncSignatureNames();
    tasks = draft.tasks?.length ? draft.tasks : [];
    nextTaskId = Math.max(0, ...tasks.map((task) => task.id || 0)) + 1;

    if (!tasks.length) {
        createTask();
    }

    if (draft.signatures?.firmaTecnico) {
        signaturePads.firmaTecnico.load(draft.signatures.firmaTecnico);
    }

    if (draft.signatures?.firmaSupervisor) {
        signaturePads.firmaSupervisor.load(draft.signatures.firmaSupervisor);
    }
}

function setDefaultTimes() {
    if (!fields.horaInicio.value) {
        fields.horaInicio.value = new Date().toTimeString().slice(0, 5);
    }
}

function syncSignatureNames() {
    fields.firmaTecnicoNombre.value = fields.personal.value.trim();
}

function resetForm() {
    form.reset();
    clearDraft();
    Object.keys(groups).forEach((name) => setFieldError(name, false));
    groups.actividades.classList.remove('error');
    signaturePads.firmaTecnico.clear();
    signaturePads.firmaSupervisor.clear();
    startNewReport();
    renderTasks();
    updateEstadoInicialOtroVisibility();
    updateComputedFields();
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
                    <textarea id="taskDescription${task.id}" data-action="task-description" placeholder="Describa lo que se realiz&oacute; en esta tarea.">${escapeHtml(task.description)}</textarea>
                </div>
                <div class="photo-controls">
                    <div>
                        <label for="taskPhotos${task.id}">Evidencia fotogr&aacute;fica</label>
                        <label class="camera-button" for="taskPhotos${task.id}">Tomar foto</label>
                        <input class="camera-input" type="file" id="taskPhotos${task.id}" data-action="task-photos" accept="image/jpeg,image/png,image/webp,image/gif" capture="environment" multiple>
                    </div>
                </div>
                <div class="photo-list" id="photoList${task.id}" aria-label="Fotos agregadas a la tarea ${index + 1}"></div>
            </div>
        </article>
    `).join('');

    tasks.forEach(renderPhotoList);
}

function renderPhotoList(task) {
    const photoList = document.getElementById(`photoList${task.id}`);

    photoList.innerHTML = '';

    task.photos.forEach((photo, index) => {
        const item = document.createElement('figure');
        item.className = 'photo-thumb';
        item.innerHTML = `
            <img src="${photo.dataUrl}" alt="${escapeHtml(photo.caption || `Foto ${index + 1}`)}">
            <figcaption class="photo-body">
                <div class="photo-meta">
                    <span>${escapeHtml(photo.name)}</span>
                    <button type="button" class="photo-remove" data-action="remove-photo" data-photo-id="${photo.id}">Quitar</button>
                </div>
                <select data-action="photo-stage" data-photo-id="${photo.id}" aria-label="Tipo de foto ${index + 1}">
                    <option value="">Antes / Durante / Despu&eacute;s</option>
                    <option value="Antes" ${photo.stage === 'Antes' ? 'selected' : ''}>Antes</option>
                    <option value="Durante" ${photo.stage === 'Durante' ? 'selected' : ''}>Durante</option>
                    <option value="Despu&eacute;s" ${photo.stage === 'Despu&eacute;s' ? 'selected' : ''}>Despu&eacute;s</option>
                </select>
                <input type="text" value="${escapeHtml(photo.caption)}" placeholder="Subtitulo obligatorio de la foto" data-action="photo-caption" data-photo-id="${photo.id}" aria-label="Subtitulo de foto ${index + 1}">
                <span class="photo-meta">Tomada: ${formatDateTime(new Date(photo.capturedAt))}</span>
            </figcaption>
        `;
        photoList.append(item);
    });
}

function getTaskFromEvent(event) {
    const card = event.target.closest('.task-card');
    return card ? tasks.find((task) => task.id === Number(card.dataset.taskId)) : null;
}

function ensureNextTaskIfReady(task) {
    if (tasks[tasks.length - 1]?.id === task.id && isTaskComplete(task)) {
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
        && task.photos.every((photo) => photo.caption.trim() && photo.stage);
}

function isTaskStarted(task) {
    return task.done || Boolean(task.description.trim()) || task.photos.length > 0;
}

async function readImageFiles(files) {
    const imageFiles = files.filter((file) => (
        ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)
    ));

    return Promise.all(imageFiles.map(async (file) => ({
        id: Date.now() + Math.floor(Math.random() * 100000),
        name: file.name,
        caption: '',
        stage: '',
        capturedAt: new Date().toISOString(),
        dataUrl: await compressImage(file)
    })));
}

function compressImage(file, maxSize = 1600, quality = 0.72) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const image = new Image();

            image.onload = () => {
                const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(image.width * scale);
                canvas.height = Math.round(image.height * scale);
                canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            image.onerror = reject;
            image.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
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
    renderSignatures(report);

    previewSection.classList.add('active');
    setStatus('Vista previa actualizada. El informe ya puede guardarse.');
    return true;
}

function renderGeneralDetails(report) {
    preview.datosGenerales.innerHTML = '';
    getGeneralDetailItems(report).forEach(([label, value]) => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`;
        preview.datosGenerales.append(wrapper);
    });
}

function getGeneralDetailItems(report) {
    return [
        ['Nro. informe', report.numeroInforme],
        ['Cliente / area', report.clienteArea],
        ['Personal', report.personal],
        ['Nombre firma tecnico', report.firmaTecnicoNombre],
        ['Supervisor / administrador', report.firmaSupervisorNombre],
        ['Sede', report.sede],
        ['Equipo', report.equipo],
        ['Prioridad', report.prioridad],
        ['Tipo de mantenimiento', report.tipoMantenimiento],
        ['Estado inicial', report.estadoInicialTexto],
        ['Hora de inicio', report.horaInicio],
        ['Hora final', report.horaFinal],
        ['Duracion', report.duracion],
        ['Resultado final', report.resultadoFinal],
        ['Repuestos utilizados', report.repuestos || 'No especificado']
    ];
}

function renderReportTasks(activityTasks) {
    preview.actividades.innerHTML = '';
    activityTasks.forEach((task, index) => {
        const article = document.createElement('article');
        article.className = 'report-task';
        article.innerHTML = `<h4>Tarea ${index + 1}</h4><p>${escapeHtml(task.description)}</p>`;
        const photoList = document.createElement('div');
        photoList.className = 'report-photo-list';

        task.photos.forEach((photo, photoIndex) => {
            const figure = document.createElement('figure');
            figure.className = 'report-photo';
            figure.innerHTML = `
                <img src="${photo.dataUrl}" alt="Foto ${photoIndex + 1} de tarea ${index + 1}">
                <figcaption>${escapeHtml(photo.stage)} - ${escapeHtml(photo.caption)}<br><small>${formatDateTime(new Date(photo.capturedAt))}</small></figcaption>
            `;
            photoList.append(figure);
        });

        article.append(photoList);
        preview.actividades.append(article);
    });
}

function renderSignatures(report) {
    preview.firmas.innerHTML = `
        <figure class="report-signature">
            <img src="${report.firmaTecnico}" alt="Firma del tecnico">
            <p>Firma del t&eacute;cnico<br><span>${escapeHtml(report.firmaTecnicoNombre)}</span></p>
        </figure>
        <figure class="report-signature">
            <img src="${report.firmaSupervisor}" alt="Firma del supervisor">
            <p>Firma del supervisor o administrador de turno<br><span>${escapeHtml(report.firmaSupervisorNombre)}</span></p>
        </figure>
    `;
}

function getReportData() {
    const estadoInicialTexto = fields.estadoInicial.value === 'Otro'
        ? `Otro: ${fields.estadoInicialOtro.value.trim()}`
        : fields.estadoInicial.value.trim();
    syncSignatureNames();

    return {
        ...Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, field.value.trim()])),
        firmaTecnicoNombre: fields.personal.value.trim(),
        estadoInicialTexto,
        fechaGuardado: lastGeneratedAt,
        actividades: getCompletedTasks(),
        firmaTecnico: signaturePads.firmaTecnico.toDataUrl(),
        firmaSupervisor: signaturePads.firmaSupervisor.toDataUrl()
    };
}

function getCompletedTasks() {
    return tasks
        .filter(isTaskComplete)
        .map((task) => ({
            description: task.description.trim(),
            photos: task.photos.map((photo) => ({
                name: photo.name,
                caption: photo.caption.trim(),
                stage: photo.stage,
                capturedAt: photo.capturedAt,
                dataUrl: photo.dataUrl
            }))
        }));
}

function validateReport(report) {
    const requiredFields = [
        'clienteArea',
        'personal',
        'firmaSupervisorNombre',
        'sede',
        'equipo',
        'prioridad',
        'tipoMantenimiento',
        'estadoInicial',
        'horaInicio',
        'horaFinal',
        'incidente',
        'solucion',
        'resultadoFinal',
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

    const durationValid = !report.horaInicio || !report.horaFinal || calculateDuration(report.horaInicio, report.horaFinal).minutes >= 0;
    setFieldError('horaFinal', !durationValid);
    isValid = isValid && durationValid;

    const taskValidation = validateTasks();
    isValid = isValid && taskValidation.isValid;

    const hasTecnico = !signaturePads.firmaTecnico.isEmpty();
    const hasSupervisor = !signaturePads.firmaSupervisor.isEmpty();
    setFieldError('firmaTecnico', !hasTecnico);
    setFieldError('firmaSupervisor', !hasSupervisor);
    isValid = isValid && hasTecnico && hasSupervisor;

    if (!isValid) {
        const firstInvalid = requiredFields.find((name) => !report[name])
            || (needsEstadoOtro && !report.estadoInicialOtro ? 'estadoInicialOtro' : null);
        if (firstInvalid) fields[firstInvalid].focus();
        setStatus(taskValidation.message || 'Complete todos los campos obligatorios, firmas y tiempos antes de guardar.', true);
        return false;
    }

    return true;
}

function validateTasks() {
    const startedTasks = tasks.filter(isTaskStarted);
    const completedTasks = tasks.filter(isTaskComplete);

    taskList.querySelectorAll('.task-card').forEach((card) => card.classList.remove('error'));
    groups.actividades.classList.toggle('error', completedTasks.length === 0);

    const incompleteTask = startedTasks.find((task) => !isTaskComplete(task));
    if (!completedTasks.length && !incompleteTask) {
        return { isValid: false, message: 'Complete al menos una tarea con check, detalle, foto, tipo y subtítulo.' };
    }

    if (incompleteTask) {
        const taskNumber = tasks.findIndex((task) => task.id === incompleteTask.id) + 1;
        const message = getTaskValidationMessage(incompleteTask, taskNumber);
        const card = taskList.querySelector(`[data-task-id="${incompleteTask.id}"]`);
        if (card) {
            card.classList.add('error');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return { isValid: false, message };
    }

    return { isValid: true, message: '' };
}

function getTaskValidationMessage(task, taskNumber) {
    if (!task.done) return `Falta marcar el check de Tarea ${taskNumber}.`;
    if (!task.description.trim()) return `Falta describir lo realizado en Tarea ${taskNumber}.`;
    if (!task.photos.length) return `Falta tomar foto en Tarea ${taskNumber}.`;
    const missingStage = task.photos.findIndex((photo) => !photo.stage);
    if (missingStage >= 0) return `Falta seleccionar Antes/Durante/Después en foto ${missingStage + 1} de Tarea ${taskNumber}.`;
    const missingCaption = task.photos.findIndex((photo) => !photo.caption.trim());
    if (missingCaption >= 0) return `Falta subtítulo en foto ${missingCaption + 1} de Tarea ${taskNumber}.`;
    return `Tarea ${taskNumber} está incompleta.`;
}

function buildReportText() {
    const report = getReportData();
    if (!validateReport(report)) return '';

    return [
        'INFORME TECNICO DE INTERVENCION - URBAPARK',
        '',
        `Fecha de guardado: ${report.fechaGuardado ? formatDateTime(report.fechaGuardado) : 'Pendiente hasta guardar informe'}`,
        ...getGeneralDetailItems(report).map(([label, value]) => `${label}: ${value}`),
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
        ...task.photos.map((photo, photoIndex) => `Foto ${photoIndex + 1}: ${photo.stage} - ${photo.caption} (${formatDateTime(new Date(photo.capturedAt))})`)
    ].join('\n')).join('\n\n');
}

async function copyReport() {
    const text = buildReportText();
    if (!text) return;

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
    markReportSaved();

    const fileName = `${report.numeroInforme.toLowerCase()}-${formatFileDate(report.fechaGuardado)}.html`;
    const blob = new Blob([buildReportHtml(report)], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    setStatus('Informe guardado en HTML con logo, colores, firmas y fotos comprimidas.');
}

function exportPdf() {
    lastGeneratedAt = new Date();
    if (!renderPreview()) {
        lastGeneratedAt = null;
        return;
    }
    markReportSaved();
    setStatus('Vista lista. En la ventana de impresion seleccione Guardar como PDF.');
    window.print();
}

function buildReportHtml(report) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${escapeHtml(report.numeroInforme)} - Informe tecnico UrbaPark</title>
    <style>
        * { box-sizing: border-box; }
        body { color: #1f2a2e; font-family: Arial, sans-serif; font-size: 12px; margin: 18px; }
        .header { align-items: center; border-bottom: 5px solid #f15a24; display: flex; gap: 24px; padding-bottom: 18px; }
        .header img { display: block; flex: 0 0 280px; height: auto; max-height: 86px; max-width: 280px; object-fit: contain; width: 280px; }
        h1 { color: #179bd7; margin: 0 0 6px; }
        h2 { border-bottom: 1px solid #d8e5eb; color: #0b74a9; font-size: 13px; margin: 14px 0 8px; padding-bottom: 5px; text-transform: uppercase; }
        p { line-height: 1.38; margin: 0 0 8px; white-space: pre-wrap; }
        .text-block { background: #f4f8fb; border-left: 4px solid #f15a24; padding: 8px 10px; }
        .details { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; margin-top: 12px; }
        .details div { background: #f4f8fb; border-left: 3px solid #179bd7; min-height: 0; padding: 7px 9px; break-inside: auto; page-break-inside: auto; }
        dt { color: #62727b; font-size: 10px; font-weight: 700; text-transform: uppercase; }
        dd { font-weight: 700; margin: 4px 0 0; white-space: pre-wrap; }
        .task { border: 1px solid #d8e5eb; border-left: 4px solid #f15a24; border-radius: 6px; margin: 8px 0; padding: 10px; break-inside: auto; page-break-inside: auto; }
        .photos, .signatures { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
        figure { border: 1px solid #d8e5eb; border-radius: 6px; margin: 0; overflow: hidden; break-inside: avoid; }
        .photos img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
        figcaption { color: #1f2a2e; font-size: 11px; font-weight: 700; padding: 7px 8px; }
        .signature img { background: #fff; display: block; height: 105px; object-fit: contain; width: 100%; }
        @media print { body { margin: 12mm; } h2 { break-after: avoid; page-break-after: avoid; } .details { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width: 700px) { .header { align-items: flex-start; flex-direction: column; } .header img { flex-basis: auto; width: 240px; } .details { grid-template-columns: repeat(2, minmax(0, 1fr)); } .photos, .signatures { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <section class="header">
        <img src="${PUBLIC_LOGO_SRC}" alt="UrbaPark">
        <div>
            <h1>Informe tecnico de intervencion</h1>
            <p>${escapeHtml(report.numeroInforme)}<br>Fecha de guardado: ${escapeHtml(formatDateTime(report.fechaGuardado))}</p>
        </div>
    </section>
    <section class="details">${getGeneralDetailItems(report).map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</section>
    <h2>Informe del incidente / requerimiento</h2><p>${escapeHtml(report.incidente)}</p>
    <h2>Actividades realizadas</h2>${buildActivityTasksHtml(report.actividades)}
    <h2>Solucion realizada</h2><p>${escapeHtml(report.solucion)}</p>
    <h2>Resultado final</h2><p class="text-block">${escapeHtml(report.resultadoFinal)}</p>
    <h2>Repuestos utilizados</h2><p class="text-block">${escapeHtml(report.repuestos || 'No especificado')}</p>
    <h2>Observaciones</h2><p>${escapeHtml(report.observaciones || 'No especificado')}</p>
    <h2>Conclusiones</h2><p>${escapeHtml(report.conclusiones)}</p>
    <h2>Firmas</h2>
    <section class="signatures">
        <figure class="signature"><img src="${report.firmaTecnico}" alt="Firma tecnico"><figcaption>Firma del tecnico<br>${escapeHtml(report.firmaTecnicoNombre)}</figcaption></figure>
        <figure class="signature"><img src="${report.firmaSupervisor}" alt="Firma supervisor o administrador de turno"><figcaption>Firma del supervisor o administrador de turno<br>${escapeHtml(report.firmaSupervisorNombre)}</figcaption></figure>
    </section>
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
                        <figcaption>${escapeHtml(photo.stage)} - ${escapeHtml(photo.caption)}<br><small>${formatDateTime(new Date(photo.capturedAt))}</small></figcaption>
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

function updateComputedFields() {
    updateDuration();
    updateProgress();
}

function updateDuration() {
    const result = calculateDuration(fields.horaInicio.value, fields.horaFinal.value);
    fields.duracion.value = result.label;
}

function calculateDuration(start, end) {
    if (!start || !end) return { minutes: null, label: 'Pendiente' };
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    const minutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    if (minutes < 0) return { minutes, label: 'Hora final menor que inicio' };
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return { minutes, label: `${hours} h ${rest} min` };
}

function updateProgress() {
    const checks = [
        fields.clienteArea.value.trim(),
        fields.personal.value.trim(),
        fields.firmaSupervisorNombre.value.trim(),
        fields.sede.value.trim(),
        fields.equipo.value.trim(),
        fields.prioridad.value,
        fields.tipoMantenimiento.value,
        fields.estadoInicial.value && (fields.estadoInicial.value !== 'Otro' || fields.estadoInicialOtro.value.trim()),
        fields.horaInicio.value,
        fields.horaFinal.value && calculateDuration(fields.horaInicio.value, fields.horaFinal.value).minutes >= 0,
        fields.incidente.value.trim(),
        tasks.some(isTaskComplete),
        fields.solucion.value.trim(),
        fields.resultadoFinal.value,
        fields.conclusiones.value.trim(),
        !signaturePads.firmaTecnico.isEmpty(),
        !signaturePads.firmaSupervisor.isEmpty()
    ];
    const percent = Math.round((checks.filter(Boolean).length / checks.length) * 100);
    progressBar.style.width = `${percent}%`;
    progressText.textContent = `Datos ${percent}% completos`;
    reportNumberLabel.textContent = `Informe ${fields.numeroInforme.value || '-'}`;
}

function setFieldError(name, hasError) {
    if (!groups[name]) return;
    groups[name].classList.toggle('error', hasError);
    if (fields[name]) {
        fields[name].setAttribute('aria-invalid', String(hasError));
    }
}

function initSignaturePads() {
    signaturePads = {
        firmaTecnico: createSignaturePad(document.getElementById('firmaTecnico')),
        firmaSupervisor: createSignaturePad(document.getElementById('firmaSupervisor'))
    };
}

function createSignaturePad(canvas) {
    const context = canvas.getContext('2d');
    let drawing = false;
    let empty = true;

    context.lineWidth = 2;
    context.lineCap = 'round';
    context.strokeStyle = '#1f2a2e';

    const getPoint = (event) => {
        const rect = canvas.getBoundingClientRect();
        const pointer = event.touches ? event.touches[0] : event;
        return {
            x: (pointer.clientX - rect.left) * (canvas.width / rect.width),
            y: (pointer.clientY - rect.top) * (canvas.height / rect.height)
        };
    };

    const start = (event) => {
        event.preventDefault();
        drawing = true;
        const point = getPoint(event);
        context.beginPath();
        context.moveTo(point.x, point.y);
    };
    const move = (event) => {
        if (!drawing) return;
        event.preventDefault();
        const point = getPoint(event);
        context.lineTo(point.x, point.y);
        context.stroke();
        empty = false;
    };
    const stop = () => {
        const completedStroke = drawing && !empty;
        drawing = false;
        if (completedStroke && canvas.id === 'firmaSupervisor') {
            setFinalTimeFromSignature();
        }
        scheduleDraftSave();
        updateProgress();
    };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', stop);

    return {
        clear() {
            context.clearRect(0, 0, canvas.width, canvas.height);
            empty = true;
            updateProgress();
        },
        isEmpty() {
            return empty;
        },
        toDataUrl() {
            return canvas.toDataURL('image/png');
        },
        load(dataUrl) {
            if (!dataUrl) return;
            const image = new Image();
            image.onload = () => {
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                empty = false;
                updateProgress();
            };
            image.src = dataUrl;
        }
    };
}

function setFinalTimeFromSignature() {
    fields.horaFinal.value = formatTimeInput(new Date());
    setFieldError('horaFinal', false);
    updateDuration();
}

function scheduleDraftSave() {
    window.clearTimeout(draftTimer);
    draftTimer = window.setTimeout(saveDraft, 250);
}

function saveDraft() {
    const draft = {
        reportSequence,
        reportNumber: fields.numeroInforme.value,
        reportSaved,
        fields: Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, field.value])),
        tasks,
        signatures: {
            firmaTecnico: signaturePads.firmaTecnico.isEmpty() ? '' : signaturePads.firmaTecnico.toDataUrl(),
            firmaSupervisor: signaturePads.firmaSupervisor.isEmpty() ? '' : signaturePads.firmaSupervisor.toDataUrl()
        }
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    updateProgress();
}

function readDraft() {
    try {
        return JSON.parse(localStorage.getItem(DRAFT_KEY));
    } catch (error) {
        return null;
    }
}

function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
}

function markReportSaved() {
    if (!reportSaved) {
        localStorage.setItem(COUNTER_KEY, String(Math.max(getStoredCounter(), reportSequence)));
        reportSaved = true;
        saveDraft();
    }
}

function getStoredCounter() {
    return Number(localStorage.getItem(COUNTER_KEY) || 0);
}

function formatReportNumber(sequence) {
    return `${REPORT_PREFIX}-${String(sequence).padStart(4, '0')}`;
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

function formatTimeInput(date) {
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${hour}:${minute}`;
}

function escapeHtml(value) {
    return String(value ?? '')
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
