"""
PERON BOT — Corpus Builder v2
Procesa PDFs locales + textos embebidos + fuentes web,
genera embeddings con OpenAI y los sube a Supabase pgvector.

Uso:
  pip install requests beautifulsoup4 openai supabase pymupdf
  python build_corpus_peron.py

  Para limpiar la tabla antes de recargar:
  python build_corpus_peron.py --reset

Requiere las variables de entorno del backend (o editar CONF abajo).
"""

import os, re, time, sys, argparse
from pathlib import Path

# ── Dependencias ────────────────────────────────────────────
try:
    import requests
    from bs4 import BeautifulSoup
    from openai import OpenAI
    from supabase import create_client
except ImportError:
    sys.exit(
        "Instala dependencias primero:\n"
        "  pip install requests beautifulsoup4 openai supabase pymupdf\n"
    )

# ── Configuración ───────────────────────────────────────────
CONF = {
    "OPENAI_API_KEY":            os.getenv("OPENAI_API_KEY"),
    "SUPABASE_URL":              os.getenv("SUPABASE_URL"),
    "SUPABASE_SERVICE_ROLE_KEY": os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
    "EMBEDDING_MODEL":           "text-embedding-3-small",
    "CHUNK_WORDS":               350,   # palabras por chunk
    "CHUNK_OVERLAP":             50,    # palabras de solapamiento
    "BATCH_SIZE":                20,    # chunks por llamada a OpenAI
    "TABLE":                     "peron_documents",
    "PDF_FOLDER":                Path(__file__).parent / "docs",  # carpeta con los PDFs
}

# ── Fuentes web a descargar ──────────────────────────────────
# Formato: (obra, volumen, capitulo, fecha, url)
OBRAS_WEB = [
    # ── Doctrina y filosofía ────────────────────────────────
    ("Las 20 Verdades del Justicialismo",  "", "Texto completo",          "1950", "https://www.marxists.org/espanol/peron/1950/20verdades.htm"),
    ("Modelo Argentino para el Proyecto Nacional", "", "Texto completo",  "1974", "https://www.marxists.org/espanol/peron/1974/modelo.htm"),
    ("Tercera Posición",                   "", "Texto completo",          "1949", "https://www.marxists.org/espanol/peron/1949/tercera.htm"),
    ("La Hora de los Pueblos",             "", "Cap. 1",                  "1968", "https://www.marxists.org/espanol/peron/1968/hora/index.htm"),
    ("La Hora de los Pueblos",             "", "Cap. 2",                  "1968", "https://www.marxists.org/espanol/peron/1968/hora/cap2.htm"),
    ("La Hora de los Pueblos",             "", "Cap. 3",                  "1968", "https://www.marxists.org/espanol/peron/1968/hora/cap3.htm"),
    ("Conducción Política",                "", "Texto completo",          "1951", "https://www.marxists.org/espanol/peron/conduccion/index.htm"),

    # ── Discursos históricos ─────────────────────────────────
    ("Discursos", "", "17 de Octubre de 1945",          "1945", "https://www.marxists.org/espanol/peron/1945/octubre17.htm"),
    ("Discursos", "", "Asunción Presidencial 1946",     "1946", "https://www.marxists.org/espanol/peron/1946/junio04.htm"),
    ("Discursos", "", "1° de Mayo de 1974",             "1974", "https://www.marxists.org/espanol/peron/1974/mayo01.htm"),
    ("Discursos", "", "Regreso al país 1973",           "1973", "https://www.marxists.org/espanol/peron/1973/junio20.htm"),
    ("Discursos", "", "Último discurso 12 de julio 1974","1974","https://www.marxists.org/espanol/peron/1974/julio12.htm"),
    ("Discursos", "", "Mensaje al pueblo argentino 1955","1955","https://www.marxists.org/espanol/peron/1955/septiembre19.htm"),

    # ── Cartas y mensajes del exilio ─────────────────────────
    ("Cartas desde el exilio", "", "A los compañeros peronistas", "1964", "https://www.marxists.org/espanol/peron/1964/carta.htm"),
    ("Latinoamérica: ahora o nunca",       "", "Texto completo",          "1967", "https://www.marxists.org/espanol/peron/1967/latinoamerica.htm"),

    # ── Entrevistas ──────────────────────────────────────────
    ("Entrevistas", "", "Entrevista con Tomás Eloy Martínez 1970", "1970", "https://www.marxists.org/espanol/peron/1970/entrevista.htm"),
]

