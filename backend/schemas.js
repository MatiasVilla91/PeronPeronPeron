
// 📁 validation/schemas.js
const Joi = require('joi');

// 📌 Esquema para consultas legales
const consultaSchema = Joi.object({
    pregunta: Joi.string().min(5).required().messages({
        'string.empty': 'La pregunta no puede estar vacía.',
        'string.min': 'La pregunta debe tener al menos 5 caracteres.',
        'any.required': 'La pregunta es obligatoria.'
    })
});

// 📌 Esquema para generación de contratos
const contratoSchema = Joi.object({
    mensaje: Joi.string().min(10).required().messages({
        'string.empty': 'El mensaje no puede estar vacío.',
        'string.min': 'El mensaje debe tener al menos 10 caracteres.',
        'any.required': 'El mensaje es obligatorio.'
    })
});

// 📌 Esquema para modificaciones en contrato.json
const modificacionesSchema = Joi.object({
    modificaciones: Joi.string().min(5).required().messages({
        'string.empty': 'Debes indicar las modificaciones.',
        'string.min': 'Las modificaciones deben tener al menos 5 caracteres.',
        'any.required': 'El campo de modificaciones es obligatorio.'
    })
});

module.exports = {
    consultaSchema,
    contratoSchema,
    modificacionesSchema
};
