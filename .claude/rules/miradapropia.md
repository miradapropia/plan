# miradapropia · reglas de la casa

versión: v2 · 2026-10-15. es copia de la skill director-miradapropia de claude.ai y la pone al día dirección en todos los repos a la vez: no la edites aquí. si una regla no encaja, déjalo como nota para dirección.

este repo es una de las herramientas gratuitas de miradapropia.org, la plataforma en español de formación en arquitectura. miquel angel dirige y tú ejecutas.

## cómo encaja con lo demás
- orden de mando: lo que diga miquel angel en la sesión > estas reglas > el CLAUDE.md del repo, que es el manual técnico de la herramienta y manda en lo técnico. si choca con estas reglas en lo de la casa (marca, voz, verdad, datos), mandan estas.
- nota para dirección: si lo que haces afecta a otro proyecto (otra herramienta, el sistema de diseño o el pie común, la web, un vídeo, la monetización) o a estas reglas, añade al final del mensaje del commit una línea `Nota-para-direccion: a quién afecta y qué cambia`, y dilo también al final de tu respuesta.

## reglas de la casa

### 2.2 quién habla
- firma: miradapropia, nunca un nombre personal.
- credenciales: "con estudios de arquitectura y experiencia profesional en estudios y construcción internacional". nunca "arquitecto en activo" ni arquitecto colegiado o en ejercicio.

### 2.3 cómo se habla
- tuteo, directo y sin relleno; didáctico sin condescendencia.
- español de españa con un sinónimo latinoamericano la primera vez que sale el término (pilar/columna, hormigón/concreto, forjado/losa, ordenador/computadora, portátil/laptop), y referencias que se entiendan a los dos lados del atlántico.
- analogías cotidianas como puerta de entrada, que siempre aterrizan en el mecanismo técnico real.
- historias verdaderas y al servicio de lo técnico: nunca inventadas, y con estudios, clientes, obras y personas identificables anonimizados.
- frase núcleo: "solo hay que aprender a verlo".

### 2.4 verdad
- nada inventado: ni datos, ni anécdotas, ni métricas. si falta un número real, se escribe "pendiente de dato real". un gráfico esquemático lleva "esquema, no dato".
- solo información verificada: mejor poco y correcto que relleno sin verificar.
- sin imágenes ni b-roll generados por ia: capturas reales de verificación.
- la honestidad va antes que la comisión ("espera a octubre para comprar portátil", aunque cueste afiliación).

### 2.5 programas
- en miradapropia solo se usan affinity y autocad (vídeos, cursos y tutoriales).
- al recomendar, software gratuito o con licencia de estudiante antes que de pago.

### 2.6 diseño
- inter; blanco y negro estricto, sin color de acento; líneas de 1px. firma: cursor de punto y marcas de esquina.
- casi negro #0a0a0a en la web, los decks y las piezas. en las herramientas mandan los tokens de mp.css v1 (fuente canónica en el repo de guia), también en radios, sombras y movimiento.
- sin emojis en ningún sitio, tampoco en prompts de ia.
- minúsculas en interfaz, textos cortos, títulos de wordpress, extractos, media kit y propuestas a marcas; mayúsculas y puntuación normales en narraciones y cuerpos de artículo.
- insignias de serie, abajo a la izquierda y con el número del episodio dentro, en blanco: herramientas, dos líneas horizontales; construcción, un rectángulo sin el lado de abajo; consejos, dos paréntesis; obras, el cajetín (rectángulo con una división vertical; el número, en la zona grande). se usan los svg de `D:\000_miradapropia\web\`, nunca redibujados a ojo. el logo de rotulador va en un cuadrado blanco abajo a la derecha, tal cual, nunca invertido.
- miniaturas de youtube: blanco y negro puro. fondo negro, inter black 900, imágenes desaturadas y recortadas con borde blanco, anotaciones técnicas, insignia y logo.
- color, solo como excepción registrada: en vídeos y decks, rojo solo como marca de corrección; en herramientas, color funcional solo si hace falta para leer un dato o una categoría, siempre con texto o icono, con paleta cerrada y desaturada, nunca en la interfaz general y anotado en el CLAUDE.md del repo.

### 2.7 datos y privacidad
- primero, que las herramientas se usen. la instrumentación anónima se instala una vez por herramienta, de paso, cuando se toque por otro motivo; el análisis con ia espera a h2, cuando haya volumen.
- rgpd: clasificar y agregar al recoger y descartar el texto crudo; nunca datos ligados a una persona identificable; consentimiento y política de privacidad visibles; transparencia ("guia mejora con tus preguntas anónimas"), nunca recogida silenciosa.

## herramientas

### 3.4 herramientas
- mantener y mejorar las que hay, e instrumentarlas; ninguna herramienta nueva sin pasar por dirección.
- gratuitas y pensadas para el estudiante sin presupuesto. nada que añada un coste mensual (servicios, apis, planes) sin pasar por dirección.
- todo lo citable va en el html servido; optimizar para buscadores e ia nunca cambia cómo funciona la herramienta.
- todo en español: interfaz, commits, comentarios de código y documentación.
- sistema de diseño: mp.css v1, con la fuente canónica en el repo de guia; el pie compartido del ecosistema es el mismo en todas.
- claves de api y tokens, en las variables de entorno de netlify: nunca en el repo ni en el navegador. si una sale en un chat, se rota.
- antes de subir a main, el build de la herramienta pasa.
- el CLAUDE.md de cada repo es su manual técnico y manda en lo técnico; estas reglas, en lo de la casa.

## el ecosistema

### herramientas (repo → dirección)
- guIA → gu-ia.miradapropia.org
- plan → plan.miradapropia.org
- comparador-portatiles-accesorios → comparador-portatiles.miradapropia.org
- universidades → universidades.miradapropia.org
- entregas → entregas.miradapropia.org
- estructuras-elu → estructuras-elu.miradapropia.org
- asistente-software → asistente-software.miradapropia.org
- convertidor-escala → escalas.miradapropia.org
- punto-de-rocio-glaser → calculadora-punto-rocio.miradapropia.org
- programa-necesidades → superficies.miradapropia.org
- sistema-proporciones → proporciones.miradapropia.org
- alta en la newsletter: newsletter.miradapropia.org.
- comparador-portatiles-2.0 está congelado: no se toca, porque en netlify despliega el último push y podría tapar el comparador vivo.
- no existen, aunque salgan en documentos viejos: elu., guia. y herramientas.miradapropia.org.
- cadena de autoridad: portada → páginas de wordpress → herramientas.
