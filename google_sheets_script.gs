/**
 * =========================================================================
 * GOOGLE APPS SCRIPT PARA ENTREVISTA INICIAL - FUNDACIÓN WAYBI
 * Mgtr. Lucía Montes | BCBA #1-21-51278
 * =========================================================================
 * 
 * INSTRUCCIONES DE INSTALACIÓN (Solo toma 3 minutos):
 * 1. Crea una hoja de cálculo nueva en Google Sheets (ejemplo: "Respuestas Entrevista Waybi").
 * 2. En el menú superior de Google Sheets, ve a: Extensiones > Apps Script.
 * 3. Borra todo el código que aparezca y pega este archivo completo.
 * 4. Haz clic en el icono de guardar (💾 Guardar proyecto).
 * 5. Haz clic en el botón azul superior: "Implementar" > "Nueva implementación".
 * 6. En el tipo de implementación (icono de engranaje ⚙️), selecciona: "Aplicación web".
 * 7. Llena los siguientes campos:
 *    - Descripción: "Receptor Entrevista Waybi"
 *    - Ejecutar como: "Yo" (tu cuenta de correo)
 *    - Quién tiene acceso: "Cualquier persona" (¡IMPORTANTE! para que los padres puedan enviar sin iniciar sesión)
 * 8. Haz clic en "Implementar".
 * 9. Autoriza los permisos solicitados con tu cuenta de Google.
 * 10. Copia la "URL de la aplicación web" (termina en /exec) y pégala en tu formulario web.
 * =========================================================================
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  // Esperar hasta 30 segundos para evitar colisiones de concurrencia
  lock.tryLock(30000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Lista ordenada de todas las columnas de la Anamnesis
    var headers = [
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
      "URL o Datos de Firma"
    ];

    // Verificar si la hoja está vacía para crear encabezados con estilo profesional
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#385da9");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      headerRange.setFontSize(11);
      sheet.setFrozenRows(1);
    }

    var timestamp = new Date();
    var formattedDate = Utilities.formatDate(timestamp, "America/Guatemala", "yyyy-MM-dd HH:mm:ss");

    // Mapear los campos recibidos
    var row = [
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
      data.hasSignature ? "Sí (Firmado en pantalla)" : "No",
      data.signatureData ? "(Firma capturada en formulario)" : ""
    ];

    sheet.appendRow(row);

    // Ajustar formato de texto plano
    var newRowIdx = sheet.getLastRow();
    sheet.getRange(newRowIdx, 1, 1, row.length).setWrap(true);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Entrevista Waybi registrada exitosamente",
      row: newRowIdx
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

// Endpoint GET de prueba de salud
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    message: "Servicio de recepción de Entrevista Waybi activo y listo."
  })).setMimeType(ContentService.MimeType.JSON);
}
