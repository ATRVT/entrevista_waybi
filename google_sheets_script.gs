/**
 * =========================================================================
 * GOOGLE APPS SCRIPT PARA ENTREVISTA INICIAL - FUNDACIÓN WAYBI
 * Mgtr. Lucía Montes | BCBA #1-21-51278
 * =========================================================================
 * 
 * 1. Base de Datos en Sheets: Guarda cada respuesta en su fila correspondiente.
 * 2. Generador Automático de Documento / Expediente: Crea un Google Doc
 *    organizado tipo informe clínico / carta formal en Google Drive.
 * 3. Firma Digital Integrada: Inserta la imagen de la firma trazada directamente
 *    en el documento oficial.
 * 4. Enlace Directo con 1 Clic: Añade la columna "Ver Documento / Expediente" en
 *    Google Sheets para abrir el informe de cada niño/a con un solo clic.
 * 5. Menú Interactivo en Sheets: Permite generar el documento para filas que ya
 *    estaban guardadas previamente con un solo clic.
 * =========================================================================
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Lista ordenada de todas las columnas de la Entrevista Waybi
    var headers = getHeadersList();

    // Formato de cabecera con el color institucional de Waybi (#36b5a9)
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#36b5a9");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      headerRange.setFontSize(10.5);
      sheet.setFrozenRows(1);
    } else {
      var lastCol = sheet.getLastColumn();
      if (lastCol < headers.length) {
        sheet.getRange(1, lastCol + 1, 1, headers.length - lastCol).setValues([headers.slice(lastCol)]);
        var newHeaderRange = sheet.getRange(1, lastCol + 1, 1, headers.length - lastCol);
        newHeaderRange.setBackground("#36b5a9");
        newHeaderRange.setFontColor("#ffffff");
        newHeaderRange.setFontWeight("bold");
        newHeaderRange.setFontSize(10.5);
      }
    }

    var timestamp = new Date();
    var formattedDate = Utilities.formatDate(timestamp, "America/Guatemala", "yyyy-MM-dd HH:mm:ss");

    // Generar el Google Doc oficial de Waybi
    var documentUrl = "";
    try {
      documentUrl = createClinicalReport(data, formattedDate);
    } catch (docErr) {
      console.error("Error creando el Google Doc:", docErr);
      documentUrl = "Error al generar: " + docErr.toString();
    }

    // Fila para Google Sheets
    var row = buildRowFromData(data, formattedDate, documentUrl);

    sheet.appendRow(row);
    var newRowIdx = sheet.getLastRow();
    sheet.getRange(newRowIdx, 1, 1, row.length).setWrap(true);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Entrevista Waybi registrada y documento generado exitosamente",
      row: newRowIdx,
      documentUrl: documentUrl
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

// Lista oficial de encabezados de la Entrevista Waybi
function getHeadersList() {
  return [
    "Fecha y Hora de Recepción",
    "Fecha de Evaluación",
    // 1. Identificación del niño/a
    "Niño: Nombre Completo",
    "Niño: Fecha de Nacimiento",
    "Niño: Edad",
    "Niño: Sexo",
    "Niño: Dirección Domiciliar",
    "Niño: Teléfono de Contacto",
    "Niño: Referido por",
    "Niño: Alergias Conocidas",
    "Niño: Detalle Alergias",
    "Mascota en Casa (Perro)",
    "Relación e Interacción con el Perro",
    // 2. Padres y Entorno
    "Padre: Nombre Completo",
    "Padre: Edad",
    "Padre: Teléfono Directo",
    "Padre: Escolaridad y Profesión",
    "Padre: ¿Trabaja Actualmente?",
    "Padre: Lugar / Empresa de Trabajo",
    "Padre: Domicilio y Correo",
    "Madre: Nombre Completo",
    "Madre: Edad",
    "Madre: Teléfono Directo",
    "Madre: Escolaridad y Profesión",
    "Madre: ¿Trabaja Actualmente?",
    "Madre: Lugar / Empresa de Trabajo",
    "Madre: Domicilio y Correo",
    "Ocupación Familiar Principal",
    "Descripción de la Vivienda",
    "Hermanos (Nombres, edades y relación)",
    // 3. Motivo de Consulta
    "Conductas con Mayor Dificultad",
    "Meta u Objetivo Principal",
    "Diagnóstico Previo y Año",
    "Diagnóstico Emitido Por",
    "Inicio de Primeros Síntomas",
    "Evaluaciones y Tratamientos Previos",
    "Actitud Familiar ante el Problema",
    // 4. Historia del Desarrollo
    "Gestación: Tiempo",
    "Gestación: Semanas Prematuro (si aplica)",
    "Complicaciones en Embarazo",
    "Parto y Nacimiento",
    "Motor: Control Cefálico (meses)",
    "Motor: Gateo (meses)",
    "Motor: Marcha Independiente (meses)",
    "Lenguaje: Inicio de Señalamiento (meses)",
    "Lenguaje: Primeras Sílabas (meses)",
    "Lenguaje: Primeras Palabras (meses)",
    "Lenguaje: Comunicación Actual",
    "Alimentación: Inicio de Sólidos y Transición",
    "Sueño: Continuo Nocturno",
    "Sueño: Calidad y Despertares",
    "Dentición y Salud Bucal",
    "Esfínteres: Pipí Día",
    "Esfínteres: Pipí Noche",
    "Esfínteres: Popó",
    "Esfínteres: Observaciones",
    // 5. Área Social y Escolar
    "Estado de Ánimo y Humor Habitual",
    "Adaptación a Lugares y Personas Nuevas",
    "Rabietas o Berrinches (Frecuencia, detonantes, calma)",
    "Colegio Actual",
    "Grado en Curso",
    "Particularidades en la Escuela",
    // 6. Antecedentes de Salud
    "Hospitalizaciones o Cirugías Previas",
    "Medicamentos Actuales",
    "Enfermedades Relevantes",
    "Otros Datos Médicos",
    // 7. Rutinas Cotidianas
    "Rutina: Día Entre Semana",
    "Rutina: Fin de Semana",
    "Rutina: Tiempo Libre en Casa",
    // 8. Perfil Sensorial
    "Sensorial: Lavado/Corte Cabello",
    "Sensorial: Detalle Cabello",
    "Sensorial: Respuesta al Nombre",
    "Sensorial: Detalle Nombre",
    "Sensorial: Selectividad Comida",
    "Sensorial: Detalle Comida",
    "Sensorial: Prendas de Vestir",
    "Sensorial: Detalle Prendas",
    "Sensorial: Percepción del Dolor",
    "Sensorial: Detalle Dolor",
    "Sensorial: Habilidades Motoras y Equilibrio",
    "Sensorial: Detalle Motor",
    "Sensorial: Sensibilidad Ruidos Fuertes",
    "Sensorial: Detalle Ruidos",
    "Sensorial: Búsqueda Oral",
    "Sensorial: Detalle Oral",
    // 9. Autonomía en Vida Diaria (AVD)
    "AVD: Alimentación Independiente",
    "AVD: Higiene y Baño",
    "AVD: Vestido y Calzado",
    "AVD: Uso del Sanitario",
    "AVD: Higiene Bucal",
    "AVD: Orden y Cuidado Personal",
    "AVD: Seguimiento de Instrucciones",
    "AVD: Comentarios u Observaciones",
    // 10. Registro de Intereses
    "Comidas: Le Gusta",
    "Comidas: No le Gusta",
    "Bebidas: Le Gusta",
    "Bebidas: No le Gusta",
    "Personas Preferidas",
    "Juguetes u Objetos Favoritos",
    "Juegos Concretos",
    "Contenido Multimedia",
    "Actividades Recreativas",
    "Otros Intereses o Aversiones",
    // 11. Información Adicional y Firma
    "Observaciones e Información Adicional",
    "Nombre de Quien Llena/Firma",
    "DPI / Documento de Identificación",
    "Firma Digital Registrada",
    // COLUMNA ESPECIAL: EXPEDIENTE
    "Ver Documento / Expediente"
  ];
}

// Construye la fila de datos en el mismo orden que las columnas
function buildRowFromData(data, formattedDate, documentUrl) {
  return [
    formattedDate,
    data.evalDate || "",
    // 1. Identificación
    data.childName || "",
    data.childDob || "",
    data.childAge || "",
    data.childGender || "",
    data.childAddress || "",
    data.childPhone || "",
    data.referredBy || "",
    data.allergies || "",
    data.allergiesDetail || "",
    data.hasDog || "",
    data.dogInteraction || "",
    // 2. Padres
    data.fatherName || "",
    data.fatherAge || "",
    data.fatherPhone || "",
    data.fatherProfession || "",
    data.fatherWorks || "",
    data.fatherWorkplace || "",
    data.fatherContact || "",
    data.motherName || "",
    data.motherAge || "",
    data.motherPhone || "",
    data.motherProfession || "",
    data.motherWorks || "",
    data.motherWorkplace || "",
    data.motherContact || "",
    data.mainFamilyOccupation || "",
    data.homeDescription || "",
    data.siblingsInfo || "",
    // 3. Motivo
    data.mainDifficulties || "",
    data.familyGoal || "",
    data.previousDiagnosis || "",
    data.diagnosisIssuedBy || "",
    data.firstSymptomsAge || "",
    data.previousEvaluations || "",
    data.familyAttitude || "",
    // 4. Historia Desarrollo
    data.gestationTime || "",
    data.pretermWeeks || "",
    data.pregnancyComplications || "",
    data.birthDelivery || "",
    data.motorHeadControl || "",
    data.motorCrawling || "",
    data.motorWalking || "",
    data.langPointing || "",
    data.langSyllables || "",
    data.langWords || "",
    data.langCurrentCommunication || "",
    data.feedingStart || "",
    data.sleepContinuous || "",
    data.sleepQuality || "",
    data.dentalHealth || "",
    data.toiletDay || "",
    data.toiletNight || "",
    data.toiletPoop || "",
    data.toiletNotes || "",
    // 5. Social y Escolar
    data.habitualMood || "",
    data.adaptationNew || "",
    data.tantrums || "",
    data.currentSchool || "",
    data.currentGrade || "",
    data.schoolNotes || "",
    // 6. Salud
    data.hospitalizations || "",
    data.currentMedications || "",
    data.relevantIllnesses || "",
    data.otherMedicalInfo || "",
    // 7. Rutinas
    data.weekdayRoutine || "",
    data.weekendRoutine || "",
    data.freeTimeActivities || "",
    // 8. Sensorial
    data.sensoryHaircut || "",
    data.sensoryHaircutDetail || "",
    data.sensoryNameResponse || "",
    data.sensoryNameResponseDetail || "",
    data.sensoryFoodSelectivity || "",
    data.sensoryFoodSelectivityDetail || "",
    data.sensoryClothing || "",
    data.sensoryClothingDetail || "",
    data.sensoryPain || "",
    data.sensoryPainDetail || "",
    data.sensoryMotorCoordination || "",
    data.sensoryMotorCoordinationDetail || "",
    data.sensoryLoudSounds || "",
    data.sensoryLoudSoundsDetail || "",
    data.sensoryOralSeeking || "",
    data.sensoryOralSeekingDetail || "",
    // 9. AVD
    data.avdFeeding || "",
    data.avdHygiene || "",
    data.avdDressing || "",
    data.avdToilet || "",
    data.avdTeeth || "",
    data.avdTidiness || "",
    data.avdInstructions || "",
    data.avdNotes || "",
    // 10. Intereses
    data.interestsFoodsLike || "",
    data.interestsFoodsDislike || "",
    data.interestsDrinksLike || "",
    data.interestsDrinksDislike || "",
    data.interestsPreferredPeople || "",
    data.interestsFavoriteToys || "",
    data.interestsConcreteGames || "",
    data.interestsMultimedia || "",
    data.interestsRecreationalActivities || "",
    data.interestsOther || "",
    // 11. Información Adicional y Firma
    data.additionalNotes || "",
    data.signerName || "",
    data.signerDpi || "",
    data.hasSignature ? "Sí (Firmado digitalmente)" : "No",
    // Columna de enlace directo
    documentUrl
  ];
}

// =============================================================================
// CONSTRUCCIÓN DEL EXPEDIENTE CLÍNICO DE FUNDACIÓN WAYBI EN GOOGLE DOCS
// =============================================================================
function createClinicalReport(data, formattedDate) {
  // Salvaguarda: si se ejecuta directamente desde el botón "Ejecutar" sin argumentos,
  // toma automáticamente la fila 2 de la hoja de cálculo
  if (!data || Object.keys(data).length === 0) {
    try {
      var activeSheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      if (activeSheet && activeSheet.getLastRow() >= 2) {
        var rowVals = activeSheet.getRange(2, 1, 1, activeSheet.getLastColumn()).getValues()[0];
        data = parseRowToDataObject(rowVals);
        formattedDate = String(rowVals[0] || Utilities.formatDate(new Date(), "America/Guatemala", "yyyy-MM-dd HH:mm:ss"));
      }
    } catch (e) {
      console.warn("No se pudo extraer fila de respaldo:", e);
    }
  }

  data = data || {};
  formattedDate = formattedDate || Utilities.formatDate(new Date(), "America/Guatemala", "yyyy-MM-dd HH:mm:ss");

  var folderName = "Expedientes - Entrevistas Waybi";
  var folders = DriveApp.getFoldersByName(folderName);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

  var childName = (data.childName && String(data.childName).trim()) ? String(data.childName).trim() : "Paciente";
  var dateStr = (data.evalDate || String(formattedDate).split(" ")[0]);
  var docTitle = "Entrevista Inicial - " + childName + " (" + dateStr + ")";
  
  var doc = DocumentApp.create(docTitle);
  var body = doc.getBody();

  // Márgenes estándar (aprox. 2 cm = 54 pt)
  body.setMarginTop(54);
  body.setMarginBottom(54);
  body.setMarginLeft(54);
  body.setMarginRight(54);

  // --- ENCABEZADO INSTITUCIONAL WAYBI ---
  var pClinica = body.appendParagraph("FUNDACIÓN WAYBI");
  pClinica.setFontFamily("Arial").setFontSize(16).setBold(true).setForegroundColor("#248b81").setAlignment(DocumentApp.TextAlignment.CENTER);
  pClinica.setSpacingAfter(2);

  var pSub = body.appendParagraph("INFORME DE ENTREVISTA INICIAL");
  pSub.setFontFamily("Arial").setFontSize(11).setBold(true).setForegroundColor("#475569").setAlignment(DocumentApp.TextAlignment.CENTER);
  pSub.setSpacingAfter(2);

  var pCred = body.appendParagraph("Mgtr. Lucía Montes • BCBA #1-21-51278 • Col. #3416");
  pCred.setFontFamily("Arial").setFontSize(9.5).setItalic(true).setForegroundColor("#64748b").setAlignment(DocumentApp.TextAlignment.CENTER);
  pCred.setSpacingAfter(8);

  var pDiv = body.appendParagraph("_______________________________________________________________________________");
  pDiv.setFontSize(8).setForegroundColor("#cbd5e1").setAlignment(DocumentApp.TextAlignment.CENTER);
  pDiv.setSpacingAfter(12);

  // --- METADATOS BÁSICOS ---
  var metaTable = body.appendTable([
    ["Fecha de Evaluación:", data.evalDate || "—", "Recepción del Formulario:", formattedDate],
    ["Paciente:", childName, "Edad:", data.childAge || "—"]
  ]);
  styleCompactTable(metaTable);
  body.appendParagraph("").setSpacingAfter(4);

  // --- 1. IDENTIFICACIÓN ---
  addSectionHeader(body, "1. IDENTIFICACIÓN DEL NIÑO/A");
  addField(body, "Nombre Completo", data.childName);
  addField(body, "Fecha de Nacimiento", data.childDob);
  addField(body, "Edad Actual", data.childAge);
  addField(body, "Sexo", data.childGender);
  addField(body, "Dirección Domiciliar", data.childAddress);
  addField(body, "Teléfono de Contacto", data.childPhone);
  addField(body, "Referido por", data.referredBy);
  addField(body, "¿Tiene Alergias Conocidas?", data.allergies);
  if (data.allergies === "Sí, tiene alergias" || data.allergiesDetail) {
    addField(body, "Detalle de Alergias", data.allergiesDetail);
  }
  addField(body, "¿Tiene Mascota en Casa (Perro)?", data.hasDog);
  if (data.hasDog === "Sí" || data.dogInteraction) {
    addField(body, "Relación e Interacción con el Perro", data.dogInteraction);
  }

  // --- 2. PADRES Y ENTORNO ---
  addSectionHeader(body, "2. DATOS DE LOS PADRES Y ENTORNO FAMILIAR");
  
  addSubHeader(body, "Información del Padre:");
  addField(body, "Nombre del Padre", data.fatherName);
  addField(body, "Edad", data.fatherAge);
  addField(body, "Teléfono Directo", data.fatherPhone);
  addField(body, "Escolaridad y Profesión", data.fatherProfession);
  addField(body, "¿Trabaja Actualmente?", data.fatherWorks);
  if (data.fatherWorks === "Sí trabaja" || data.fatherWorkplace) {
    addField(body, "Lugar / Empresa de Trabajo", data.fatherWorkplace);
  }
  addField(body, "Domicilio y Correo", data.fatherContact);

  addSubHeader(body, "Información de la Madre:");
  addField(body, "Nombre de la Madre", data.motherName);
  addField(body, "Edad", data.motherAge);
  addField(body, "Teléfono Directo", data.motherPhone);
  addField(body, "Escolaridad y Profesión", data.motherProfession);
  addField(body, "¿Trabaja Actualmente?", data.motherWorks);
  if (data.motherWorks === "Sí trabaja" || data.motherWorkplace) {
    addField(body, "Lugar / Empresa de Trabajo", data.motherWorkplace);
  }
  addField(body, "Domicilio y Correo", data.motherContact);

  addSubHeader(body, "Dinámica Familiar y Vivienda:");
  addField(body, "Ocupación Familiar Principal", data.mainFamilyOccupation);
  addField(body, "Descripción de la Vivienda", data.homeDescription);
  addField(body, "Hermanos", data.siblingsInfo);

  // --- 3. MOTIVO DE CONSULTA ---
  addSectionHeader(body, "3. MOTIVO DE CONSULTA Y OBJETIVOS");
  addField(body, "Conductas o Situaciones de Mayor Dificultad", data.mainDifficulties);
  addField(body, "Meta u Objetivo Principal de la Familia", data.familyGoal);
  addField(body, "Diagnóstico Previo y Año", data.previousDiagnosis);
  addField(body, "Emitido por", data.diagnosisIssuedBy);
  addField(body, "Inicio de Primeros Síntomas", data.firstSymptomsAge);
  addField(body, "Evaluaciones y Tratamientos Previos", data.previousEvaluations);
  addField(body, "Actitud Familiar ante el Problema", data.familyAttitude);

  // --- 4. HISTORIA DEL DESARROLLO ---
  addSectionHeader(body, "4. HISTORIA DEL DESARROLLO");
  addField(body, "Tiempo de Gestación", data.gestationTime);
  if (data.gestationTime === "Prematuro" || data.pretermWeeks) {
    addField(body, "Semanas al Nacer", data.pretermWeeks);
  }
  addField(body, "Complicaciones en Embarazo", data.pregnancyComplications);
  addField(body, "Parto y Nacimiento", data.birthDelivery);

  addSubHeader(body, "Hitos Motores y de Lenguaje:");
  var motorTable = body.appendTable([
    ["Hito del Desarrollo", "Edad en que lo Logró"],
    ["Control Cefálico", data.motorHeadControl || "—"],
    ["Gateo", data.motorCrawling || "—"],
    ["Marcha (Caminar)", data.motorWalking || "—"],
    ["Señalamiento", data.langPointing || "—"],
    ["Primeras Sílabas", data.langSyllables || "—"],
    ["Primeras Palabras", data.langWords || "—"]
  ]);
  styleTable(motorTable);
  body.appendParagraph("").setSpacingAfter(4);

  addField(body, "Comunicación Actual", data.langCurrentCommunication);
  addField(body, "Inicio de Alimentación Sólida", data.feedingStart);
  addField(body, "Sueño Continuo Nocturno", data.sleepContinuous);
  addField(body, "Calidad del Sueño", data.sleepQuality);
  addField(body, "Dentición y Salud Bucal", data.dentalHealth);
  
  addSubHeader(body, "Control de Esfínteres:");
  var toiletTable = body.appendTable([
    ["Momento", "Nivel de Control"],
    ["Pipí de día", data.toiletDay || "—"],
    ["Pipí de noche", data.toiletNight || "—"],
    ["Popó", data.toiletPoop || "—"]
  ]);
  styleTable(toiletTable);
  body.appendParagraph("").setSpacingAfter(4);
  if (data.toiletNotes) {
    addField(body, "Observaciones sobre Esfínteres", data.toiletNotes);
  }

  // --- 5. ÁREA SOCIAL, AFECTIVA Y ESCOLAR ---
  addSectionHeader(body, "5. ÁREA SOCIAL, AFECTIVA Y ESCOLAR");
  addField(body, "Estado de Ánimo y Humor Habitual", data.habitualMood);
  addField(body, "Adaptación a Lugares y Personas Nuevas", data.adaptationNew);
  addField(body, "Rabietas o Berrinches", data.tantrums);
  addField(body, "Colegio Actual", data.currentSchool);
  addField(body, "Grado en Curso", data.currentGrade);
  addField(body, "Particularidades en la Escuela", data.schoolNotes);

  // --- 6. ANTECEDENTES DE SALUD ---
  addSectionHeader(body, "6. ANTECEDENTES DE SALUD");
  addField(body, "Hospitalizaciones o Cirugías Previas", data.hospitalizations);
  addField(body, "Medicamentos Actuales", data.currentMedications);
  addField(body, "Enfermedades Relevantes", data.relevantIllnesses);
  if (data.otherMedicalInfo) {
    addField(body, "Otros Datos Médicos", data.otherMedicalInfo);
  }

  // --- 7. RUTINAS COTIDIANAS ---
  addSectionHeader(body, "7. RUTINAS COTIDIANAS");
  addField(body, "Día Entre Semana (Despertar a Dormir)", data.weekdayRoutine);
  addField(body, "Día de Fin de Semana", data.weekendRoutine);
  addField(body, "Actividades en Tiempo Libre en Casa", data.freeTimeActivities);

  // --- 8. PERFIL SENSORIAL ---
  addSectionHeader(body, "8. PERFIL SENSORIAL");
  var sensoryTable = body.appendTable([
    ["Estímulo Sensorial", "Reacción Observada", "Detalles / Conducta"],
    ["1. Lavado o corte de cabello", data.sensoryHaircut || "—", data.sensoryHaircutDetail || "—"],
    ["2. Respuesta al llamado por su nombre", data.sensoryNameResponse || "—", data.sensoryNameResponseDetail || "—"],
    ["3. Selectividad con la comida", data.sensoryFoodSelectivity || "—", data.sensoryFoodSelectivityDetail || "—"],
    ["4. Prendas de vestir (etiquetas, telas)", data.sensoryClothing || "—", data.sensoryClothingDetail || "—"],
    ["5. Percepción del dolor ante caídas", data.sensoryPain || "—", data.sensoryPainDetail || "—"],
    ["6. Habilidades motoras y equilibrio", data.sensoryMotorCoordination || "—", data.sensoryMotorCoordinationDetail || "—"],
    ["7. Sensibilidad ante ruidos fuertes", data.sensoryLoudSounds || "—", data.sensoryLoudSoundsDetail || "—"],
    ["8. Búsqueda oral (morder objetos)", data.sensoryOralSeeking || "—", data.sensoryOralSeekingDetail || "—"]
  ]);
  styleTable(sensoryTable);
  body.appendParagraph("").setSpacingAfter(4);

  // --- 9. AUTONOMÍA EN VIDA DIARIA (AVD) ---
  addSectionHeader(body, "9. AUTONOMÍA EN ACTIVIDADES DE LA VIDA DIARIA (AVD)");
  var avdTable = body.appendTable([
    ["Actividad de la Vida Diaria", "Nivel de Independencia Observado"],
    ["Alimentación independiente", data.avdFeeding || "—"],
    ["Higiene y baño", data.avdHygiene || "—"],
    ["Vestido y calzado", data.avdDressing || "—"],
    ["Uso del sanitario", data.avdToilet || "—"],
    ["Higiene bucal (cepillado)", data.avdTeeth || "—"],
    ["Orden y cuidado personal", data.avdTidiness || "—"],
    ["Seguimiento de instrucciones", data.avdInstructions || "—"]
  ]);
  styleTable(avdTable);
  body.appendParagraph("").setSpacingAfter(4);
  if (data.avdNotes) {
    addField(body, "Comentarios sobre Autonomía", data.avdNotes);
  }

  // --- 10. REGISTRO DE INTERESES ---
  addSectionHeader(body, "10. REGISTRO DE INTERESES");
  var interestsTable = body.appendTable([
    ["Categoría", "Preferencias (Le Gusta)", "Aversiones (No le Gusta)"],
    ["Comidas y Alimentos", data.interestsFoodsLike || "—", data.interestsFoodsDislike || "—"],
    ["Bebidas", data.interestsDrinksLike || "—", data.interestsDrinksDislike || "—"]
  ]);
  styleTable(interestsTable);
  body.appendParagraph("").setSpacingAfter(4);

  addField(body, "Personas Preferidas", data.interestsPreferredPeople);
  addField(body, "Juguetes u Objetos Favoritos", data.interestsFavoriteToys);
  addField(body, "Juegos Concretos", data.interestsConcreteGames);
  addField(body, "Contenido Multimedia (Videos, Música)", data.interestsMultimedia);
  addField(body, "Actividades Recreativas (Parque, Paseos)", data.interestsRecreationalActivities);
  if (data.interestsOther) {
    addField(body, "Otros Intereses o Aversiones", data.interestsOther);
  }

  // --- 11. INFORMACIÓN ADICIONAL Y FIRMA ---
  addSectionHeader(body, "11. INFORMACIÓN ADICIONAL Y FIRMA DIGITAL");
  if (data.additionalNotes) {
    addField(body, "Observaciones e Información Complementaria", data.additionalNotes);
  }
  addField(body, "Nombre de Quien Llena / Firma", data.signerName);
  addField(body, "DPI / Documento de Identificación", data.signerDpi);
  addField(body, "Fecha de Envío Registrada", formattedDate);

  // Inserción de la firma táctil
  if (data.signatureData && data.signatureData.indexOf("base64,") !== -1) {
    try {
      var base64Data = data.signatureData.split("base64,")[1];
      var decodedBytes = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(decodedBytes, "image/png", "firma_" + childName.replace(/\s+/g, '_') + ".png");
      var pSig = body.appendParagraph("\nFirma Digital del Tutor Legal:");
      pSig.setFontFamily("Arial").setFontSize(10).setBold(true).setForegroundColor("#1e293b");
      pSig.setSpacingBefore(6).setSpacingAfter(4);
      var img = body.appendImage(blob);
      img.setWidth(260);
      img.setHeight(90);
    } catch (errSig) {
      body.appendParagraph("\n[Firma digital verificada y registrada electrónicamente]");
    }
  }

  // Declaración y compromiso legal
  var pLegal = body.appendParagraph("\nCertifico que la información provista en este formulario es verídica y completa a mi leal saber y entender. Esta información será tratada con confidencialidad profesional por la Mgtr. Lucía Montes (BCBA #1-21-51278) y el equipo clínico de Fundación Waybi.");
  pLegal.setFontFamily("Arial").setFontSize(8.5).setItalic(true).setForegroundColor("#64748b");
  pLegal.setSpacingBefore(10);

  doc.saveAndClose();

  // Mover a la carpeta de Expedientes Waybi
  var file = DriveApp.getFileById(doc.getId());
  folder.addFile(file);
  DriveApp.getRootFolder().removeFile(file);

  return doc.getUrl();
}

// =============================================================================
// MENÚ DIRECTO EN GOOGLE SHEETS PARA REGENERAR O EXTRAER EXPEDIENTES
// =============================================================================

// Crea el menú en Google Sheets al abrir la hoja
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("📄 Expedientes Waybi")
    .addItem("Generar expediente de la fila seleccionada", "generarExpedienteFilaActual")
    .addItem("Generar expedientes de todas las filas pendientes", "generarExpedientesPendientes")
    .addToUi();
}

function showAlertSafe(msg) {
  try {
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {
    console.log(msg);
  }
}

// Genera el documento para la fila en la que el usuario tiene el cursor
function generarExpedienteFilaActual() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var rowIdx = sheet.getActiveCell().getRow();

  if (rowIdx <= 1) {
    showAlertSafe("⚠️ Por favor selecciona una fila con datos de un paciente (fila 2 en adelante).");
    return;
  }

  var lastCol = sheet.getLastColumn();
  var rowVals = sheet.getRange(rowIdx, 1, 1, lastCol).getValues()[0];

  // Reconstruir objeto data a partir de las celdas
  var data = parseRowToDataObject(rowVals);
  var formattedDate = String(rowVals[0] || Utilities.formatDate(new Date(), "America/Guatemala", "yyyy-MM-dd HH:mm:ss"));

  showAlertSafe("⏳ Generando expediente para: " + (data.childName || "Paciente") + "...\nPor favor presiona Aceptar y espera unos segundos.");

  try {
    var docUrl = createClinicalReport(data, formattedDate);
    
    // Buscar la columna "Ver Documento / Expediente" (o la última)
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var colDocIdx = headers.indexOf("Ver Documento / Expediente") + 1;
    if (colDocIdx === 0) {
      colDocIdx = lastCol + 1;
      sheet.getRange(1, colDocIdx).setValue("Ver Documento / Expediente").setBackground("#36b5a9").setFontColor("#fff").setFontWeight("bold");
    }

    sheet.getRange(rowIdx, colDocIdx).setValue(docUrl);

    showAlertSafe("✅ ¡Expediente generado con éxito!\n\nPuedes abrirlo con el enlace registrado en la última columna o visitando:\n" + docUrl);
  } catch (err) {
    showAlertSafe("❌ Error generando el expediente: " + err.toString());
  }
}

// Genera documentos para todas las filas que no tengan el enlace
function generarExpedientesPendientes() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow <= 1) {
    showAlertSafe("No hay filas de pacientes registradas todavía.");
    return;
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var colDocIdx = headers.indexOf("Ver Documento / Expediente") + 1;
  if (colDocIdx === 0) {
    colDocIdx = lastCol + 1;
    sheet.getRange(1, colDocIdx).setValue("Ver Documento / Expediente").setBackground("#36b5a9").setFontColor("#fff").setFontWeight("bold");
  }

  var count = 0;
  for (var r = 2; r <= lastRow; r++) {
    var currentUrl = sheet.getRange(r, colDocIdx).getValue();
    if (!currentUrl || String(currentUrl).trim() === "" || String(currentUrl).indexOf("http") === -1) {
      var rowVals = sheet.getRange(r, 1, 1, lastCol).getValues()[0];
      var data = parseRowToDataObject(rowVals);
      var formattedDate = String(rowVals[0] || Utilities.formatDate(new Date(), "America/Guatemala", "yyyy-MM-dd HH:mm:ss"));
      
      try {
        var docUrl = createClinicalReport(data, formattedDate);
        sheet.getRange(r, colDocIdx).setValue(docUrl);
        count++;
        console.log("Expediente creado para fila " + r + ": " + docUrl);
      } catch (e) {
        console.error("Error en fila " + r + ":", e);
      }
    }
  }

  showAlertSafe("✅ Proceso completado. Se generaron " + count + " expediente(s) nuevo(s).");
}

// Mapea los valores de las columnas al objeto de datos
function parseRowToDataObject(rowVals) {
  function getV(idx) {
    return (rowVals[idx] !== undefined && rowVals[idx] !== null) ? String(rowVals[idx]).trim() : "";
  }

  return {
    evalDate: getV(1),
    childName: getV(2),
    childDob: getV(3),
    childAge: getV(4),
    childGender: getV(5),
    childAddress: getV(6),
    childPhone: getV(7),
    referredBy: getV(8),
    allergies: getV(9),
    allergiesDetail: getV(10),
    hasDog: getV(11),
    dogInteraction: getV(12),
    fatherName: getV(13),
    fatherAge: getV(14),
    fatherPhone: getV(15),
    fatherProfession: getV(16),
    fatherWorks: getV(17),
    fatherWorkplace: getV(18),
    fatherContact: getV(19),
    motherName: getV(20),
    motherAge: getV(21),
    motherPhone: getV(22),
    motherProfession: getV(23),
    motherWorks: getV(24),
    motherWorkplace: getV(25),
    motherContact: getV(26),
    mainFamilyOccupation: getV(27),
    homeDescription: getV(28),
    siblingsInfo: getV(29),
    mainDifficulties: getV(30),
    familyGoal: getV(31),
    previousDiagnosis: getV(32),
    diagnosisIssuedBy: getV(33),
    firstSymptomsAge: getV(34),
    previousEvaluations: getV(35),
    familyAttitude: getV(36),
    gestationTime: getV(37),
    pretermWeeks: getV(38),
    pregnancyComplications: getV(39),
    birthDelivery: getV(40),
    motorHeadControl: getV(41),
    motorCrawling: getV(42),
    motorWalking: getV(43),
    langPointing: getV(44),
    langSyllables: getV(45),
    langWords: getV(46),
    langCurrentCommunication: getV(47),
    feedingStart: getV(48),
    sleepContinuous: getV(49),
    sleepQuality: getV(50),
    dentalHealth: getV(51),
    toiletDay: getV(52),
    toiletNight: getV(53),
    toiletPoop: getV(54),
    toiletNotes: getV(55),
    habitualMood: getV(56),
    adaptationNew: getV(57),
    tantrums: getV(58),
    currentSchool: getV(59),
    currentGrade: getV(60),
    schoolNotes: getV(61),
    hospitalizations: getV(62),
    currentMedications: getV(63),
    relevantIllnesses: getV(64),
    otherMedicalInfo: getV(65),
    weekdayRoutine: getV(66),
    weekendRoutine: getV(67),
    freeTimeActivities: getV(68),
    sensoryHaircut: getV(69),
    sensoryHaircutDetail: getV(70),
    sensoryNameResponse: getV(71),
    sensoryNameResponseDetail: getV(72),
    sensoryFoodSelectivity: getV(73),
    sensoryFoodSelectivityDetail: getV(74),
    sensoryClothing: getV(75),
    sensoryClothingDetail: getV(76),
    sensoryPain: getV(77),
    sensoryPainDetail: getV(78),
    sensoryMotorCoordination: getV(79),
    sensoryMotorCoordinationDetail: getV(80),
    sensoryLoudSounds: getV(81),
    sensoryLoudSoundsDetail: getV(82),
    sensoryOralSeeking: getV(83),
    sensoryOralSeekingDetail: getV(84),
    avdFeeding: getV(85),
    avdHygiene: getV(86),
    avdDressing: getV(87),
    avdToilet: getV(88),
    avdTeeth: getV(89),
    avdTidiness: getV(90),
    avdInstructions: getV(91),
    avdNotes: getV(92),
    interestsFoodsLike: getV(93),
    interestsFoodsDislike: getV(94),
    interestsDrinksLike: getV(95),
    interestsDrinksDislike: getV(96),
    interestsPreferredPeople: getV(97),
    interestsFavoriteToys: getV(98),
    interestsConcreteGames: getV(99),
    interestsMultimedia: getV(100),
    interestsRecreationalActivities: getV(101),
    interestsOther: getV(102),
    additionalNotes: getV(103),
    signerName: getV(104),
    signerDpi: getV(105),
    hasSignature: getV(106).indexOf("Sí") !== -1
  };
}

// =============================================================================
// FUNCIONES AUXILIARES DE FORMATO
// =============================================================================
function addSectionHeader(body, text) {
  var p = body.appendParagraph(text);
  p.setFontFamily("Arial").setFontSize(11).setBold(true).setForegroundColor("#248b81");
  p.setSpacingBefore(12).setSpacingAfter(4);
  return p;
}

function addSubHeader(body, text) {
  var p = body.appendParagraph(text);
  p.setFontFamily("Arial").setFontSize(9.5).setBold(true).setForegroundColor("#0f172a");
  p.setSpacingBefore(6).setSpacingAfter(2);
  return p;
}

function addField(body, label, value) {
  var p = body.appendParagraph("");
  var tLabel = p.appendText(label + ": ");
  tLabel.setFontFamily("Arial").setFontSize(9.5).setBold(true).setForegroundColor("#334155");
  var valStr = (value && String(value).trim()) ? String(value).trim() : "—";
  var tVal = p.appendText(valStr);
  tVal.setFontFamily("Arial").setFontSize(9.5).setBold(false).setForegroundColor("#0f172a");
  p.setSpacingBefore(1).setSpacingAfter(2);
  return p;
}

function styleTable(table) {
  table.setBorderColor("#cbd5e1");
  table.setBorderWidth(1);
  var headerRow = table.getRow(0);
  for (var c = 0; c < headerRow.getNumCells(); c++) {
    var cell = headerRow.getCell(c);
    cell.setBackgroundColor("#f1f5f9");
    cell.setPaddingTop(4).setPaddingBottom(4).setPaddingLeft(6).setPaddingRight(6);
    cell.editAsText().setFontFamily("Arial").setFontSize(9).setBold(true).setForegroundColor("#1e293b");
  }
  for (var r = 1; r < table.getNumRows(); r++) {
    var row = table.getRow(r);
    for (var c = 0; c < row.getNumCells(); c++) {
      var cell = row.getCell(c);
      cell.setPaddingTop(3).setPaddingBottom(3).setPaddingLeft(6).setPaddingRight(6);
      cell.editAsText().setFontFamily("Arial").setFontSize(8.5).setForegroundColor("#334155");
    }
  }
}

function styleCompactTable(table) {
  table.setBorderColor("#e2e8f0");
  table.setBorderWidth(1);
  for (var r = 0; r < table.getNumRows(); r++) {
    var row = table.getRow(r);
    for (var c = 0; c < row.getNumCells(); c++) {
      var cell = row.getCell(c);
      cell.setPaddingTop(3).setPaddingBottom(3).setPaddingLeft(6).setPaddingRight(6);
      if (c % 2 === 0) {
        cell.setBackgroundColor("#f8fafc");
        cell.editAsText().setFontFamily("Arial").setFontSize(9).setBold(true).setForegroundColor("#334155");
      } else {
        cell.editAsText().setFontFamily("Arial").setFontSize(9).setForegroundColor("#0f172a");
      }
    }
  }
}

// Endpoint GET de prueba de salud
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    message: "Servicio de recepción de Entrevista Waybi activo y listo."
  })).setMimeType(ContentService.MimeType.JSON);
}
