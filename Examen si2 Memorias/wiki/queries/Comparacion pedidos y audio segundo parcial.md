---
tipo: query
fuentes: 2
actualizado: 2026-11-08
tags: [segundo-parcial, comparacion, requisitos]
---

# Comparación: pedidos compartidos y transcripción del segundo parcial

Fuentes: [[pedidos-segundo-parcial-2026-11-08]] y [[transcripcion-audio-segundo-parcial]]. La transcripción ofrece más detalle, aunque contiene fragmentos cortados o errores de transcripción. [[Pendientes segundo parcial]] conserva la lista inicial; [[Mapa del segundo parcial]] desarrolla los requisitos extraídos del audio.

| Tema | Contraste |
|---|---|
| Continuidad | Coinciden: presentar las funciones del primer parcial más los incrementos. El probador, pagos y bot aparecen como características previas recordadas; no se especifica aquí una nueva tecnología 3D obligatoria. |
| Tres caminos | El audio los enumera: reutilizar y agregar; modificar capas; o rehacer. Son alternativas para incorporar los cambios al sistema, no tres implementaciones exigidas exclusivamente para POS. |
| SaaS y tenants | El audio precisa planes, autoservicio, suscripción y creación automática, verificación de correo, una cuenta con varias tiendas y justificación de la estrategia de aislamiento. Menciona reportes de suscripciones y proyecciones. |
| Offline y sincronización | Ambos exigen web y móvil. El audio menciona PWA, sugiere SQLite, llama a justificar qué funciona sin conexión y plantea un periodo configurable como ejemplo, no una regla fija de siete días. |
| Pruebas de falla | El audio anuncia que forzará conflictos de stock y repetición de guardados con red inestable; también menciona identificadores, idempotencia y rollback. |
| Arquitectura | La transcripción especifica un monolito modular preparado para evolucionar a microservicios. Los microservicios sirven para explicar las dificultades de rollback distribuido; no se desprende obligación de implementarlos ahora. |
| Voz y reportes | El audio requiere entrada por texto o voz, consultas complejas y resultados en pantalla, PDF o Excel. No queda clara la exigencia específica de voz en móvil por un fragmento cortado. |
| Analítica | Confirma modelos supervisados y no supervisados, entrenamiento con datos sintéticos y dashboards. No fija algoritmos ni métricas. |
| Nube | Exige que el sistema y el trabajo del primer parcial estén publicados en un proveedor cloud; el mecanismo concreto de distribución de la APK no se detalla. |
| Pagos | El usuario indicó mantener pagos simulados. El audio pide estudiar cobertura hispanohablante, costos y limitaciones locales, y una simulación fundamentada en el proceso real; no exige textualmente un proveedor o sandbox específico. |
| ICONIX | Confirma ICONIX para este parcial en lugar de Proceso Unificado o Scrum. La lista exacta de artefactos y profundidad debe acordarse según la consigna. |
| Entrega y teoría | La lista inicial no daba fecha. El audio indica PDF en la plataforma el 11 de noviembre a las 08:00 y examen ese día; incluye capítulos teóricos y defensa del porqué de las decisiones. Confirmar año y cambios posteriores con el docente; las notas del proyecto lo sitúan en 2026. |

La comparación trata requisitos, no valida si el nuevo código ya los cumple. La preferencia de pagos simulados expresada por el usuario no debe confundirse con una integración real ya validada.