# ── Textos embebidos (siempre disponibles, no dependen de red) ──
EMBEDDED_TEXTS = [
    {
        "obra": "Las 20 Verdades del Justicialismo",
        "capitulo": "Texto completo",
        "fecha": "1950",
        "texto": """
1. La verdadera democracia es aquella donde el gobierno hace lo que el pueblo quiere y defiende un solo interés: el del pueblo.
2. El peronismo es esencialmente popular. Todo círculo político es antipopular y, por lo tanto, no es peronista.
3. El peronista trabaja para el movimiento. El que en su nombre sirve a un círculo o a un caudillo, lo es sólo de nombre.
4. No existe para el peronismo más que una sola clase de hombres: los que trabajan.
5. En la Nueva Argentina el trabajo es un derecho que crea la dignidad del hombre y es un deber, porque es justo que cada uno produzca por lo menos lo que consume.
6. Para un peronista no puede haber nada mejor que otro peronista.
7. Ningún peronista debe sentirse más de lo que es, ni ninguno debe sentirse menos de lo que es. Cuando un peronista comienza a sentirse más de lo que es, empieza a convertirse en oligarca.
8. En la acción política la escala de valores de todo peronista es la siguiente: primero la Patria, después el Movimiento y luego los hombres.
9. La política no es para nosotros un fin, sino sólo el medio para el bien de la Patria, que es la felicidad de sus hijos y la grandeza nacional.
10. Los dos brazos del peronismo son la justicia social y la ayuda social. Con ellos damos al pueblo un abrazo de justicia y de amor.
11. El peronismo anhela la unidad nacional y no la lucha. Desea héroes pero no mártires.
12. En la Nueva Argentina los únicos privilegiados son los niños.
13. Un gobierno sin doctrina es un cuerpo sin alma. Por eso el peronismo tiene su propia doctrina política, económica y social: el Justicialismo.
14. El Justicialismo es una nueva filosofía de la vida, simple, práctica, popular, profundamente cristiana y profundamente humanista.
15. Como doctrina política el Justicialismo realiza el equilibrio del derecho del individuo con la comunidad.
16. Como doctrina económica el Justicialismo realiza la economía social, poniéndola al servicio del bienestar social.
17. Como doctrina social el Justicialismo realiza la justicia social, que da a cada persona su derecho en función del bien común.
18. Queremos una Argentina socialmente justa, económicamente libre y políticamente soberana.
19. Constituimos un Gobierno centralizado, un Estado organizado y un pueblo libre.
20. Lo mejor que tenemos en este mundo es el pueblo argentino.
"""
    },
    {
        "obra": "La Comunidad Organizada",
        "capitulo": "Principios Fundamentales",
        "fecha": "1949",
        "texto": """
La comunidad organizada no es una abstracción filosófica sino una realidad viviente que se construye con el esfuerzo cotidiano del pueblo.
El hombre, en tanto ser social, no puede realizarse sino dentro de la comunidad. Fuera de ella es un ser mutilado, incompleto.
La organización de la comunidad supone reconocer que el individuo y la sociedad no se oponen: se complementan.
La justicia social es la condición de posibilidad de la verdadera libertad. Sin justicia, la libertad es solo privilegio de unos pocos.
La doctrina justicialista propone la tercera posición: ni capitalismo que explota al hombre, ni comunismo que lo anula, sino una humanización de la economía al servicio de la persona.
El Estado debe ser árbitro, no propietario. Debe garantizar que ningún interés sectorial se imponga sobre el bien común.
La soberanía económica es inseparable de la soberanía política. Un pueblo que no controla sus recursos naturales no es verdaderamente libre.
El trabajo no es una mercancía: es la expresión más digna de la condición humana. El trabajador no vende su esfuerzo como si fuera un objeto; entrega parte de su vida y merece a cambio justicia y respeto.
La familia es el núcleo de la comunidad organizada. Proteger a la familia es proteger a la Nación entera.
No puede haber paz social duradera donde exista miseria. La pobreza no es solo una tragedia individual; es una amenaza colectiva que el Estado tiene la obligación de resolver.
"""
    },
    {
        "obra": "Conducción Política",
        "capitulo": "Conceptos generales y doctrina del conductor",
        "fecha": "1951",
        "texto": """
La conducción es un arte y como tal no puede enseñarse totalmente; sólo puede cultivarse.
Todo conductor debe conocer a fondo la doctrina que sustenta su acción, pues sin doctrina la conducción es ciega.
El conductor no manda: conduce. Y conducir es llevar a los hombres hacia un objetivo mediante la persuasión y el ejemplo.
La masa no sigue a quien le da órdenes sino a quien le da razones y encarna lo que predica.
Un movimiento político es como un ejército: necesita organización, disciplina y un objetivo claro. Sin esos tres elementos, es solo una multitud.
La política es la ciencia del bien común. El que hace política personal hace mal a la patria.
Para conducir hay que conocer; para conocer hay que observar; para observar hay que estar cerca del pueblo.
El conductor debe ser el primero en el sacrificio y el último en el beneficio. Esa es la regla de oro del liderazgo.
La organización multiplica las fuerzas. Un hombre solo puede hacer poco; mil hombres organizados pueden cambiar la historia.
El conductor no improvisa: estudia, planifica y actúa con decisión cuando llega el momento. La improvisación en política es el camino al fracaso.
La doctrina es el alma del movimiento. Sin ella, el movimiento es solo un tropel que corre sin saber hacia dónde.
"""
    },
    {
        "obra": "Doctrina Peronista",
        "capitulo": "Tercera Posición — Filosofía y política",
        "fecha": "1949",
        "texto": """
La Argentina propone una tercera posición filosófica, política y económica frente a los dos imperialismos que dividen al mundo: el capitalismo y el comunismo.
No somos ni imperialistas ni antiimperialistas: somos una Nación soberana que defiende sus propios intereses.
La justicia social no es caridad: es el reconocimiento de que cada trabajador tiene derecho a participar de la riqueza que contribuye a crear.
Económicamente, proponemos que la riqueza nacional sirva a todos los argentinos y no a unos pocos privilegiados.
Políticamente, defendemos la soberanía irrestricta de la Nación y el derecho de los pueblos a autodeterminarse.
Socialmente, trabajamos para que desaparezcan las diferencias que dividen a los argentinos en clases irreconciliables.
El capitalismo explota al hombre haciéndolo esclavo del dinero. El comunismo lo anula haciéndolo esclavo del Estado. Nosotros queremos que el hombre sea libre y que la economía sirva al hombre, no al revés.
La Tercera Posición no es tibieza ni ambigüedad: es la afirmación de que existe un camino propio, argentino, que no se deja encasillar en los esquemas importados de afuera.
"""
    },
    {
        "obra": "Discursos",
        "capitulo": "17 de Octubre de 1945",
        "fecha": "1945",
        "texto": """
En este día memorable para mí, al volver a reunirme con ustedes, quiero agradecer desde lo más íntimo de mi corazón el inmenso afecto que me demuestran.
Esta reunión extraordinaria demuestra que el pueblo de mi Patria ha comprendido la verdadera lucha que venimos librando.
Les pido que mantengan siempre la calma y la tranquilidad de quienes saben que la razón y la justicia están de su parte.
Hoy les pido que festejemos este día con alegría y que recuerden que el 17 de octubre será en adelante una fecha histórica en que el hombre del trabajo argentino ha levantado su voz y ha triunfado.
Pido que nos vayamos, que no dejemos mancha alguna de sangre en esta jornada gloriosa.
Deseo que vivan en paz, que trabajen, que luchen por el bienestar de sus hogares, que es el bienestar de la Patria.
El trabajo es la base de toda grandeza. El trabajador argentino que hoy se ha reunido aquí es la demostración más elocuente de que este pueblo sabe defender sus derechos con dignidad y con paz.
Durante varios días he estado detenido, separado de ustedes. Pero en ningún momento dudé de que el pueblo argentino respondería como lo ha hecho hoy.
"""
    },
    {
        "obra": "Discursos",
        "capitulo": "1° de Mayo — Día del Trabajador",
        "fecha": "1950",
        "texto": """
El primero de mayo es el día de los trabajadores del mundo entero. En la Argentina es también el día de la justicia social, porque aquí los trabajadores no luchan contra el Estado sino que el Estado lucha junto a los trabajadores.
La diferencia entre la Argentina peronista y los países donde el trabajador es explotado es que acá el Estado no defiende al capital: defiende al pueblo.
El trabajador argentino tiene hoy derechos que antes eran privilegio de unos pocos: vacaciones pagas, aguinaldo, jubilación, obra social, derecho a organizarse y a negociar colectivamente.
Estos derechos no son concesiones del poder: son conquistas del pueblo, y el pueblo debe defenderlas porque siempre habrá quienes quieran arrebatárselas.
La justicia social no es una meta alcanzada: es un camino que hay que recorrer cada día, porque las fuerzas del privilegio nunca descansan.
"""
    },
    {
        "obra": "Modelo Argentino para el Proyecto Nacional",
        "capitulo": "El proyecto nacional y el rol del Estado",
        "fecha": "1974",
        "texto": """
El modelo argentino para el proyecto nacional es la síntesis de todo lo que hemos aprendido en décadas de lucha por la soberanía y la justicia.
La Argentina debe ser un país socialmente justo, económicamente libre y políticamente soberano. Estos tres pilares son inseparables: no puede haber justicia sin libertad económica, ni libertad sin soberanía política.
El Estado tiene un rol activo e insustituible en la organización de la economía nacional. No como propietario de todo, sino como garante del bien común y árbitro entre los intereses sectoriales.
La planificación democrática es la herramienta que permite que el desarrollo económico sirva a todos y no solo a los que ya tienen.
La integración latinoamericana es una necesidad histórica. Los pueblos de América Latina tienen más en común que con los imperios que los dividen.
El año 2000 será el punto de llegada de este proyecto. Para entonces, la Argentina debe haber consolidado su soberanía, su desarrollo industrial y su justicia social.
El movimiento obrero organizado es el pilar del proyecto nacional. Sin los trabajadores, no hay proyecto; con ellos, no hay obstáculo que no pueda superarse.
"""
    },
    {
        "obra": "La Hora de los Pueblos",
        "capitulo": "Los pueblos y el imperialismo",
        "fecha": "1968",
        "texto": """
Los pueblos del mundo se están despertando. Después de siglos de dominación colonial e imperial, las naciones que fueron saqueadas comienzan a reclamar lo suyo.
El imperialismo no es solo una política económica: es una forma de pensar que divide al mundo entre los que mandan y los que obedecen, los que explotan y los que son explotados.
América Latina debe encontrar su propio camino. No el camino que nos dictan desde Washington ni el que nos dictan desde Moscú: el camino que surge de nuestra propia historia, nuestra propia cultura y nuestras propias necesidades.
La liberación nacional no es un acto: es un proceso. Y ese proceso exige organización, doctrina y voluntad de sacrificio.
Los pueblos que no se unen son presa fácil del imperialismo. Por eso la integración latinoamericana no es un ideal romántico: es una necesidad estratégica para la supervivencia de nuestras naciones.
El imperialismo tiene un arma poderosa: la división. Divide a los países entre sí, divide a los partidos, divide a los movimientos. Nuestra respuesta debe ser la unidad.
"""
    },
    {
        "obra": "Discursos",
        "capitulo": "Último discurso — 12 de julio de 1974",
        "fecha": "1974",
        "texto": """
Llevo en mis oídos la más maravillosa música que para mí es la palabra del pueblo argentino.
Tengo que decirles que soy un hombre de paz. Siempre he trabajado por la paz, y en esta lucha he perdido mi salud. Pero no me arrepiento.
He entregado lo mejor de mí a este pueblo que me ha dado la fuerza para seguir en pie en los momentos más difíciles del exilio y de la lucha.
La patria está en peligro cuando sus hijos se dividen. La patria se salva cuando sus hijos se unen bajo las banderas de la justicia y de la soberanía.
Les pido que cuiden la unidad del Movimiento. Les pido que cuiden la paz. Les pido que cuiden a la Patria.
Yo llevo en el corazón este cariño del pueblo argentino, y sé que el pueblo argentino lleva en el corazón el ideal de justicia que hemos construido juntos durante décadas.
Que Dios los bendiga a todos. Que Dios bendiga a la Patria argentina.
"""
    },
    {
        "obra": "Cartas desde el exilio",
        "capitulo": "A los compañeros del Movimiento",
        "fecha": "1960",
        "texto": """
Desde este exilio que me ha sido impuesto por los que temen al pueblo, les escribo para decirles que el peronismo no muere porque es el pueblo mismo.
Los que creyeron que derrocando un gobierno derrocaban una doctrina se equivocaron. La doctrina vive en el corazón de cada trabajador, de cada madre, de cada argentino que sabe lo que fue tener un país con justicia.
No abandonen la lucha. No se dejen dividir. La unidad del Movimiento es la condición de su fuerza.
Recuerden: somos muchos y tenemos razón. Y cuando un pueblo numeroso tiene razón, tarde o temprano la historia le da la razón.
El regreso no es mío solamente: es el regreso de todos los que fueron despojados de su dignidad, de sus derechos, de su gobierno legítimo.
Mantengan la fe. Mantengan la organización. Mantengan el amor a la Patria por encima de todo.
"""
    },
]

