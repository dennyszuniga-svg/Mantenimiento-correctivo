const form = document.getElementById('incidentForm');
const incidenteGroup = document.getElementById('incidenteGroup');
const incidenteInput = document.getElementById('incidente');
const btnLimpiar = document.getElementById('btnLimpiar');
const btnPrevisualizar = document.getElementById('btnPrevisualizar');
const btnGenerar = document.getElementById('btnGenerar');
const previewSection = document.getElementById('previewSection');

// Establecer fecha actual por defecto
document.getElementById('fecha').valueAsDate = new Date();
document.getElementById('hora').value = new Date().toTimeString().slice(0, 5);

// Validación del campo obligatorio
incidenteInput.addEventListener('input', function() {
    if (this.value.trim()) {
        incidenteGroup.classList.remove('error');
    }
});

// Limpiar formulario
btnLimpiar.addEventListener('click', function() {
    form.reset();
    document.getElementById('fecha').valueAsDate = new Date();
    document.getElementById('hora').value = new Date().toTimeString().slice(0, 5);
    incidenteGroup.classList.remove('error');
    previewSection.classList.remove('active');
});

// Previsualizar informe
btnPrevisualizar.addEventListener('click', function() {
    if (!incidenteInput.value.trim()) {
        incidenteGroup.classList.add('error');
        incidenteInput.focus();
        return;
    }

    const fecha = document.getElementById('fecha').value;
    const hora = document.getElementById('hora').value;
    
    document.getElementById('previewFecha').textContent = 
        fecha && hora ? `${formatDate(fecha)} - ${hora}` : '-';
    document.getElementById('previewIncidente').textContent = 
        incidenteInput.value || '-';
    document.getElementById('previewActividades').textContent = 
        document.getElementById('actividades').value || 'No especificado';
    document.getElementById('previewSolucion').textContent = 
        document.getElementById('solucion').value || 'No especificado';
    document.getElementById('previewObservaciones').textContent = 
        document.getElementById('observaciones').value || 'No especificado';
    document.getElementById('previewConclusiones').textContent = 
        document.getElementById('conclusiones').value || 'No especificado';

    previewSection.classList.add('active');
    previewSection.scrollIntoView({ behavior: 'smooth' });
});

// Generar informe
form.addEventListener('submit', function(e) {
    e.preventDefault();

    if (!incidenteInput.value.trim()) {
        incidenteGroup.classList.add('error');
        incidenteInput.focus();
        return;
    }

    // Mostrar previsualización antes de imprimir
    btnPrevisualizar.click();

    // Esperar un momento y luego imprimir
    setTimeout(() => {
        window.print();
    }, 500);
});

function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}
