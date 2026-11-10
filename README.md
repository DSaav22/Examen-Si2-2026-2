# EnsayAR / Vesta

Sistema académico de comercio de ropa femenina para Sistemas de Información II.

La documentación técnica y el guion para exposición están en:

- [Guía de arquitectura y exposición](docs/GUIA_EXPOSICION_SISTEMA.md)
- [Documentación académica](docs/)

## Ejecución rápida

```powershell
# Terminal 1
cd backend
npm install
npm run start:dev

# Terminal 2
cd frontend
npm install
npm run dev

# Terminal 3 (opcional)
cd movil
npm install
npm run web
```

Antes de iniciar, configurar `backend/.env` usando el ejemplo incluido y sin publicar secretos. Consultar la guía para migraciones, pruebas, roles, endpoints y límites conocidos.
