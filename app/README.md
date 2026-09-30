# Mi Planner (app)

Implementación real de `project/Mi Planner v2.dc.html`: una web app instalable (PWA) para iPad, en español, estilo Rosa empolvado.

```bash
npm install
npm run dev      # desarrollo
npm run build    # genera dist/ (estático, se sube a cualquier hosting)
```

## Cómo se guardan los datos

- **Al momento:** cada cambio se guarda en `localStorage` y en IndexedDB (dos copias). Si una se pierde, al abrir se usa la más reciente.
- **Al salir:** se fuerza el guardado cuando la app pasa a segundo plano, se bloquea el iPad o se cierra.
- **Copias automáticas diarias** en IndexedDB (últimas 30), restaurables desde *Ajustes → Copias automáticas*.
- **Almacenamiento persistente:** se pide `navigator.storage.persist()` para que el navegador no borre los datos.
- **Pantalla de inicio:** en iPad, «Hoy» muestra un aviso para añadir la app a la pantalla de inicio (así Safari no borra los datos por inactividad).
- **Copia manual:** «Guardar copia» abre el menú de compartir del iPad (guardar en Archivos / iCloud Drive). Si pasan 7 días sin copia, «Hoy» lo recuerda.
- **Restaurar** acepta las copias `.json` del prototipo y de esta app; antes de reemplazar, guarda una copia de seguridad de los datos actuales.
- **Sin conexión:** el service worker (`public/sw.js`) guarda la app en caché.

Importante: los datos van ligados a la dirección (dominio) donde se aloje la app. Publícala en una URL fija y ábrela siempre desde ahí.
