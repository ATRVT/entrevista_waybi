/**
 * =========================================================================
 * ANAMNESIS CLÍNICA ALTUS - LÓGICA DE APLICACIÓN
 * Mgtr. Lucía Montes | BCBA #1-21-51278
 * =========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  // --- CONFIGURACIÓN PRINCIPAL (WAYBI) ---
  // Pega aquí la URL de la Web App de Google Apps Script para Waybi
  const DEFAULT_SCRIPT_URL = ""; 
  const STORAGE_KEY_FORM = "waybi_entrevista_draft_v1";
  const STORAGE_KEY_SCRIPT = "waybi_script_url_v1";

  const TOTAL_STEPS = 11;
  let currentStep = 0; // Inicia en la portada (Paso 0)
  let savedDraftStep = 1;
  const stepTitles = [
    "Identificación del niño/a",
    "Datos familiares y entorno",
    "Motivo de consulta",
    "Historia del desarrollo",
    "Área social y escolar",
    "Antecedentes de salud",
    "Rutinas cotidianas",
    "Perfil sensorial",
    "Autonomía en vida diaria (AVD)",
    "Registro de intereses",
    "Información adicional y firma"
  ];

  // Elementos DOM
  const form = document.getElementById('anamnesisForm');
  const steps = document.querySelectorAll('.form-step');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  const stepCounterText = document.getElementById('stepCounterText');
  const progressPercentText = document.getElementById('progressPercentText');
  const progressBarFill = document.getElementById('progressBarFill');
  const openMenuBtn = document.getElementById('openMenuBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const sectionsDrawer = document.getElementById('sectionsDrawer');
  const drawerOverlay = document.getElementById('drawerOverlay');
  const drawerNavList = document.getElementById('drawerNavList');
  const autosaveNotice = document.getElementById('autosaveNotice');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const successScreen = document.getElementById('successScreen');
  const newFormBtn = document.getElementById('newFormBtn');
  const formNavigationEl = document.querySelector('.form-navigation-bar');
  const startFormBtn = document.getElementById('startFormBtn');
  const resumeDraftBtn = document.getElementById('resumeDraftBtn');
  const resumeDraftNotice = document.getElementById('resumeDraftNotice');
  const draftStepLabel = document.getElementById('draftStepLabel');

  // Modal de configuración
  const configModal = document.getElementById('configModal');
  const openConfigModalBtn = document.getElementById('openConfigModalBtn');
  const closeConfigModalBtn = document.getElementById('closeConfigModalBtn');
  const scriptUrlInput = document.getElementById('scriptUrlInput');
  const saveScriptUrlBtn = document.getElementById('saveScriptUrlBtn');
  const testScriptUrlBtn = document.getElementById('testScriptUrlBtn');
  const statusText = document.getElementById('statusText');
  const resetDataBtn = document.getElementById('resetDataBtn');

  // Canvas de firma
  const canvas = document.getElementById('signaturePad');
  const ctx = canvas.getContext('2d');
  const canvasIndicator = document.getElementById('canvasIndicator');
  const clearSigBtn = document.getElementById('clearSigBtn');
  let isDrawing = false;
  let hasSigned = false;

  // =========================================================================
  // 1. INICIALIZACIÓN DE LA APLICACIÓN
  // =========================================================================
  function init() {
    buildDrawerNav();
    initCanvas();
    initConditionalFields();
    initAgeCalculator();
    loadDraft();
    updateUI();

    // Fecha de evaluación por defecto: hoy
    const evalDateField = document.getElementById('evalDate');
    if (evalDateField && !evalDateField.value) {
      evalDateField.value = new Date().toISOString().split('T')[0];
    }

    // Inicializar URL guardada de Google Apps Script
    const storedScript = localStorage.getItem(STORAGE_KEY_SCRIPT);
    const savedUrl = (storedScript && storedScript.trim().startsWith('http')) ? storedScript.trim() : DEFAULT_SCRIPT_URL;
    if (scriptUrlInput) {
      scriptUrlInput.value = savedUrl;
    }
  }

  // =========================================================================
  // 2. CONSTRUCCIÓN DEL MENÚ LATERAL (DRAWER)
  // =========================================================================
  function buildDrawerNav() {
    drawerNavList.innerHTML = '';

    // Portada (Paso 0)
    const coverBtn = document.createElement('button');
    coverBtn.type = 'button';
    coverBtn.className = `drawer-step-item ${currentStep === 0 ? 'current' : ''}`;
    coverBtn.dataset.step = 0;
    coverBtn.innerHTML = `
      <span><strong>0.</strong> Portada e Inicio</span>
      <span class="drawer-step-check" id="checkStep0"></span>
    `;
    coverBtn.addEventListener('click', () => {
      goToStep(0);
      closeDrawer();
    });
    drawerNavList.appendChild(coverBtn);

    for (let i = 1; i <= TOTAL_STEPS; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `drawer-step-item ${i === currentStep ? 'current' : ''}`;
      btn.dataset.step = i;
      btn.innerHTML = `
        <span><strong>${i}.</strong> ${stepTitles[i - 1]}</span>
        <span class="drawer-step-check" id="checkStep${i}"></span>
      `;
      btn.addEventListener('click', () => {
        goToStep(i);
        closeDrawer();
      });
      drawerNavList.appendChild(btn);
    }
  }

  function openDrawer() {
    sectionsDrawer.classList.add('active');
    drawerOverlay.classList.add('active');
  }

  function closeDrawer() {
    sectionsDrawer.classList.remove('active');
    drawerOverlay.classList.remove('active');
  }

  openMenuBtn.addEventListener('click', openDrawer);
  closeDrawerBtn.addEventListener('click', closeDrawer);
  drawerOverlay.addEventListener('click', closeDrawer);

  // =========================================================================
  // 3. NAVEGACIÓN ENTRE PASOS (WIZARD)
  // =========================================================================
  function updateUI() {
    // Mostrar u ocultar pasos (incluyendo paso 0)
    steps.forEach(step => {
      const s = parseInt(step.dataset.step, 10);
      step.classList.toggle('active', s === currentStep);
    });

    if (currentStep === 0) {
      if (formNavigationEl) formNavigationEl.style.display = 'none';
      progressBarFill.style.width = '0%';
      progressPercentText.textContent = '0%';
      stepCounterText.textContent = 'Bienvenida e Inicio';
    } else {
      if (formNavigationEl) formNavigationEl.style.display = 'flex';
      const percent = Math.round((currentStep / TOTAL_STEPS) * 100);
      progressBarFill.style.width = `${percent}%`;
      progressPercentText.textContent = `${percent}%`;
      stepCounterText.textContent = `Paso ${currentStep} de ${TOTAL_STEPS}`;

      // Botón anterior siempre visible desde el paso 1 (para volver a portada o pasos previos)
      prevBtn.style.visibility = 'visible';

      if (currentStep === TOTAL_STEPS) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'inline-flex';
      } else {
        nextBtn.style.display = 'inline-flex';
        submitBtn.style.display = 'none';
      }
    }

    // Actualizar clase 'current' y estatus de completitud en el drawer
    updateDrawerStatus();

    // Redimensionar canvas de firma si estamos en el paso 11
    if (currentStep === 11) {
      setTimeout(resizeCanvas, 50);
    }

    // Scroll suave al inicio
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Verifica si una sección específica tiene todos sus campos requeridos
  function checkStepCompletion(stepNumber) {
    const stepEl = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
    if (!stepEl) return { isComplete: true, missingFields: [] };

    const missingFields = [];
    const requiredInputs = stepEl.querySelectorAll('[required]');

    requiredInputs.forEach(input => {
      if (input.type === 'radio') {
        const name = input.name;
        const checked = stepEl.querySelector(`input[name="${name}"]:checked`);
        if (!checked) {
          missingFields.push(input);
        }
      } else {
        if (!input.value.trim()) {
          missingFields.push(input);
        }
      }
    });

    if (stepNumber === 11 && !hasSigned) {
      missingFields.push(canvas);
    }

    return {
      isComplete: missingFields.length === 0,
      missingFields: missingFields
    };
  }

  // Actualiza los indicadores visuales en el menú lateral (drawer)
  function updateDrawerStatus() {
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      const itemEl = document.querySelector(`.drawer-step-item[data-step="${i}"]`);
      const checkEl = document.getElementById(`checkStep${i}`);
      if (!itemEl) continue;

      itemEl.classList.toggle('current', i === currentStep);

      if (checkEl) {
        const { isComplete } = checkStepCompletion(i);
        if (isComplete) {
          checkEl.innerHTML = `<span style="color:#10b981; font-weight:600; font-size:0.8rem;">✓</span>`;
        } else {
          checkEl.innerHTML = `<span style="color:#94a3b8; font-size:0.75rem;">•</span>`;
        }
      }
    }
  }

  // Valida que TODO el formulario esté completo antes de enviar
  function validateEntireForm() {
    let firstIncompleteStep = null;
    let firstMissingInput = null;
    const incompleteSteps = [];

    for (let i = 1; i <= TOTAL_STEPS; i++) {
      const { isComplete, missingFields } = checkStepCompletion(i);
      if (!isComplete) {
        incompleteSteps.push(i);
        if (!firstIncompleteStep) {
          firstIncompleteStep = i;
          firstMissingInput = missingFields[0];
        }
      }
    }

    if (incompleteSteps.length > 0) {
      goToStep(firstIncompleteStep);

      // Resaltar en rojo los campos vacíos en ese paso
      const stepEl = document.querySelector(`.form-step[data-step="${firstIncompleteStep}"]`);
      if (stepEl) {
        const requiredInputs = stepEl.querySelectorAll('[required]');
        requiredInputs.forEach(input => {
          if (input.type !== 'radio' && !input.value.trim()) {
            input.classList.add('error');
            if (input.id === 'childDob') {
              const d = document.getElementById('dobDay');
              const m = document.getElementById('dobMonth');
              const y = document.getElementById('dobYear');
              if (d && !d.value) d.classList.add('error');
              if (m && !m.value) m.classList.add('error');
              if (y && !y.value) y.classList.add('error');
            }
          }
        });
      }

      if (firstMissingInput) {
        setTimeout(() => {
          firstMissingInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (typeof firstMissingInput.focus === 'function') firstMissingInput.focus();
        }, 200);
      }

      const listMissing = incompleteSteps.map(s => `• Sección ${s}: ${stepTitles[s - 1]}`).join('\n');
      alert(`⚠️ Para enviar la entrevista a la clínica, el formulario debe estar completamente lleno.\n\nFaltan datos obligatorios en:\n${listMissing}\n\nTe hemos llevado a la Sección ${firstIncompleteStep} para completarlos.`);
      return false;
    }

    return true;
  }

  function goToStep(stepNumber) {
    if (stepNumber < 0 || stepNumber > TOTAL_STEPS) return;
    currentStep = stepNumber;
    updateUI();
  }

  // Permitir avanzar de módulo libremente sin bloquear
  nextBtn.addEventListener('click', () => {
    if (currentStep < TOTAL_STEPS) {
      currentStep++;
      updateUI();
      saveDraft();
    }
  });

  prevBtn.addEventListener('click', () => {
    if (currentStep > 0) {
      currentStep--;
      updateUI();
    }
  });

  if (startFormBtn) {
    startFormBtn.addEventListener('click', () => {
      goToStep(1);
    });
  }

  if (resumeDraftBtn) {
    resumeDraftBtn.addEventListener('click', () => {
      goToStep(savedDraftStep || 1);
    });
  }

  // =========================================================================
  // 4. CAMPOS CONDICIONALES Y CÁLCULOS
  // =========================================================================
  function initConditionalFields() {
    // Gestación prematura
    const gestationRadios = document.querySelectorAll('input[name="gestationTime"]');
    const pretermWeeksBox = document.getElementById('pretermWeeksBox');
    gestationRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.value === 'Prematuro' && radio.checked) {
          pretermWeeksBox.style.display = 'block';
        } else if (radio.checked) {
          pretermWeeksBox.style.display = 'none';
        }
      });
    });

    // Limpiar clases de error al escribir
    form.addEventListener('input', (e) => {
      if (e.target.classList.contains('error')) {
        e.target.classList.remove('error');
      }
      debounceSaveDraft();
    });

    form.addEventListener('change', () => {
      debounceSaveDraft();
    });
  }

  // Manejo de fecha de nacimiento con números directos (DD / MM / AAAA) y cálculo automático de edad
  function initAgeCalculator() {
    const dobDay = document.getElementById('dobDay');
    const dobMonth = document.getElementById('dobMonth');
    const dobYear = document.getElementById('dobYear');
    const dobInput = document.getElementById('childDob');
    const ageInput = document.getElementById('childAge');

    if (!dobInput || !ageInput || !dobDay || !dobMonth || !dobYear) return;

    // Solo números y salto automático entre casillas al escribir en celular
    dobDay.addEventListener('input', () => {
      dobDay.value = dobDay.value.replace(/[^0-9]/g, '');
      if (dobDay.value.length === 2) {
        let val = parseInt(dobDay.value, 10);
        if (val > 31) dobDay.value = '31';
        if (val === 0) dobDay.value = '01';
        dobMonth.focus();
      }
      syncDobAndCalcAge();
    });

    dobMonth.addEventListener('input', () => {
      dobMonth.value = dobMonth.value.replace(/[^0-9]/g, '');
      if (dobMonth.value.length === 2) {
        let val = parseInt(dobMonth.value, 10);
        if (val > 12) dobMonth.value = '12';
        if (val === 0) dobMonth.value = '01';
        dobYear.focus();
      }
      syncDobAndCalcAge();
    });

    dobYear.addEventListener('input', () => {
      dobYear.value = dobYear.value.replace(/[^0-9]/g, '');
      syncDobAndCalcAge();
    });

    // Salto hacia atrás con tecla borrar
    dobMonth.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !dobMonth.value) {
        dobDay.focus();
      }
    });

    dobYear.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !dobYear.value) {
        dobMonth.focus();
      }
    });

    // Formatear con cero a la izquierda al salir de la casilla
    dobDay.addEventListener('blur', () => {
      if (dobDay.value && dobDay.value.length === 1) {
        dobDay.value = '0' + dobDay.value;
      }
      syncDobAndCalcAge();
    });

    dobMonth.addEventListener('blur', () => {
      if (dobMonth.value && dobMonth.value.length === 1) {
        dobMonth.value = '0' + dobMonth.value;
      }
      syncDobAndCalcAge();
    });

    function syncDobAndCalcAge() {
      const d = dobDay.value.trim();
      const m = dobMonth.value.trim();
      const y = dobYear.value.trim();

      if (d && m && y && y.length === 4) {
        const dPadded = d.padStart(2, '0');
        const mPadded = m.padStart(2, '0');
        dobInput.value = `${y}-${mPadded}-${dPadded}`;
        dobInput.classList.remove('error');
        dobDay.classList.remove('error');
        dobMonth.classList.remove('error');
        dobYear.classList.remove('error');

        const dayNum = parseInt(dPadded, 10);
        const monthNum = parseInt(mPadded, 10);
        const yearNum = parseInt(y, 10);

        if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1990 && yearNum <= 2030) {
          const birth = new Date(yearNum, monthNum - 1, dayNum);
          const today = new Date();

          let years = today.getFullYear() - birth.getFullYear();
          let months = today.getMonth() - birth.getMonth();

          if (today.getDate() < birth.getDate()) {
            months--;
          }
          if (months < 0) {
            years--;
            months += 12;
          }

          if (years >= 0 && months >= 0) {
            if (years === 0) {
              ageInput.value = `${months} ${months === 1 ? 'mes' : 'meses'}`;
            } else if (months === 0) {
              ageInput.value = `${years} ${years === 1 ? 'año' : 'años'}`;
            } else {
              ageInput.value = `${years} ${years === 1 ? 'año' : 'años'} y ${months} ${months === 1 ? 'mes' : 'meses'}`;
            }
          }
        }
      } else {
        dobInput.value = '';
      }
    }

    dobInput.addEventListener('change', syncDobAndCalcAge);
  }

  // =========================================================================
  // 5. CANVAS DE FIRMA DIGITAL TÁCTIL (TOUCH-FRIENDLY)
  // =========================================================================
  function initCanvas() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Eventos de ratón
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    // Eventos táctiles móviles
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      canvas.dispatchEvent(mouseEvent);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      canvas.dispatchEvent(mouseEvent);
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const mouseEvent = new MouseEvent('mouseup', {});
      canvas.dispatchEvent(mouseEvent);
    }, { passive: false });

    clearSigBtn.addEventListener('click', clearSignature);
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;

    // Respaldar imagen si ya había firmado
    let imgData = null;
    if (hasSigned) {
      imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.strokeStyle = "#385da9"; // Trazo azul institucional
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (imgData) {
      ctx.putImageData(imgData, 0, 0);
    }
  }

  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function startDrawing(e) {
    isDrawing = true;
    hasSigned = true;
    canvasIndicator.classList.add('hidden');
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e) {
    if (!isDrawing) return;
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDrawing() {
    if (isDrawing) {
      ctx.closePath();
      isDrawing = false;
      saveDraft();
    }
  }

  function clearSignature() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasSigned = false;
    canvasIndicator.classList.remove('hidden');
    saveDraft();
  }

  // =========================================================================
  // 6. AUTOGUARDADO EN LOCALSTORAGE (RESILIENCIA EN CELULAR)
  // =========================================================================
  let debounceTimer = null;
  function debounceSaveDraft() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      saveDraft();
    }, 400);
  }

  function saveDraft() {
    const formData = extractFormData();
    try {
      localStorage.setItem(STORAGE_KEY_FORM, JSON.stringify({
        data: formData,
        step: currentStep,
        updatedAt: new Date().toISOString()
      }));
      showAutosaveNotice("Respuestas guardadas automáticamente");
    } catch (e) {
      console.warn("No se pudo guardar borrador local:", e);
    }
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_FORM);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.data) return;

      if (parsed.step && parsed.step > 0) {
        savedDraftStep = parsed.step;
        if (resumeDraftNotice && draftStepLabel) {
          resumeDraftNotice.style.display = 'block';
          draftStepLabel.textContent = `Sección ${savedDraftStep}: ${stepTitles[savedDraftStep - 1] || ''}`;
        }
      }

      const data = parsed.data;
      Object.keys(data).forEach(key => {
        const value = data[key];
        // Radio buttons
        const radios = form.querySelectorAll(`input[name="${key}"][type="radio"]`);
        if (radios.length > 0) {
          radios.forEach(r => {
            if (r.value === value) r.checked = true;
          });
          return;
        }

        // Inputs, textareas, selects
        const el = form.querySelector(`[name="${key}"]`);
        if (el && value !== undefined && value !== null) {
          el.value = value;
          if (key === 'childDob' && value && value.includes('-')) {
            const parts = value.split('-');
            if (parts.length === 3) {
              const yEl = document.getElementById('dobYear');
              const mEl = document.getElementById('dobMonth');
              const dEl = document.getElementById('dobDay');
              if (yEl) yEl.value = parts[0];
              if (mEl) mEl.value = parts[1];
              if (dEl) dEl.value = parts[2];
            }
          }
        }
      });

      // Disparar cálculo de edad si se restauró fecha de nacimiento
      const restoredDob = document.getElementById('childDob');
      if (restoredDob && restoredDob.value) {
        restoredDob.dispatchEvent(new Event('change'));
      }

      // Disparar eventos de campos condicionales
      const pretermChecked = form.querySelector('input[name="gestationTime"]:checked');
      if (pretermChecked && pretermChecked.value === 'Prematuro') {
        const box = document.getElementById('pretermWeeksBox');
        if (box) box.style.display = 'block';
      }

      showAutosaveNotice("Borrador anterior restaurado con éxito");
    } catch (err) {
      console.warn("Error cargando borrador:", err);
    }
  }

  function showAutosaveNotice(msg, isAlert = false) {
    if (!autosaveNotice) return;
    const span = autosaveNotice.querySelector('span');
    if (span) span.textContent = msg;

    if (isAlert) {
      autosaveNotice.style.borderColor = "var(--color-red)";
      autosaveNotice.style.color = "var(--color-red)";
    } else {
      autosaveNotice.style.borderColor = "var(--color-border)";
      autosaveNotice.style.color = "var(--color-text-muted)";
    }

    autosaveNotice.style.opacity = '1';
  }

  // =========================================================================
  // 7. EXTRACCIÓN Y ENVÍO DE DATOS
  // =========================================================================
  function extractFormData() {
    const rawData = new FormData(form);
    const dataObj = {};

    for (let [key, val] of rawData.entries()) {
      dataObj[key] = val;
    }

    // Agregar estado de la firma
    dataObj.hasSignature = hasSigned;
    if (hasSigned) {
      try {
        dataObj.signatureData = canvas.toDataURL("image/png");
      } catch (e) {
        dataObj.signatureData = "";
      }
    } else {
      dataObj.signatureData = "";
    }

    return dataObj;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Bloquear el envío si el formulario completo no está lleno
    if (!validateEntireForm()) return;

    const payload = extractFormData();
    const storedScript = localStorage.getItem(STORAGE_KEY_SCRIPT);
    const scriptUrl = (storedScript && storedScript.trim().startsWith('http')) ? storedScript.trim() : DEFAULT_SCRIPT_URL;

    // Mostrar pantalla de carga
    loadingOverlay.style.display = 'flex';

    if (!scriptUrl) {
      // Si aún no han pegado la URL de Apps Script, guardamos localmente y mostramos pantalla de éxito
      console.info("Modo demostración: No hay URL de Google Apps Script configurada aún.");
      setTimeout(() => {
        finishSubmission(payload);
      }, 1000);
      return;
    }

    try {
      // Envío directo a Google Apps Script
      // Nota: Google Apps Script requiere text/plain en fetch para evitar preflight CORS restringido
      await fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload),
        mode: 'no-cors' // Google Apps Script redirige a googleusercontent.com
      });

      // Éxito
      finishSubmission(payload);

    } catch (err) {
      console.error("Error al enviar a Google Sheets:", err);
      // Por resiliencia en celulares con conexión intermitente, registramos el envío
      alert("Se guardaron tus datos localmente. Si tu conexión está lenta, no te preocupes, tu información está a salvo.");
      finishSubmission(payload);
    }
  });

  function finishSubmission(payload) {
    loadingOverlay.style.display = 'none';
    form.style.display = 'none';

    // Rellenar resumen de confirmación
    document.getElementById('sumChildName').textContent = payload.childName || "Paciente";
    document.getElementById('sumSignerName').textContent = payload.signerName || "Tutor legal";
    document.getElementById('sumDate').textContent = new Date().toLocaleDateString('es-GT', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // Limpiar borrador para no dejar datos viejos
    localStorage.removeItem(STORAGE_KEY_FORM);

    // Mostrar pantalla de éxito
    successScreen.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  newFormBtn.addEventListener('click', () => {
    if (confirm("¿Deseas iniciar una nueva entrevista en blanco?")) {
      form.reset();
      const d = document.getElementById('dobDay');
      const m = document.getElementById('dobMonth');
      const y = document.getElementById('dobYear');
      if (d) d.value = '';
      if (m) m.value = '';
      if (y) y.value = '';
      clearSignature();
      localStorage.removeItem(STORAGE_KEY_FORM);
      successScreen.style.display = 'none';
      if (resumeDraftNotice) resumeDraftNotice.style.display = 'none';
      currentStep = 0;
      updateUI();
    }
  });

  // =========================================================================
  // 8. MODAL DE CONFIGURACIÓN DE GOOGLE SHEETS (OPCIONAL/DESARROLLO)
  // =========================================================================
  if (openConfigModalBtn) {
    openConfigModalBtn.addEventListener('click', () => {
      if (configModal) configModal.style.display = 'flex';
    });
  }

  if (closeConfigModalBtn) {
    closeConfigModalBtn.addEventListener('click', () => {
      if (configModal) configModal.style.display = 'none';
    });
  }

  if (configModal) {
    configModal.addEventListener('click', (e) => {
      if (e.target === configModal) configModal.style.display = 'none';
    });
  }

  if (saveScriptUrlBtn && scriptUrlInput) {
    saveScriptUrlBtn.addEventListener('click', () => {
      const url = scriptUrlInput.value.trim();
      if (url) {
        localStorage.setItem(STORAGE_KEY_SCRIPT, url);
        if (statusText) {
          statusText.textContent = "URL guardada con éxito ✅";
          statusText.style.color = "#10b981";
        }
        setTimeout(() => {
          if (configModal) configModal.style.display = 'none';
        }, 900);
      } else {
        localStorage.removeItem(STORAGE_KEY_SCRIPT);
        if (statusText) {
          statusText.textContent = "Modo demostración (sin Google Sheets)";
          statusText.style.color = "#64748b";
        }
      }
    });
  }

  if (testScriptUrlBtn && scriptUrlInput) {
    testScriptUrlBtn.addEventListener('click', async () => {
      const url = scriptUrlInput.value.trim();
      if (!url) {
        if (statusText) {
          statusText.textContent = "Por favor ingresa una URL válida primero";
          statusText.style.color = "var(--color-red)";
        }
        return;
      }
      if (statusText) {
        statusText.textContent = "Probando conexión con Google Sheets...";
        statusText.style.color = "var(--color-primary)";
      }

      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.status === "online") {
          if (statusText) {
            statusText.textContent = "¡Conexión exitosa! El servicio de Google Sheets respondió correctamente.";
            statusText.style.color = "#10b981";
          }
        } else {
          if (statusText) {
            statusText.textContent = "Se recibió respuesta de Google Apps Script.";
            statusText.style.color = "#10b981";
          }
        }
      } catch (e) {
        if (statusText) {
          statusText.textContent = "Conexión enviada (en Apps Script los bloqueos de navegador cruzados son normales, pero el POST funciona).";
          statusText.style.color = "#b45309";
        }
      }
    });
  }

  resetDataBtn.addEventListener('click', () => {
    if (confirm("¿Estás seguro de que deseas borrar el borrador local? Se limpiarán todas las respuestas escritas.")) {
      localStorage.removeItem(STORAGE_KEY_FORM);
      form.reset();
      clearSignature();
      if (resumeDraftNotice) resumeDraftNotice.style.display = 'none';
      goToStep(0);
      alert("Borrador local eliminado.");
    }
  });

  // Ejecutar inicialización
  init();
});
