# Biofactory: Lunar — Guía de Skills Globales de Assets IA

Este documento explica cómo usar las skills globales `plant-loop-pipeline`, `module-fx-pipeline` y `layered-fx-compositing` dentro de Biofactory: Lunar, con ejemplos de prompts y una forma simple de validarlas antes de integrar assets al juego.

La idea no es generar imágenes sueltas sin criterio. La idea es usar IA con un pipeline claro para producir pruebas visuales, seleccionar variantes útiles, limpiarlas y recién después promoverlas dentro del flujo del proyecto.

## Quick Path

1. Elegí el tipo de asset que querés probar.
2. Usá la skill global correcta junto con `biofactory-lunar-assets`.
3. Guardá pruebas y prompts en `production-assets/raw`.
4. Limpiá y normalizá en `production-assets/edited`.
5. Promové solo variantes aprobadas a `production-assets/final`.
6. Recién cuando el asset esté validado, integralo en `src/assets`.

## Regla Base Del Proyecto

Antes de usar cualquiera de estas skills, mantené estas reglas de Biofactory: Lunar:

- Usar siempre el pipeline `production-assets/raw -> production-assets/edited -> production-assets/final -> src/assets`.
- No meter prompts, descartes o variantes crudas en `src/assets`.
- Usar nombres en `lowercase_snake_case`.
- Respetar prefijos del proyecto: `crop_`, `module_`, `machine_`, `fx_`, `placeholder_`.
- Placeholders primero. Final art no debe bloquear el MVP.

La skill de proyecto que acompaña a estas tres skills globales es `biofactory-lunar-assets`.

## Qué Hace Cada Skill

| Skill | Cuándo usarla | Qué produce |
|---|---|---|
| `plant-loop-pipeline` | Plantas, cultivos vivos, bloom, growth, emisión orgánica | loops orgánicos no pixelart |
| `module-fx-pipeline` | Pulsos, humo, vapor, glow, chispas, charge-up, bursts de módulos | FX de módulos y máquinas |
| `layered-fx-compositing` | Cuando un efecto necesita varias capas separadas | comp final con capas y export reutilizable |
| `biofactory-lunar-assets` | Siempre que el asset vaya a vivir en este proyecto | naming, pipeline, timing de integración |

## Regla De Selección Rápida

- Si el protagonista es una planta o cultivo, empezá con `plant-loop-pipeline`.
- Si el protagonista es un módulo, extractor, reactor o máquina, empezá con `module-fx-pipeline`.
- Si ya tenés varias capas buenas y querés combinarlas en una salida controlable, usá `layered-fx-compositing`.
- Si el asset va a terminar en Biofactory: Lunar, sumá siempre `biofactory-lunar-assets` al pedido.

## Flujo Recomendado

### 1. Generación base

Primero generá la pieza o el loop principal.

Ejemplos:

- planta respirando o creciendo
- módulo con glow activo
- humo de ventilación
- emisión biológica

Salida esperada en esta etapa:

- variantes crudas en `production-assets/raw/generated/`
- prompts de prueba en una carpeta de trabajo o en un `.md`
- selección de una variante canónica

### 2. Limpieza y normalización

Después limpiá el alpha, el framing, la duración del loop, el anclaje y la legibilidad a tamaño gameplay.

Salida esperada:

- variantes editadas en `production-assets/edited/`
- una versión candidata estable

### 3. Composición por capas

Si el efecto necesita capas separadas, componelo recién después de tener buenos pases.

Ejemplos de capas:

- cuerpo de planta
- glow interno
- emisión de esporas
- humo de ventilación
- partículas energéticas
- distortion suave

Salida esperada:

- stack documentado
- versión layered
- fallback flatten si hace falta por performance

### 4. Promoción a final

Cuando el asset ya está validado, movelo a `production-assets/final/` siguiendo la estructura del proyecto.

Ejemplos:

- `production-assets/final/phaser/crops/`
- `production-assets/final/phaser/modules/`
- `production-assets/final/phaser/fx/`

## Estructura Recomendada Para Pruebas

Podés usar una estructura simple como esta:

```text
production-assets/
  raw/
    generated/
      crop_spore_pod_loop_v01/
      module_bioreactor_fx_v01/
  edited/
    cleaned/
    resized/
  final/
    phaser/
      crops/
      modules/
      fx/
```

## Cómo Pedirle Las Skills A Codex

