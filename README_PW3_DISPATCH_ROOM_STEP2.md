# PW3 Dispatch Room Step 2 Patch

Ajusta la Sala de Despacho para mantener el flujo visual por fases:

1. Paso 1: origen y destino solamente.
2. Paso 2: selección/confirmación de aeronave, horario, simulador y reserva temporal.
3. Tarjeta lateral del piloto con encabezado verde, texto centrado y datos destacados.
4. La reserva temporal sigue siendo UI/preparación; el bloqueo real de 15 minutos queda para endpoint server-side.

No toca ACARS, Neon, db-master ni import-airports.
