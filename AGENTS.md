# AGENTS.md

## Qué es microdisplay?

microdisplay es un editor visual para crear diseños de interfaces para pantallas OLED en microcontroladores, usando librerías como U8G2 y, más adelante, Adafruit_GFX.

El objetivo inicial es permitir diseñar pantallas OLED monocromáticas, previsualizarlas y exportar código U8G2 limpio.

## Stack
- Tauri
- Vite
- React
- TypeScript
- Rust (para app local)

## Scope del proyecto

Meta inicial: 
- Pantallas monocromáticas OLED 
- Vista previa de código u8g2
- Exportar código u8g2
- Proyectos cargables/guardables en .json

FUERA de alcance:
- Features estilo SaaS (compartir proyectos, colaboración en tiempo real, sinc. con la nube, etc)

# Reglas de arquitectura
- La lógica central SOLO debe depender del modelo de datos, esquemas y funciones propias del proyecto. No debe depender de React, Tauri, DOM, HTML Canvas ni APIs del sistema.
- No llamar APIs de Tauri fuera de platform/tauri.
- No mezclar renderer visual con exporter de código.
- Mantener U8G2 como único target inicial.
- Mantener lógica específica de U8G2 separada del modelo general.
- Evitar overengineering y abstracciones prematuras.
- No crear un archivo por cada función si no es necesario.
- Mantener cambios pequeños y revisables.

## Preferencias de flujo

Antes de escribir código...
- Explica el cambio que harás y por qué es necesario
- Piensa, ¿esto cumple con las reglas definidas en AGENTS.md? Si no las cumple, frena en seco y reevalúa tu enfoque
- Identifica archivos a modificar
- Mantén los cambios pequeños y agrupables por un objetivo
- Añade o actualiza tests cuando sea razonable

Después de escribir código...
- Explica qué cambiaste, por qué lo cambiaste y cómo lo hiciste
- Define si este cambio constituye un refactor, una nueva feature o una corrección de bug
- Decide si lo que acabas de hacer cumple un objetivo completo digno de un commit, o es un paso intermedio que debería combinarse con otros cambios relacionados
- Menciona riesgos o cosas a tener en cuenta
- Concluye con qué tareas quedan pendientes o qué sigue después de este cambio
