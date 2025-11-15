# PROMPT PARA DESARROLLADOR DEL BACKEND

## Objetivo
Mover toda la lógica de negocio del frontend al backend para cumplir con el principio de separación de responsabilidades y tener una única fuente de verdad.

---

## 📥 CAMBIOS EN EL ENDPOINT `/sum_payments`

### Modificación 1: Simplificar el Payload de Entrada

**ANTES (lo que el frontend envía actualmente):**
```json
{
  "date": "2025-11-14",
  "coins": { "50": 0, "100": 0, ... },
  "bills": { "2000": 0, "5000": 4, ... },
  "excedente": 10000,  // ❌ ELIMINAR: El backend debe calcularlo
  "excedente_efectivo": 10000,  // ❌ ELIMINAR: El backend debe calcularlo
  "excedente_datafono": 0,  // ❌ ELIMINAR: El backend debe calcularlo
  "excedente_nequi": 0,  // ❌ ELIMINAR: El backend debe calcularlo
  "excedente_daviplata": 0,  // ❌ ELIMINAR: El backend debe calcularlo
  "excedente_qr": 0,  // ❌ ELIMINAR: El backend debe calcularlo
  "excedentes_detalle": [  // ✅ MANTENER
    { "tipo": "efectivo", "subtipo": null, "valor": 10000 }
  ],
  "gastos_operativos": 0,
  "gastos_operativos_nota": "",
  "prestamos": 0,
  "prestamos_nota": "",
  "metodos_pago": {
    "addi_datafono": 0,
    "nequi_luz_helena": 0,
    "daviplata_jose": 0,
    "qr_julieth": 0,
    "tarjeta_debito": 464000,
    "tarjeta_credito": 0,
    "total_transferencias_registradas": 0,  // ❌ ELIMINAR: El backend debe calcularlo
    "total_datafono_registrado": 464000  // ❌ ELIMINAR: El backend debe calcularlo
  }
}
```

**DESPUÉS (nuevo payload simplificado):**
```json
{
  "date": "2025-11-14",
  "coins": { "50": 0, "100": 0, "200": 2, "500": 0, "1000": 0 },
  "bills": { "2000": 0, "5000": 4, "10000": 7, "20000": 7, "50000": 13, "100000": 1 },
  "excedentes": [
    { "tipo": "efectivo", "subtipo": null, "valor": 10000 },
    { "tipo": "qr_transferencias", "subtipo": "nequi", "valor": 5000 }
  ],
  "gastos_operativos": 0,
  "gastos_operativos_nota": "",
  "prestamos": 0,
  "prestamos_nota": "",
  "metodos_pago": {
    "addi_datafono": 0,
    "nequi_luz_helena": 0,
    "daviplata_jose": 0,
    "qr_julieth": 0,
    "tarjeta_debito": 464000,
    "tarjeta_credito": 0
  }
}
```

### Tarea Backend #1: Calcular Totales de Excedentes

**Implementar en el backend:**
```python
def procesar_excedentes(excedentes_list):
    """
    Recibe una lista de excedentes y retorna los totales por tipo.

    Args:
        excedentes_list: [
            { "tipo": "efectivo", "subtipo": null, "valor": 10000 },
            { "tipo": "qr_transferencias", "subtipo": "nequi", "valor": 5000 }
        ]

    Returns:
        {
            "total_excedente": 15000,
            "excedente_efectivo": 10000,
            "excedente_datafono": 0,
            "excedente_nequi": 5000,
            "excedente_daviplata": 0,
            "excedente_qr": 0,
            "excedentes_detalle": [
                { "tipo": "Efectivo", "valor": 10000 },
                { "tipo": "Transferencia", "subtipo": "Nequi", "valor": 5000 }
            ]
        }
    """
    totales = {
        "total_excedente": 0,
        "excedente_efectivo": 0,
        "excedente_datafono": 0,
        "excedente_nequi": 0,
        "excedente_daviplata": 0,
        "excedente_qr": 0,
        "excedentes_detalle": []
    }

    for exc in excedentes_list:
        valor = int(exc.get("valor", 0))
        if valor > 0:
            totales["total_excedente"] += valor

            if exc["tipo"] == "efectivo":
                totales["excedente_efectivo"] += valor
                totales["excedentes_detalle"].append({
                    "tipo": "Efectivo",
                    "valor": valor
                })
            elif exc["tipo"] == "datafono":
                totales["excedente_datafono"] += valor
                totales["excedentes_detalle"].append({
                    "tipo": "Datafono",
                    "valor": valor
                })
            elif exc["tipo"] == "qr_transferencias":
                subtipo = exc.get("subtipo", "")
                if subtipo == "nequi":
                    totales["excedente_nequi"] += valor
                    totales["excedentes_detalle"].append({
                        "tipo": "Transferencia",
                        "subtipo": "Nequi",
                        "valor": valor
                    })
                elif subtipo == "daviplata":
                    totales["excedente_daviplata"] += valor
                    totales["excedentes_detalle"].append({
                        "tipo": "Transferencia",
                        "subtipo": "Daviplata",
                        "valor": valor
                    })
                elif subtipo == "qr":
                    totales["excedente_qr"] += valor
                    totales["excedentes_detalle"].append({
                        "tipo": "Transferencia",
                        "subtipo": "QR",
                        "valor": valor
                    })

    return totales
```