La forma más robusta es pedir explícitamente la skill y el contrato del asset.

Tu prompt debería incluir siempre:

1. Qué skill querés usar.
2. Qué asset querés generar.
3. Qué rol cumple en Biofactory: Lunar.
4. Dónde debe guardarse dentro de `production-assets`.
5. Qué forma de salida querés: PNG sequence, atlas, WebM, layered passes.
6. Cómo vas a validarlo.

## Plantilla Corta De Prompt

```text
Use `biofactory-lunar-assets` and `<skill-name>`.

Create a test asset for Biofactory: Lunar.
Asset type: <plant loop | module fx | layered comp>
Gameplay role: <what the player should understand>
Visual goal: <style, palette, motion>
Output target: <raw / edited / final path>
Export format: <PNG sequence / atlas / WebM / layered passes>
Validation: readable at gameplay size, clean alpha, stable identity, fits project naming and asset pipeline.
```

## Ejemplos De Prompt

Los prompts están en inglés porque suelen funcionar mejor como artefacto operativo, pero la explicación del flujo queda en español.

### Ejemplo 1: Plant Idle Loop

Usar cuando querés probar una planta viva con un loop respirando o pulsando.

```text
Use `biofactory-lunar-assets` and `plant-loop-pipeline`.

Create a non-pixelart plant idle loop test asset for Biofactory: Lunar.

Asset name: crop_spore_pod_idle_loop_v01
Gameplay role: a greenhouse crop that looks alive and slightly pressurized, but remains readable as a stable planted unit.
Visual direction: biotech plant pod, soft organic breathing, subtle membrane pulse, faint cyan bioluminescent veins, no aggressive motion.
Camera: static.
Loop type: seamless idle loop.
Output pipeline:
- raw variants in production-assets/raw/generated/crop_spore_pod_idle_loop_v01/
- cleaned candidate in production-assets/edited/cleaned/
- approved export in production-assets/final/phaser/crops/
Export target: PNG sequence or short WebM loop with transparency.
Validation:
- readable at gameplay size
- stable planted base
- no silhouette drift
- clean alpha on dark and light backgrounds
- naming follows Biofactory Lunar asset rules
```

### Ejemplo 2: Plant Production Loop

Usar cuando la planta tiene que comunicar producción, bloom o emisión.

```text
Use `biofactory-lunar-assets` and `plant-loop-pipeline`.

Create a non-pixelart production loop test asset for Biofactory: Lunar.

Asset name: crop_protein_bloom_production_loop_v01
Gameplay role: a crop entering a productive state, visually communicating that it is ready or actively generating biomass.
Visual direction: organic bloom opening, slow internal glow pulse, subtle pollen-like emission, no explosive motion.
Camera: static.
Loop type: short production loop.
Output pipeline:
- raw variants in production-assets/raw/generated/crop_protein_bloom_production_loop_v01/
- cleaned candidate in production-assets/edited/cleaned/
- approved export in production-assets/final/phaser/crops/
Export target: layered passes preferred if emission needs separate tuning.
Validation:
- production state is readable in under one second
- emission does not hide the plant body
- loop feels intentional, not random
- clean alpha and stable framing
```

### Ejemplo 3: Module Idle FX

Usar para glow, vapor o actividad leve en un módulo.

```text
Use `biofactory-lunar-assets` and `module-fx-pipeline`.

Create a non-pixelart module idle FX test asset for Biofactory: Lunar.

Asset name: fx_module_bioreactor_idle_pulse_v01
Gameplay role: show that the bioreactor is powered and operating normally.
Host object: greenhouse bioreactor module.
Visual direction: soft cyan core pulse, low-density steam vent, gentle status glow, clean sci-fi biotech look.
Camera: static.
Loop type: seamless idle loop.
Output pipeline:
- raw variants in production-assets/raw/generated/fx_module_bioreactor_idle_pulse_v01/
- cleaned candidate in production-assets/edited/cleaned/
- approved export in production-assets/final/phaser/fx/
Export target: layered passes if glow and steam need separate control.
Validation:
- module remains readable beneath the effect
- no over-bright bloom
- venting stays inside safe bounds
- effect works on dark and light backgrounds
```

### Ejemplo 4: Module Burst / Production FX

Usar para un momento corto, como procesamiento, extracción o descarga.

