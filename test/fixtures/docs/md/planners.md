# Planners API

API de exemplo para gerenciamento de planejamentos.

## Recursos

- Listar planejamentos.
- Criar planejamentos vinculados a calendários.
- Consultar um planejamento pelo identificador.
- Atualizar título, data de entrega e status.
- Remover planejamentos concluídos ou cancelados.

## Endpoints

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/planners` | Lista planejamentos. |
| `POST` | `/planners` | Cria um planejamento. |
| `GET` | `/planners/{id}` | Consulta um planejamento por ID. |
| `PUT` | `/planners/{id}` | Atualiza um planejamento por ID. |
| `DELETE` | `/planners/{id}` | Remove um planejamento por ID. |

## Exemplo de payload

```json
{
  "title": "Sprint planning",
  "calendarId": "4c0ee90a-75d7-4a19-a4ef-f4bdde9f0001",
  "dueDate": "2026-05-30",
  "status": "active"
}
```
