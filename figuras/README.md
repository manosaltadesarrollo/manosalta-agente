# Figuras interactivas

Figuras explicativas hechas con la skill `anatomy` (`.claude/skills/anatomy`). Cada carpeta tiene la página lista para abrir en el navegador, en tema oscuro y claro (`-light`), y el script que la genera.

| Carpeta | Qué muestra |
|---|---|
| `tunel-carpiano/` | Banco de prueba del túnel carpiano: huesos del carpo, ligamento transverso, 9 tendones flexores, nervio mediano y cubital, manómetro de presión y dedos con luces. Se puede flexionar o extender la muñeca, inflamar los tendones y liberar el ligamento. |
| `tfcc-pronosupinacion/` | Complejo del fibrocartílago triangular visto desde distal: el radio gira alrededor del cúbito; disco translúcido y haces radiocubitales superficiales (a la estiloides) y profundos (a la fóvea), con el patrón de tensión de Hagert. |

## Regenerar una figura

Requiere Node.js 20.10 o posterior. Desde la carpeta de la figura:

```bash
node build.mjs
```

```bash
node build.mjs --light
```

Los valores y fuentes de cada figura están en el texto que aparece debajo de ella.