```text
Use `biofactory-lunar-assets` and `module-fx-pipeline`.

Create a non-pixelart burst FX test asset for Biofactory: Lunar.

Asset name: fx_machine_extractor_output_burst_v01
Gameplay role: communicate a successful extraction or output event from a processing machine.
Host object: botanical extractor module.
Visual direction: contained pressure release, short amber energy flare, brief particle burst, subtle vapor decay.
Camera: static.
Loop type: one-shot burst.
Output pipeline:
- raw variants in production-assets/raw/generated/fx_machine_extractor_output_burst_v01/
- cleaned candidate in production-assets/edited/cleaned/
- approved export in production-assets/final/phaser/fx/
Export target: PNG sequence or atlas.
Validation:
- event reads clearly and quickly
- no frame clipping
- burst does not hide the host machine for too long
- safe alpha and stable centroid
```

### Ejemplo 5: Layered Compositing

Usar cuando ya tenés varias capas buenas y querés empaquetarlas juntas.

```text
Use `biofactory-lunar-assets` and `layered-fx-compositing`.

Compose a layered production effect for Biofactory: Lunar.

Effect name: fx_module_greenhouse_active_stack_v01
Host object: greenhouse growth module.
Source passes:
- base module glow pass
- soft vent smoke pass
- organic spore emission pass
- light particle pass
Goal: assemble a readable active-state effect that looks alive and productive without hiding the greenhouse module.
Export target:
- layered master package in production-assets/final/phaser/fx/
- flattened fallback if runtime budget requires it
Validation:
- ordered layer stack is documented
- blend modes are justified
- module silhouette remains readable at gameplay size
- effect still works over representative game backgrounds
```

## Qué Validar Antes De Aceptar Un Asset

## Checklist General

- [ ] El asset comunica su estado de gameplay en menos de un segundo.
- [ ] La silueta principal sigue siendo legible a tamaño gameplay.
- [ ] No hay halo sucio, fondo roto ni alpha contaminado.
- [ ] El loop no tiene corte evidente al reiniciar.
- [ ] El nombre sigue `lowercase_snake_case` y usa el prefijo correcto.
- [ ] El asset está en `production-assets`, no en `src/assets`.

## Checklist Para Plantas

- [ ] La base plantada se mantiene estable.
- [ ] El loop no cambia de especie, forma o etapa por error.
- [ ] La emisión no tapa la planta.
- [ ] El movimiento no parece ruido aleatorio.

## Checklist Para FX De Módulos

- [ ] El módulo sigue entendiéndose debajo del FX.
- [ ] Glow, humo y partículas no compiten entre sí.
- [ ] No hay flicker de color o forma entre frames.
- [ ] El efecto respeta safe bounds alrededor del módulo.

## Checklist Para Composición Por Capas

- [ ] Cada capa tiene un trabajo claro.
- [ ] El orden de capas está documentado.
- [ ] Hay una versión layered y, si hace falta, una fallback flatten.
- [ ] La comp no está sobrecargada ni más brillante de lo necesario.

## Errores Comunes

- Generar todo en una sola pasada cuando el efecto pide capas separadas.
- Aceptar una variante linda en zoom pero ilegible en gameplay.
- Integrar assets crudos directo a `src/assets`.
- Mezclar prompts, referencias y finales en la misma carpeta.
- Usar nombres genéricos como `effect_final.png` o `plant_new_02.png`.

## Flujo De Validación Recomendado

1. Generá 3 a 4 variantes crudas.
2. Elegí una variante canónica.
3. Verificala a tamaño gameplay.
4. Limpiá alpha, framing y duración.
5. Si hay varias capas, componelas y probalas sobre fondos reales.
6. Promové solo la mejor versión a `production-assets/final`.
7. Integrá a `src/assets` únicamente cuando el milestone realmente lo necesite.

## Próximos Pasos Recomendados

- Empezar con una planta idle y un módulo idle FX, porque son las pruebas menos riesgosas.
- Probar composición por capas solo después de tener buenos pases individuales.
- Mantener un pequeño set de prompts aprobados por familia de asset para no reinventar el pipeline cada vez.

## Referencias Del Proyecto

- `skills/biofactory-lunar-assets/SKILL.md`
- `docs/03_assets/12_ASSET_PIPELINE_AND_NAMING.md`
- `docs/03_assets/ASSET_CHECKLIST.md`
- `docs/01_architecture/08_PHASER_SCENE_AND_VISUAL_LAYER.md`
