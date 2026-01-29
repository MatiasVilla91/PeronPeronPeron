const fs = require("fs");
const path = require("path");
let cachedPdfModule = null;

// Función para detectar caracteres problemáticos
function detectProblematicChars(text) {
    const problematicChars = [];
    for (const char of text) {
        const code = char.charCodeAt(0);
        if (code < 32 || (code > 126 && code < 160)) {
            problematicChars.push({ char, code });
        }
    }
    return problematicChars;
}

async function extractTextFromPDF(pdfPath) {
    try {
        if (!cachedPdfModule) {
            cachedPdfModule = await import("pdf-parse");
        }
        const dataBuffer = fs.readFileSync(pdfPath);
        let data = null;

        if (typeof cachedPdfModule?.default === "function") {
            data = await cachedPdfModule.default(dataBuffer);
        } else if (typeof cachedPdfModule?.PDFParse === "function") {
            const parser = new cachedPdfModule.PDFParse({ data: dataBuffer });
            data = await parser.getText();
            await parser.destroy();
        } else {
            throw new Error("pdf-parse no exporta una función ni PDFParse.");
        }

        // Detectar caracteres problemáticos antes de limpiar
        const problematicChars = detectProblematicChars(data.text);
        if (problematicChars.length > 0) {
            console.log("Caracteres problemáticos detectados:", problematicChars);
        }

        // Limpiar el texto: eliminar caracteres no imprimibles y metadatos del PDF
        let cleanedText = data.text
            .replace(/[\r\n]+/g, ' ') // Reemplazar saltos de línea con un espacio
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Eliminar caracteres no imprimibles
            .replace(/["“”]/g, "'") // Reemplazar comillas dobles y curvas con comillas simples
            .replace(/[‘’]/g, "'") // Reemplazar comillas simples curvas
            .replace(/–/g, '-') // Reemplazar guiones largos con guiones cortos
            .replace(/[^\x20-\x7EáéíóúÁÉÍÓÚñÑüÜ.,;:!?¡¿'"\-\(\) ]/g, '') // Eliminar caracteres no deseados
            .replace(/\s+/g, ' ') // Reducir múltiples espacios a uno solo
            .trim();

        // Dividir el texto en párrafos para una mejor estructura
        const paragraphs = cleanedText.split(/(?<=\.)\s+/); 

        // Verificar si hay caracteres problemáticos después de limpiar
        const cleanedProblematicChars = detectProblematicChars(cleanedText);
        if (cleanedProblematicChars.length > 0) {
            console.log("Caracteres problemáticos después de limpiar:", cleanedProblematicChars);
        }

        // Retornar el texto limpio como una lista de párrafos
        return paragraphs;
    } catch (error) {
        console.error("Error al procesar el PDF:", error.message);
        return null;
    }
}

async function processPDFs() {
    const folderPath = path.join(__dirname, "data", "pdfs");
    const outputPath = path.join(__dirname, "data", "peron_docs.json");
    const files = fs.readdirSync(folderPath);

    const documents = [];

    for (const file of files) {
        if (file.endsWith(".pdf")) {
            const text = await extractTextFromPDF(`${folderPath}/${file}`);
            if (text) {
                try {
                    // Crear el objeto del documento
                    const documentObject = {
                        autor: "Juan Domingo Perón",
                        tipo: "discurso",
                        fecha: "Desconocida",
                        tema: "General",
                        texto: text
                    };

                    // Validar el JSON antes de agregarlo
                    JSON.stringify(documentObject);

                    documents.push(documentObject);
                    console.log(`Procesado: ${file}`);
                } catch (jsonError) {
                    console.error(`Error al crear el JSON para el archivo ${file}:`, jsonError.message);
                }
            }
        }
    }

    try {
        // Verificación final del JSON completo
        const jsonString = JSON.stringify(documents, null, 2);
        JSON.parse(jsonString); // Verificar si es un JSON válido

        fs.writeFileSync(outputPath, jsonString, { encoding: "utf8" });
        console.log("Archivos PDF convertidos a JSON con éxito.");
    } catch (error) {
        console.error("Error al guardar el archivo JSON:", error.message);
    }
}

processPDFs();
