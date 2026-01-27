

# Plan: Actualizar Logo del Landing Page

## Objetivo
Reemplazar el logo actual del landing page con la imagen correcta que incluye:
- El texto "gato" en tipografía negra con la "g" estilizada (cola de gato)
- El subtítulo "Servicio a domicilio" debajo

## Cambios a Realizar

### 1. Copiar la imagen correcta al proyecto
- **Archivo fuente**: `user-uploads://WhatsApp_Image_2026-01-27_at_16.45.18_1.jpeg`
- **Destino**: `public/gato-logo.png`
- Esta acción reemplazará el logo incorrecto con el logo correcto que incluye "Servicio a domicilio"

### 2. Ajustar LandingPage.tsx (si es necesario)
- Verificar que las dimensiones del contenedor sean apropiadas para mostrar el logo completo con el subtítulo
- El logo actual ya referencia `/gato-logo.png`, por lo que solo necesitamos reemplazar el archivo

## Resultado Esperado
El landing page mostrará el logo correcto con:
- "gato" en texto negro con la g estilizada
- "Servicio a domicilio" como subtítulo

---

**Nota técnica**: Como el archivo de destino ya existe (`public/gato-logo.png`), simplemente lo reemplazaremos con la imagen correcta.

