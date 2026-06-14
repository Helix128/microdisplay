# Roadmap

## v0.1 — Bases del proyecto
- modelos de datos
- esquemas en Zod
- proyecto default
- framebuffer monocromo
- definir figuras básicas: rect, line, circle
- vista previa en Canvas HTML
- proyecto de ejemplo .microdisplay.json para pruebas

## v0.2 — Editor básico
- selección de objetos
- mover objetos
- redimensionar rectángulos/círculos
- panel lateral de propiedades
- añadir objetos
- eliminar objetos
- snap a píxel/grilla

## v0.3 — Exportación y persistencia
- exportar código U8g2 básico para figuras
- vista previa de código generado
- descargar proyecto en formato .json
- cargar proyecto desde .json
- validación de proyecto cargado con Zod

## v0.4 — Renderizado de texto U8g2
- agregar modelo TextElement
- catálogo de fuentes U8g2
- carga de fuente inicial
- renderizador de texto U8g2
- baseline correcto
- métricas de texto: ancho, ascent, descent
- soporte inicial para drawStr
- exportación U8g2 para texto