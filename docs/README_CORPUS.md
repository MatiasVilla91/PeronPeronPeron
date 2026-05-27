# Corpus de Perón — Instrucciones

## Dónde poner los PDFs

Copiá los PDFs de escritos de Perón en esta carpeta (`docs/`). El script los va a leer automáticamente.

El nombre del archivo se usa como título de la obra, así que ponele un nombre descriptivo:

```
docs/
  conduccion_politica.pdf
  la_comunidad_organizada.pdf
  mi_doctrina.pdf
  la_fuerza_es_el_derecho_de_las_bestias.pdf
  del_poder_al_exilio.pdf
  ...
```

## Cómo ejecutar

### Primera vez (instalar dependencias)
```bash
pip install requests beautifulsoup4 openai supabase pymupdf
```

### Cargar solo los chunks nuevos (no duplica)
```bash
python build_corpus_peron.py
```

### Limpiar tabla y recargar todo desde cero
```bash
python build_corpus_peron.py --reset
```

## Qué incluye el corpus

El script procesa tres fuentes en orden:

1. **Textos embebidos** — siempre disponibles, no dependen de internet:
   - Las 20 Verdades del Justicialismo (1950)
   - La Comunidad Organizada — Principios (1949)
   - Conducción Política — Conceptos generales (1951)
   - Tercera Posición (1949)
   - Discurso 17 de Octubre 1945
   - Discurso 1° de Mayo 1950
   - Modelo Argentino para el Proyecto Nacional (1974)
   - La Hora de los Pueblos — Los pueblos y el imperialismo (1968)
   - Último discurso 12 de julio 1974
   - Cartas desde el exilio (1960)

2. **PDFs locales** — los archivos que vos ponés en esta carpeta `docs/`

3. **Fuentes web** (descarga al momento de ejecutar):
   - Las 20 Verdades (marxists.org)
   - Modelo Argentino (marxists.org)
   - Tercera Posición (marxists.org)
   - La Hora de los Pueblos — caps. 1, 2 y 3 (marxists.org)
   - Conducción Política completa (marxists.org)
   - Discursos: 17/10/1945, asunción 1946, 1°/5/1974, regreso 1973, último 12/7/1974, mensaje 1955
   - Cartas del exilio 1964
   - Latinoamérica: ahora o nunca (1967)
   - Entrevista con Tomás Eloy Martínez (1970)

## Luego de cargar — recrear el índice en Supabase

Si agregás muchos chunks, el script te va a sugerir el SQL para recrear el índice IVFFlat. Ejecutalo en el **SQL Editor** de Supabase:

```sql
DROP INDEX IF EXISTS peron_documents_embedding_idx;
CREATE INDEX peron_documents_embedding_idx
  ON peron_documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 20);  -- ajustar según cantidad de chunks
```

## Obras recomendadas para agregar como PDF

Si las conseguís, estos son los textos más valiosos para el corpus:

| Obra | Año | Por qué es clave |
|---|---|---|
| La Fuerza es el Derecho de las Bestias | 1956 | Reflexiones del exilio, muy personal |
| Del Poder al Exilio | 1956 | Contexto del golpe del 55 |
| Latinoamérica: ahora o nunca | 1967 | Visión geopolítica |
| Yo, Juan Domingo Perón | 1976 | Autobiografía dictada a Moro |
| La Hora de los Pueblos (completo) | 1968 | Doctrina antiimperialista |
| Mi Doctrina | 1947 | Base ideológica temprana |
| Memorias | varios | Relatos personales |