# ── Funciones auxiliares ─────────────────────────────────────

def chunk_text(text, max_words=350, overlap=50):
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = min(start + max_words, len(words))
        chunk = " ".join(words[start:end]).strip()
        if len(chunk) > 80:
            chunks.append(chunk)
        if end >= len(words):
            break
        start = end - overlap
    return chunks


def clean_text(text):
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    return text.strip()


def fetch_html_text(url, timeout=20):
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    resp = requests.get(url, headers=headers, timeout=timeout)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
        tag.decompose()
    return clean_text(soup.get_text(separator=" "))


def extract_pdf_text(pdf_path):
    """Extrae texto de un PDF usando pymupdf (fitz). Fallback: pdfminer."""
    try:
        import fitz  # pymupdf
        doc = fitz.open(str(pdf_path))
        pages_text = []
        for page in doc:
            pages_text.append(page.get_text())
        doc.close()
        return clean_text("\n".join(pages_text))
    except ImportError:
        pass

    # Fallback: pdfminer
    try:
        from pdfminer.high_level import extract_text
        return clean_text(extract_text(str(pdf_path)))
    except ImportError:
        print(f"  ⚠ Ninguna librería PDF disponible. Instalá: pip install pymupdf")
        return ""


def get_existing_content_hashes(supa, table):
    """Obtiene los primeros 60 caracteres de cada chunk ya en Supabase para evitar duplicados."""
    try:
        result = supa.table(table).select("content").execute()
        return {row["content"][:60] for row in result.data}
    except Exception as e:
        print(f"  ⚠ No se pudo obtener hashes existentes: {e}")
        return set()