### Tarea Backend #2: Calcular Totales de Métodos de Pago

**Implementar en el backend:**
```python
def calcular_totales_metodos_pago(metodos_pago):
    """
    Calcula los totales de transferencias y datafono.

    Args:
        metodos_pago: {
            "addi_datafono": 0,
            "nequi_luz_helena": 0,
            "daviplata_jose": 0,
            "qr_julieth": 0,
            "tarjeta_debito": 464000,
            "tarjeta_credito": 0
        }

    Returns:
        {
            **metodos_pago,  # Incluir todos los valores originales
            "total_transferencias_registradas": 0,
            "total_datafono_registrado": 464000
        }
    """
    total_transferencias = (
        int(metodos_pago.get("nequi_luz_helena", 0)) +
        int(metodos_pago.get("daviplata_jose", 0)) +
        int(metodos_pago.get("qr_julieth", 0))
    )

    total_datafono = (
        int(metodos_pago.get("addi_datafono", 0)) +
        int(metodos_pago.get("tarjeta_debito", 0)) +
        int(metodos_pago.get("tarjeta_credito", 0))
    )

    return {
        **metodos_pago,
        "total_transferencias_registradas": total_transferencias,
        "total_datafono_registrado": total_datafono
    }
```

### Tarea Backend #3: Validar el Cierre y Calcular Diferencias

**Implementar en el backend:**
```python
def validar_cierre(datos_alegra, metodos_pago_calculados):
    """
    Valida si el cierre es exitoso comparando Alegra con lo registrado.

    Args:
        datos_alegra: Los datos obtenidos de Alegra
        metodos_pago_calculados: Los totales calculados de métodos de pago

    Returns:
        {
            "cierre_validado": True/False,
            "validation_status": "success" | "warning" | "error",
            "diferencias": {
                "transferencias": {
                    "alegra": 852500,
                    "registrado": 0,
                    "diferencia": 852500,
                    "diferencia_formatted": "$852.500",
                    "es_significativa": True  # Si es > 100
                },
                "datafono": {
                    "alegra": 464000,
                    "registrado": 464000,
                    "diferencia": 0,
                    "diferencia_formatted": "$0",
                    "es_significativa": False
                }
            },
            "mensaje_validacion": "Diferencias significativas detectadas en transferencias"
        }
    """
    transferencia_alegra = datos_alegra.get("results", {}).get("transfer", {}).get("total", 0)

    datafono_alegra = (
        datos_alegra.get("results", {}).get("debit-card", {}).get("total", 0) +
        datos_alegra.get("results", {}).get("credit-card", {}).get("total", 0)
    )

    transferencias_registradas = metodos_pago_calculados.get("total_transferencias_registradas", 0)
    datafono_registrado = metodos_pago_calculados.get("total_datafono_registrado", 0)

    diff_transferencia = abs(transferencia_alegra - transferencias_registradas)
    diff_datafono = abs(datafono_alegra - datafono_registrado)

    # Validación: se considera exitoso si ambas diferencias son < 100
    cierre_validado = diff_transferencia < 100 and diff_datafono < 100

    validation_status = "success" if cierre_validado else "warning"

    diferencias = {
        "transferencias": {
            "alegra": transferencia_alegra,
            "registrado": transferencias_registradas,
            "diferencia": diff_transferencia,
            "diferencia_formatted": f"${diff_transferencia:,}",
            "es_significativa": diff_transferencia >= 100
        },
        "datafono": {
            "alegra": datafono_alegra,
            "registrado": datafono_registrado,
            "diferencia": diff_datafono,
            "diferencia_formatted": f"${diff_datafono:,}",
            "es_significativa": diff_datafono >= 100
        }
    }

    # Mensaje descriptivo
    mensajes = []
    if diferencias["transferencias"]["es_significativa"]:
        mensajes.append(f"Diferencia en transferencias: {diferencias['transferencias']['diferencia_formatted']}")
    if diferencias["datafono"]["es_significativa"]:
        mensajes.append(f"Diferencia en datafono: {diferencias['datafono']['diferencia_formatted']}")

    mensaje_validacion = " | ".join(mensajes) if mensajes else "Cierre validado correctamente"

    return {
        "cierre_validado": cierre_validado,
        "validation_status": validation_status,
        "diferencias": diferencias,
        "mensaje_validacion": mensaje_validacion
    }
```

