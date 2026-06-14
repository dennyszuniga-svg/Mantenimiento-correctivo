const form = document.getElementById('incidentForm');
const previewSection = document.getElementById('previewSection');
const statusMessage = document.getElementById('statusMessage');

const fields = {
    fecha: document.getElementById('fecha'),
    hora: document.getElementById('hora'),
    incidente: document.getElementById('incidente'),
    actividades: document.getElementById('actividades'),
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

function setDefaultDateTime() {
    const now = new Date();
    fields.fecha.value = formatInputDate(now);
    fields.hora.value = now.toTimeString().slice(0, 5);
}

function resetForm() {
    form.reset();
    setDefaultDateTime();
    Object.keys(groups).forEach((name) => setFieldError(name, false));
    previewSection.classList.remove('active');
    clearStatus();
}

function renderPreview() {
    const report = getReportData();

    if (!validateReport(report)) {
        return false;
    }

    preview.fecha.textContent = `${formatDisplayDate(report.fecha)} - ${report.hora}`;
    preview.incidente.textContent = report.incidente;
    preview.actividades.textContent = report.actividades || 'No especificado';
    preview.solucion.textContent = report.solucion || 'No especificado';
    preview.observaciones.textContent = report.observaciones || 'No especificado';
    preview.conclusiones.textContent = report.conclusiones || 'No especificado';

    previewSection.classList.add('active');
    setStatus('Vista previa actualizada.');
    return true;
}

function getReportData() {
    return Object.fromEntries(
        Object.entries(fields).map(([name, field]) => [name, field.value.trim()])
    );
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
        report.actividades || 'No especificado',
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

async function copyReport() {
    const text = buildReportText();

    if (!text) {
        return;
    }

    try {
        await navigator.clipboard.writeText(text);
        renderPreview();
        setStatus('Informe copiado al portapapeles.');
    } catch (error) {
        setStatus('No se pudo copiar automaticamente. Use la vista previa para copiar el texto.', true);
    }
}

function downloadReport() {
    const text = buildReportText();

    if (!text) {
        return;
    }

    const fileName = `informe-incidente-${fields.fecha.value || 'sin-fecha'}.txt`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);

    renderPreview();
    setStatus('Informe descargado.');
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

function setStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? 'var(--danger)' : 'var(--primary)';
}

function clearStatus() {
    statusMessage.textContent = '';
}