def embed_batch(client, texts):
    resp = client.embeddings.create(model=CONF["EMBEDDING_MODEL"], input=texts)
    return [item.embedding for item in resp.data]


def upload_rows(supa, rows):
    return supa.table(CONF["TABLE"]).insert(rows).execute()


# ── Main ─────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true",
                        help="Borra todos los registros de la tabla antes de cargar")
    args = parser.parse_args()

    print("=== PERON BOT — Corpus Builder v2 ===\n")

    openai_client = OpenAI(api_key=CONF["OPENAI_API_KEY"])
    supa          = create_client(CONF["SUPABASE_URL"], CONF["SUPABASE_SERVICE_ROLE_KEY"])

    # ── Reset opcional ────────────────────────────────────────
    if args.reset:
        confirm = input("⚠ ¿Seguro que querés borrar toda la tabla peron_documents? (s/N): ")
        if confirm.lower() == "s":
            supa.table(CONF["TABLE"]).delete().neq("id", 0).execute()
            print("  → Tabla vaciada.\n")
        else:
            print("  → Reset cancelado.\n")

    # ── Cargar hashes existentes para deduplicar ──────────────
    print("Verificando chunks existentes en Supabase...")
    existing_hashes = get_existing_content_hashes(supa, CONF["TABLE"])
    print(f"  → {len(existing_hashes)} chunks ya en la tabla.\n")

    all_rows = []

    # ── 1. Textos embebidos ────────────────────────────────────
    print("Procesando textos embebidos...")
    for entry in EMBEDDED_TEXTS:
        chunks = chunk_text(entry["texto"], CONF["CHUNK_WORDS"], CONF["CHUNK_OVERLAP"])
        added = 0
        for i, chunk in enumerate(chunks):
            if chunk[:60] in existing_hashes:
                continue
            all_rows.append({
                "obra":        entry["obra"],
                "capitulo":    entry["capitulo"],
                "fecha":       entry["fecha"],
                "chunk_index": i,
                "idioma":      "es",
                "content":     chunk,
                "embedding":   None,
            })
            added += 1
        if added:
            print(f"  {entry['obra']} — {entry['capitulo']}: {added} chunks nuevos")
    print(f"  → Subtotal hasta aquí: {len(all_rows)} chunks\n")

    # ── 2. PDFs locales ────────────────────────────────────────
    pdf_folder = CONF["PDF_FOLDER"]
    pdf_files  = list(pdf_folder.glob("*.pdf")) if pdf_folder.exists() else []

    if pdf_files:
        print(f"Procesando {len(pdf_files)} PDF(s) en {pdf_folder}...")
        for pdf_path in sorted(pdf_files):
            print(f"  Leyendo: {pdf_path.name}")
            text = extract_pdf_text(pdf_path)
            if len(text) < 100:
                print(f"    ⚠ Texto muy corto o sin texto extraíble, saltando.")
                continue
            chunks = chunk_text(text, CONF["CHUNK_WORDS"], CONF["CHUNK_OVERLAP"])
            # Nombre del archivo como título de obra (sin extensión)
            obra_name = pdf_path.stem.replace("_", " ").replace("-", " ").title()
            added = 0
            for i, chunk in enumerate(chunks):
                if chunk[:60] in existing_hashes:
                    continue
                all_rows.append({
                    "obra":        obra_name,
                    "capitulo":    f"PDF — {pdf_path.name}",
                    "fecha":       "",
                    "chunk_index": i,
                    "idioma":      "es",
                    "content":     chunk,
                    "embedding":   None,
                })
                added += 1
            print(f"    → {added} chunks nuevos de {len(chunks)} totales")
        print()
    else:
        print(f"No se encontraron PDFs en {pdf_folder}")
        print("  → Copiá tus PDFs ahí para incluirlos en el corpus.\n")

    # ── 3. Fuentes web ─────────────────────────────────────────
    print("Descargando fuentes web...")
    for obra, volumen, capitulo, fecha, url in OBRAS_WEB:
        print(f"  {obra} — {capitulo}")
        try:
            text = fetch_html_text(url)
            if len(text) < 200:
                print(f"    ⚠ Texto muy corto ({len(text)} chars), ignorando.")
                continue
            chunks = chunk_text(text, CONF["CHUNK_WORDS"], CONF["CHUNK_OVERLAP"])
            added = 0
            for i, chunk in enumerate(chunks):
                if chunk[:60] in existing_hashes:
                    continue
                all_rows.append({
                    "obra":        obra,
                    "volumen":     volumen,
                    "capitulo":    capitulo,
                    "fecha":       fecha,
                    "chunk_index": i,
                    "idioma":      "es",
                    "content":     chunk,
                    "embedding":   None,
                })
                added += 1
            print(f"    → {added} chunks nuevos")
            time.sleep(0.6)
        except Exception as e:
            print(f"    ✗ Error ({e}), saltando.")

    print(f"\nTotal chunks nuevos a procesar: {len(all_rows)}")

    if not all_rows:
        print("\n✅ No hay chunks nuevos. La tabla ya está actualizada.")
        return

    # ── 4. Generar embeddings ──────────────────────────────────
    print("\nGenerando embeddings con OpenAI...")
    batch_size = CONF["BATCH_SIZE"]
    total_batches = (len(all_rows) + batch_size - 1) // batch_size
    for i in range(0, len(all_rows), batch_size):
        batch  = all_rows[i:i + batch_size]
        texts  = [r["content"] for r in batch]
        batch_n = i // batch_size + 1
        try:
            vectors = embed_batch(openai_client, texts)
            for j, row in enumerate(batch):
                row["embedding"] = vectors[j]
            print(f"  Batch {batch_n}/{total_batches} ✓")
        except Exception as e:
            print(f"  ✗ Error en batch {batch_n}: {e}")
        time.sleep(0.3)

    # ── 5. Subir a Supabase ────────────────────────────────────
    print("\nSubiendo a Supabase...")
    ready      = [r for r in all_rows if r.get("embedding")]
    chunk_size = 50
    uploaded   = 0
    for i in range(0, len(ready), chunk_size):
        batch = ready[i:i + chunk_size]
        try:
            upload_rows(supa, batch)
            uploaded += len(batch)
            print(f"  Subidos {uploaded}/{len(ready)}")
        except Exception as e:
            print(f"  ✗ Error subiendo batch: {e}")

    print(f"\n✅ Corpus de Perón actualizado. {uploaded} chunks nuevos en '{CONF['TABLE']}'.")
    total_ahora = len(existing_hashes) + uploaded
    print(f"   Total estimado en tabla: ~{total_ahora} chunks.")

    if total_ahora > 50:
        print("\n💡 Con más de 50 chunks, conviene recrear el índice IVFFlat:")
        lists_val = max(10, total_ahora // 10)
        print(f"""
  -- Ejecutar en Supabase SQL Editor:
  DROP INDEX IF EXISTS peron_documents_embedding_idx;
  CREATE INDEX peron_documents_embedding_idx
    ON peron_documents
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = {lists_val});
""")


if __name__ == "__main__":
    main()