### Tarea Backend #4: Incluir Notas en la Respuesta

**Modificar la respuesta para incluir:**
```python
def preparar_respuesta_completa(datos_procesados, payload_original):
    """
    Prepara la respuesta final incluyendo todos los datos necesarios.
    """
    respuesta = {
        **datos_procesados,  # Todos los datos ya procesados

        # Agregar las notas que el frontend envió
        "gastos_operativos_nota": payload_original.get("gastos_operativos_nota", ""),
        "prestamos_nota": payload_original.get("prestamos_nota", ""),

        # Agregar los métodos de pago con sus totales calculados
        "metodos_pago_registrados": metodos_pago_calculados,

        # Agregar los excedentes procesados
        "excedentes_detalle": excedentes_procesados["excedentes_detalle"],

        # Agregar validación del cierre
        **validacion_cierre
    }

    return respuesta
```

---

## 📤 ESTRUCTURA COMPLETA DE LA RESPUESTA ESPERADA

El backend debe devolver esta estructura completa:

```json
{
  "alegra": {
    "date_requested": "2025-11-14",
    "results": {
      "cash": { "formatted": "$520.300", "label": "Efectivo", "total": 520300 },
      "credit-card": { "formatted": "$0", "label": "Tarjeta crédito", "total": 0 },
      "debit-card": { "formatted": "$464.000", "label": "Tarjeta débito", "total": 464000 },
      "transfer": { "formatted": "$852.500", "label": "Transferencia", "total": 852500 }
    },
    "total_sale": { "formatted": "$1.836.800", "label": "TOTAL VENTA DEL DÍA", "total": 1836800 },
    "username_used": "koaj.puertocarreno@gmail.com"
  },

  "cash_count": {
    "adjustments": {
      "excedente": 10000,
      "excedente_formatted": "$10.000",
      "excedente_efectivo": 10000,
      "excedente_datafono": 0,
      "excedente_nequi": 0,
      "excedente_daviplata": 0,
      "excedente_qr": 0,
      "gastos_operativos": 0,
      "gastos_operativos_formatted": "$0",
      "prestamos": 0,
      "prestamos_formatted": "$0",
      "venta_efectivo_diaria_alegra": 520400,
      "venta_efectivo_diaria_alegra_formatted": "$520.400"
    },

    "base": {
      "base_billetes": { "2000": 0, "5000": 4, "10000": 7, "20000": 3, "50000": 6, "100000": 0 },
      "base_monedas": { "50": 0, "100": 0, "200": 0, "500": 0, "1000": 0 },
      "base_status": "sobrante",
      "diferencia_base": 530400,
      "diferencia_base_formatted": "$530.400",
      "exact_base_obtained": true,
      "mensaje_base": "Sobra $530.400 por encima de la base de $450.000",
      "total_base": 450000,
      "total_base_billetes": 450000,
      "total_base_formatted": "$450.000",
      "total_base_monedas": 0
    },

    "consignar": {
      "consignar_billetes": { "2000": 0, "5000": 0, "10000": 0, "20000": 4, "50000": 7, "100000": 1 },
      "consignar_monedas": { "50": 0, "100": 0, "200": 2, "500": 0, "1000": 0 },
      "efectivo_para_consignar_final": 530400,
      "efectivo_para_consignar_final_formatted": "$530.400",
      "total_consignar_sin_ajustes": 530400,
      "total_consignar_sin_ajustes_formatted": "$530.400"
    },

    "input_bills": { "2000": 0, "5000": 4, "10000": 7, "20000": 7, "50000": 13, "100000": 1 },
    "input_coins": { "50": 0, "100": 0, "200": 2, "500": 0, "1000": 0 },

    "totals": {
      "total_billetes": 980000,
      "total_general": 980400,
      "total_general_formatted": "$980.400",
      "total_monedas": 400
    }
  },

  // ✅ NUEVOS CAMPOS QUE EL BACKEND DEBE AGREGAR:

  "excedentes_detalle": [
    { "tipo": "Efectivo", "valor": 10000 }
  ],

  "gastos_operativos_nota": "",
  "prestamos_nota": "",

  "metodos_pago_registrados": {
    "addi_datafono": 0,
    "nequi_luz_helena": 0,
    "daviplata_jose": 0,
    "qr_julieth": 0,
    "tarjeta_debito": 464000,
    "tarjeta_credito": 0,
    "total_transferencias_registradas": 0,
    "total_datafono_registrado": 464000
  },

  "validation": {
    "cierre_validado": false,
    "validation_status": "warning",
    "diferencias": {
      "transferencias": {
        "alegra": 852500,
        "registrado": 0,
        "diferencia": 852500,
        "diferencia_formatted": "$852.500",
        "es_significativa": true
      },
      "datafono": {
        "alegra": 464000,
        "registrado": 464000,
        "diferencia": 0,
        "diferencia_formatted": "$0",
        "es_significativa": false
      }
    },
    "mensaje_validacion": "Diferencia en transferencias: $852.500"
  },

  "date_requested": "2025-11-14",
  "request_date": "2025-11-14",
  "request_datetime": "2025-11-14T21:51:36.035958-05:00",
  "request_time": "21:51:36",
  "request_tz": "America/Bogota",
  "username_used": "koaj.puertocarreno@gmail.com"
}
```

