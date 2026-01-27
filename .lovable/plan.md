

# Plan: Corregir Capitalización del Nombre de Residencia

## Objetivo
Actualizar el nombre "Colinas de montealegre" a "Colinas de Montealegre" en la base de datos.

## Datos Identificados
- **Tabla**: `residencias`
- **ID del registro**: `9b170ff3-9bf5-4c0e-a5e8-fcaee6fd7b4e`
- **Valor actual**: `Colinas de montealegre`
- **Valor corregido**: `Colinas de Montealegre`

## Acción a Ejecutar
Ejecutar la siguiente sentencia SQL para actualizar el nombre:

```sql
UPDATE residencias 
SET name = 'Colinas de Montealegre' 
WHERE id = '9b170ff3-9bf5-4c0e-a5e8-fcaee6fd7b4e';
```

## Resultado Esperado
El nombre del residencial se mostrará correctamente como "Colinas de Montealegre" (con M mayúscula) en el header de ubicación y en cualquier otra parte de la aplicación que utilice este dato.

