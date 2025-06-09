const fs = require("fs");
let peronData = [];

function loadDocuments() {
    try {
        const data = fs.readFileSync("data/peron_docs.json", "utf-8");
        peronData = JSON.parse(data);
        console.log("Documentos cargados correctamente.");
    } catch (error) {
        console.error("Error al cargar documentos:", error.message);
    }
}

function getResponseFromDocs(message) {
    const lowerMessage = message.toLowerCase();

    // Buscar coincidencias en el tema y en el contenido del discurso
    const relevantDocs = peronData.filter(doc => 
        lowerMessage.includes(doc.tema.toLowerCase()) || 
        doc.texto.toLowerCase().includes(lowerMessage)
    );

    if (relevantDocs.length > 0) {
        const selectedDoc = relevantDocs[Math.floor(Math.random() * relevantDocs.length)];
        console.log("Documento encontrado:", selectedDoc);
        return selectedDoc.texto;
    }

    return null;
}

module.exports = { loadDocuments, getResponseFromDocs };