---

## 🔄 FLUJO COMPLETO EN EL BACKEND

```python
@app.route('/sum_payments', methods=['POST'])
def sum_payments():
    # 1. Recibir payload simplificado
    payload = request.get_json()

    # 2. Procesar excedentes
    excedentes_procesados = procesar_excedentes(payload.get("excedentes", []))

    # 3. Calcular totales de métodos de pago
    metodos_pago_calculados = calcular_totales_metodos_pago(payload.get("metodos_pago", {}))

    # 4. Obtener datos de Alegra (ya implementado)
    datos_alegra = obtener_datos_alegra(payload["date"])

    # 5. Realizar cálculos de caja (ya implementado)
    cash_count = calcular_cash_count(payload, excedentes_procesados, datos_alegra)

    # 6. Validar el cierre
    validacion = validar_cierre(datos_alegra, metodos_pago_calculados)

    # 7. Preparar respuesta completa
    respuesta = {
        "alegra": datos_alegra,
        "cash_count": cash_count,
        "excedentes_detalle": excedentes_procesados["excedentes_detalle"],
        "gastos_operativos_nota": payload.get("gastos_operativos_nota", ""),
        "prestamos_nota": payload.get("prestamos_nota", ""),
        "metodos_pago_registrados": metodos_pago_calculados,
        "validation": validacion,
        "date_requested": payload["date"],
        "request_date": obtener_fecha_actual(),
        "request_datetime": obtener_datetime_actual(),
        "request_time": obtener_hora_actual(),
        "request_tz": "America/Bogota",
        "username_used": obtener_usuario_actual()
    }

    return jsonify(respuesta), 200
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Modificar endpoint `/sum_payments` para recibir payload simplificado
- [ ] Implementar función `procesar_excedentes()`
- [ ] Implementar función `calcular_totales_metodos_pago()`
- [ ] Implementar función `validar_cierre()`
- [ ] Implementar función `preparar_respuesta_completa()`
- [ ] Agregar campos nuevos a la respuesta: `excedentes_detalle`, `gastos_operativos_nota`, `prestamos_nota`, `metodos_pago_registrados`, `validation`
- [ ] Probar con datos de ejemplo
- [ ] Actualizar documentación de la API

---

## 🧪 EJEMPLO DE PRUEBA

**Request:**
```bash
POST /sum_payments
Content-Type: application/json

{
  "date": "2025-11-14",
  "coins": { "50": 0, "100": 0, "200": 2, "500": 0, "1000": 0 },
  "bills": { "2000": 0, "5000": 4, "10000": 7, "20000": 7, "50000": 13, "100000": 1 },
  "excedentes": [
    { "tipo": "efectivo", "subtipo": null, "valor": 10000 }
  ],
  "gastos_operativos": 0,
  "gastos_operativos_nota": "",
  "prestamos": 0,
  "prestamos_nota": "",
  "metodos_pago": {
    "addi_datafono": 0,
    "nequi_luz_helena": 0,
    "daviplata_jose": 0,
    "qr_julieth": 0,
    "tarjeta_debito": 464000,
    "tarjeta_credito": 0
  }
}
```

**Expected Response:** (Ver estructura completa arriba)

---

## 📞 CONTACTO

Si tienes dudas sobre estas especificaciones, por favor contáctame antes de implementar.
